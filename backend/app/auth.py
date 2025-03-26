# app/auth.py
from datetime import datetime, timedelta
from typing import Optional
import os
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .utils import verify_password

# Configurazione JWT
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not SECRET_KEY:
    # Genera una chiave in memoria se non è definita nelle variabili d'ambiente
    # Nota: la chiave verrà rigenerata ad ogni riavvio dell'applicazione
    SECRET_KEY = secrets.token_hex(32)
    print("WARNING: JWT_SECRET_KEY not set in environment. Using temporary key.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea un token JWT con i dati forniti."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_professor(db: Session, username: str, password: str):
    """Autentica un professore per username e password."""
    professor = db.query(models.Professor).filter(models.Professor.username == username).first()
    if not professor:
        return False
    if not verify_password(password, professor.password):
        return False
    return professor

async def get_current_professor(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Ottiene il professore corrente dal token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenziali non valide",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    professor = db.query(models.Professor).filter(models.Professor.username == username).first()
    if professor is None:
        raise credentials_exception
    
    return professor

async def get_current_admin(current_user: models.Professor = Depends(get_current_professor)):
    """Verifica che il professore corrente sia un amministratore."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Privilegi di amministratore richiesti"
        )
    return current_user