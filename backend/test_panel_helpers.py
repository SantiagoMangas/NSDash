"""Tests catálogo, migración sport legacy y filtros de equipo."""

from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.catalog_seed import seed_sports_catalog
from app.models import Athlete, Sport, Team, User
from app.panel_helpers import (
    LAST_SPORT_LEGACY_MIGRATION,
    coach_athletes_query,
    migrate_legacy_sport_to_sport_id,
    normalize_catalog_name,
    serialize_athlete,
)


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:")
    from app.db import Base

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    session.add(User(id=1, email="c@test.com", password_hash="x", is_admin=True))
    session.commit()
    yield session
    session.close()


class TestNormalizeCatalogName:
    def test_case_and_accent_insensitive(self):
        assert normalize_catalog_name("  HÓCKEY ") == normalize_catalog_name("hockey")


class TestSportLegacyMigration:
    def test_matches_hockey_and_leaves_futbol_unmigrated(self, db_session):
        seed_sports_catalog(db_session)
        db_session.add(
            Athlete(
                id=1,
                name="A",
                coach_id=1,
                sport="Hockey",
            )
        )
        db_session.add(
            Athlete(
                id=2,
                name="B",
                coach_id=1,
                sport="Fútbol",
            )
        )
        db_session.commit()

        migrate_legacy_sport_to_sport_id(db_session)

        a = db_session.get(Athlete, 1)
        b = db_session.get(Athlete, 2)
        hockey = db_session.query(Sport).filter(Sport.name == "Hockey").one()

        assert a.sport_id == hockey.id
        assert a.sport == "Hockey"
        assert b.sport_id is None
        assert b.sport == "Fútbol"
        assert LAST_SPORT_LEGACY_MIGRATION["matched"] == 1
        assert LAST_SPORT_LEGACY_MIGRATION["unmigrated"] == 1


class TestTeamFilter:
    def test_coach_athletes_query_by_team(self, db_session):
        db_session.add(Team(id=10, coach_id=1, name="Plantel"))
        db_session.add(Athlete(id=1, name="In team", coach_id=1, team_id=10))
        db_session.add(Athlete(id=2, name="No team", coach_id=1, team_id=None))
        db_session.commit()

        all_rows = coach_athletes_query(db_session, 1, None).all()
        team_rows = coach_athletes_query(db_session, 1, 10).all()

        assert len(all_rows) == 2
        assert len(team_rows) == 1
        assert team_rows[0].name == "In team"


class TestSerializeAthlete:
    def test_age_from_birth_date(self, db_session):
        athlete = Athlete(
            id=1,
            name="Kid",
            coach_id=1,
            birth_date=date(2010, 1, 1),
        )
        db_session.add(athlete)
        db_session.commit()

        payload = serialize_athlete(athlete, db_session)
        assert payload.age is not None
        assert payload.age >= 15
