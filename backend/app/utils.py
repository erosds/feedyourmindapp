# app/utils.py
import bcrypt
from datetime import date, time
from sqlalchemy.orm import Session
from sqlalchemy import func


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
    from . import models
    
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

def determine_payment_date(is_paid, explicit_payment_date=None, reference_date=None):
    """Determina la data di pagamento in base ai parametri forniti."""
    if not is_paid:
        return None
    
    if explicit_payment_date:
        return explicit_payment_date
    
    if reference_date:
        return reference_date
    
    return date.today()

def parse_time_string(time_str):
    """Converte una stringa nel formato HH:MM o HH:MM:SS in un oggetto time."""
    if not time_str:
        return None
        
    try:
        # Gestisci sia formato HH:MM che HH:MM:SS
        time_parts = time_str.split(':')
        hours = int(time_parts[0])
        minutes = int(time_parts[1])
        seconds = 0
        if len(time_parts) > 2:
            seconds = int(time_parts[2])
        return time(hour=hours, minute=minutes, second=seconds)
    except (ValueError, IndexError):
        return None
    
# Aggiungi queste funzioni in utils.py

# app/utils.py (aggiunta alla fine del file)

def update_package_payment_status(db: Session, package_id: int):
    """
    Aggiorna lo stato di pagamento di un pacchetto in base ai suoi acconti.
    Imposta is_paid e payment_date in base alla somma degli acconti.
    """
    from app import models
    from decimal import Decimal
    
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        return
    
    # Calcola la somma di tutti gli acconti
    payments = db.query(models.PackagePayment).filter(
        models.PackagePayment.package_id == package_id
    ).all()
    
    total_paid = sum(Decimal(str(payment.amount)) for payment in payments)
    package_cost = Decimal(str(package.package_cost))
    
    # Aggiorna is_paid in base alla somma degli acconti
    package.is_paid = total_paid >= package_cost
    
    # Se ci sono pagamenti, imposta payment_date all'ultima data di pagamento
    if payments:
        # Ordina i pagamenti per data, prendi l'ultimo
        latest_payment = sorted(payments, key=lambda p: p.payment_date)[-1]
        package.payment_date = latest_payment.payment_date
    else:
        package.payment_date = None
    
    db.commit()