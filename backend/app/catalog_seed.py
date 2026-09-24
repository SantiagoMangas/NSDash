"""Catálogo global de deportes y posiciones (seed idempotente)."""

from sqlalchemy.orm import Session

from .models import Position, Sport

# Deportes y posiciones solicitados para el panel (catálogo global compartido).
CATALOG: dict[str, list[str]] = {
    "Hockey": ["Arquera", "Defensa", "Medio", "Delantera"],
    "Atletismo": [
        "Velocista",
        "Mediofondista",
        "Fondista",
        "Saltador",
        "Lanzador",
        "Marchador",
    ],
    "Lucha": ["Estilo libre", "Grecorromana"],
    "Boxeo/Karate": ["Por categoría"],
    "Natación": ["Libre", "Espalda", "Pecho", "Mariposa", "Combinado"],
}


def seed_sports_catalog(db: Session) -> None:
    """Inserta deportes/posiciones iniciales si no existen (por nombre)."""
    changed = False
    for sport_name, position_names in CATALOG.items():
        sport = db.query(Sport).filter(Sport.name == sport_name).first()
        if sport is None:
            sport = Sport(name=sport_name)
            db.add(sport)
            db.flush()
            changed = True

        for position_name in position_names:
            exists = (
                db.query(Position)
                .filter(
                    Position.sport_id == sport.id,
                    Position.name == position_name,
                )
                .first()
            )
            if exists is None:
                db.add(Position(sport_id=sport.id, name=position_name))
                changed = True

    if changed:
        db.commit()
