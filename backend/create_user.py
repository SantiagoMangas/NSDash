#!/usr/bin/env python3
"""
Standalone script to create a user in the database.
Usage: python create_user.py
"""

from app.db import Base, SessionLocal, engine
from app.models import User
from app.auth import hash_password

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Create a database session
db = SessionLocal()

try:
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == "admin@ns.com").first()
    if existing_user:
        print("User already exists")
    else:
        # Create new user
        new_user = User(
            email="admin@ns.com",
            password_hash=hash_password("1234"),
            is_admin=True,
        )
        db.add(new_user)
        db.commit()
        print("User created successfully")
finally:
    db.close()
