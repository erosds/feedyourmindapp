# app/utils.py
import bcrypt
import models
from sqlalchemy.orm import Session

def get_password_hash(password: str) -> str:
    """Genera un hash della password."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica che una password corrisponda all'hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def recalculate_package_hours(package_id: int, db: Session):
    """Ricalcola le ore rimanenti di un pacchetto basandosi sulle lezioni esistenti."""
    # Importa func da sqlalchemy
    from sqlalchemy import func
    
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        return
    
    # Calcola le ore totali usate nelle lezioni di questo pacchetto
    total_used_hours = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or 0
    
    # Aggiorna le ore rimanenti
    package.remaining_hours = package.total_hours - total_used_hours
    
    # Aggiorna lo stato del pacchetto
    if package.remaining_hours <= 0:
        package.status = "completed"
    else:
        package.status = "in_progress"
    
    db.commit()