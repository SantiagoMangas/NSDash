"""Perfil del usuario y gestión de preparadores (admin)."""



from __future__ import annotations



import secrets

import string



from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session



from . import auth, models, schemas

from .access import ROLE_COACH, athletes_query

from .db import get_db



router = APIRouter(tags=["users"])





def serialize_user_me(user: models.User) -> schemas.UserMeResponse:

    return schemas.UserMeResponse(

        id=user.id,

        email=user.email,

        role=user.role,

        name=user.name,

        photo_url=user.photo_url,

        bio=user.bio,

        phone=user.phone,

        must_change_password=user.must_change_password,

    )





def _get_coach(db: Session, coach_id: int) -> models.User:

    coach = db.query(models.User).filter(models.User.id == coach_id).first()

    if coach is None or coach.role != ROLE_COACH:

        raise HTTPException(status_code=404, detail="Preparador no encontrado")

    return coach





def _coach_summary(db: Session, coach: models.User) -> schemas.CoachSummary:

    count = athletes_query(db, coach).count()

    return schemas.CoachSummary(

        id=coach.id,

        email=coach.email,

        name=coach.name,

        bio=coach.bio,

        phone=coach.phone,

        photo_url=coach.photo_url,

        is_active=coach.is_active,

        must_change_password=coach.must_change_password,

        athlete_count=count,

    )





def _ensure_email_available(db: Session, email: str, exclude_user_id: int | None = None) -> None:

    query = db.query(models.User).filter(models.User.email == email)

    if exclude_user_id is not None:

        query = query.filter(models.User.id != exclude_user_id)

    if query.first() is not None:

        raise HTTPException(status_code=409, detail="El email ya está registrado")





def _generate_temporary_password() -> str:

    alphabet = string.ascii_letters + string.digits

    while True:

        candidate = "".join(secrets.choice(alphabet) for _ in range(12))

        if len(candidate) >= auth.MIN_PASSWORD_LENGTH:

            return candidate





@router.get("/auth/me", response_model=schemas.UserMeResponse)

def get_me(user: models.User = Depends(auth.get_current_user)) -> schemas.UserMeResponse:

    return serialize_user_me(user)





@router.patch("/users/me", response_model=schemas.UserMeResponse)

def update_me(

    payload: schemas.UserProfileUpdate,

    db: Session = Depends(get_db),

    user: models.User = Depends(auth.get_current_user),

) -> schemas.UserMeResponse:

    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():

        setattr(user, field, value)

    db.commit()

    db.refresh(user)

    return serialize_user_me(user)





@router.post("/users/me/change-password")

def change_password(

    payload: schemas.ChangePasswordRequest,

    db: Session = Depends(get_db),

    user: models.User = Depends(auth.get_current_user),

) -> dict[str, str]:

    if not auth.verify_password(payload.current_password, user.password_hash):

        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")

    auth.validate_password_strength(payload.new_password)

    user.password_hash = auth.hash_password(payload.new_password)

    user.must_change_password = False

    auth.invalidate_user_sessions(user)

    db.commit()

    return {"detail": "Contraseña actualizada"}





@router.get("/admin/coaches", response_model=list[schemas.CoachSummary])

def list_coaches(

    db: Session = Depends(get_db),

    _: models.User = Depends(auth.require_admin),

) -> list[schemas.CoachSummary]:

    coaches = (

        db.query(models.User)

        .filter(models.User.role == ROLE_COACH)

        .order_by(models.User.name.asc(), models.User.email.asc())

        .all()

    )

    return [_coach_summary(db, coach) for coach in coaches]





@router.post("/admin/coaches", response_model=schemas.CoachCreateResponse, status_code=201)

def create_coach(

    payload: schemas.CoachCreate,

    db: Session = Depends(get_db),

    _: models.User = Depends(auth.require_admin),

) -> schemas.CoachCreateResponse:

    auth.validate_password_strength(payload.password)

    plain_password = payload.password

    email = payload.email.strip().lower()

    _ensure_email_available(db, email)

    coach = models.User(

        email=email,

        password_hash=auth.hash_password(plain_password),

        role=ROLE_COACH,

        name=payload.name.strip(),

        bio=payload.bio,

        is_admin=False,

        is_active=True,

        must_change_password=True,

        auth_token_version=0,

    )

    db.add(coach)

    db.commit()

    db.refresh(coach)

    summary = _coach_summary(db, coach)

    return schemas.CoachCreateResponse(

        **summary.model_dump(),

        temporary_password=plain_password,

    )





@router.patch("/admin/coaches/{coach_id}", response_model=schemas.CoachSummary)

def update_coach(

    coach_id: int,

    payload: schemas.CoachAdminUpdate,

    db: Session = Depends(get_db),

    _: models.User = Depends(auth.require_admin),

) -> schemas.CoachSummary:

    coach = _get_coach(db, coach_id)

    data = payload.model_dump(exclude_unset=True)



    if "email" in data and data["email"] is not None:

        email = data["email"].strip().lower()

        _ensure_email_available(db, email, exclude_user_id=coach.id)

        coach.email = email



    if "name" in data and data["name"] is not None:

        coach.name = data["name"].strip()



    for field in ("photo_url", "bio", "phone"):

        if field in data:

            setattr(coach, field, data[field])



    if "is_active" in data and data["is_active"] is not None:

        coach.is_active = bool(data["is_active"])



    db.commit()

    db.refresh(coach)

    return _coach_summary(db, coach)





@router.post("/admin/coaches/{coach_id}/reset-password", response_model=schemas.CoachResetPasswordResponse)

def reset_coach_password(

    coach_id: int,

    db: Session = Depends(get_db),

    _: models.User = Depends(auth.require_admin),

) -> schemas.CoachResetPasswordResponse:

    coach = _get_coach(db, coach_id)

    temporary_password = _generate_temporary_password()

    coach.password_hash = auth.hash_password(temporary_password)

    coach.must_change_password = True

    auth.invalidate_user_sessions(coach)

    db.commit()

    return schemas.CoachResetPasswordResponse(temporary_password=temporary_password)


