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

# Genera una chiave segreta sicura se non definita
def generate_secret_key():
    """
    Genera una chiave segreta cryptograficamente sicura.
    Salvata in un file per mantenere la persistenza tra i riavvii.
    """
    secret_key_path = os.path.join(os.path.dirname(__file__), '.jwt_secret_key')
    
    # Prova a leggere una chiave esistente
    if os.path.exists(secret_key_path):
        with open(secret_key_path, 'r') as f:
            return f.read().strip()
    
    # Genera una nuova chiave segreta
    new_secret_key = secrets.token_hex(32)  # 256 bit
    
    # Salva la chiave in modo che sia persistente
    try:
        with open(secret_key_path, 'w') as f:
            f.write(new_secret_key)
        
        # Imposta permessi ristretti per il file
        os.chmod(secret_key_path, 0o600)  # Solo il proprietario può leggere/scrivere
    except Exception as e:
        print(f"Errore durante il salvataggio della chiave segreta: {e}")
    
    return new_secret_key

# Configurazione JWT
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", generate_secret_key())
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