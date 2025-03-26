# routes/packages.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/packages",
    tags=["packages"],
    responses={404: {"description": "Not found"}},
)

# Aggiungere questa funzione all'inizio del file packages.py, dopo le importazioni

from decimal import Decimal
from sqlalchemy import func

def update_package_remaining_hours(db: Session, package_id: int, commit: bool = True):
    """
    Calcola e aggiorna le ore rimanenti o accumulate di un pacchetto in base alle lezioni associate.
    Gestisce diversamente i pacchetti fissi e aperti.
    """
    # Recupera il pacchetto
    package = db.query(models.Package).filter(models.Package.id == package_id).with_for_update().first()
    if not package:
        return None
    
    # Calcola le ore utilizzate nelle lezioni
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Gestione differenziata in base al tipo di pacchetto
    if package.package_type == "fixed":
        # Per pacchetti fissi, le ore rimanenti sono la differenza tra ore totali e ore utilizzate
        package.remaining_hours = package.total_hours - hours_used
        
        # Aggiorna lo stato del pacchetto in base alle ore rimanenti
        if package.remaining_hours <= 0:
            package.status = "completed"
        else:
            package.status = "in_progress"
    else:
        # Per pacchetti aperti, le ore accumulate sono uguali alle ore utilizzate
        package.remaining_hours = hours_used
        package.total_hours = hours_used
        
        # Un pacchetto aperto è sempre "in_progress" a meno che non sia esplicitamente completato
        if package.status != "completed":
            package.status = "in_progress"
    
    # Commit se richiesto
    if commit:
        db.commit()
        db.refresh(package)
    
    return package

from datetime import date, timedelta

def calculate_expiry_date(start_date: date) -> date:
    """
    Calcola la data di scadenza per un pacchetto a durata fissa (4 settimane).
    La scadenza cade il lunedì della quarta settimana dopo la data di inizio.
    
    Args:
        start_date: Data di inizio del pacchetto
        
    Returns:
        Data di scadenza
    """
    # Determina il giorno della settimana (0 = lunedì, 6 = domenica)
    weekday = start_date.weekday()
    
    # Trova il lunedì della settimana corrente
    monday = start_date - timedelta(days=weekday)
    
    # Aggiungi 4 settimane (28 giorni)
    expiry_date = monday + timedelta(days=28)
    
    return expiry_date

# Modifiche alla route di creazione
# Modifiche alla route di creazione
@router.post("/", response_model=models.PackageResponse, status_code=status.HTTP_201_CREATED)
def create_package(package: models.PackageCreate, db: Session = Depends(get_db)):
    # Controlla se lo studente esiste
    student = db.query(models.Student).filter(models.Student.id == package.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verifica se ci sono altri pacchetti attivi per lo studente
    active_package = db.query(models.Package).filter(
        models.Package.student_id == package.student_id,
        models.Package.status == "in_progress"
    ).first()
    
    if active_package:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Lo studente ha già un pacchetto attivo",
                "active_package_id": active_package.id,
                "active_package_remaining_hours": float(active_package.remaining_hours)
            }
        )
    
    # Determina la data di pagamento
    payment_date = package.payment_date or (package.start_date if package.is_paid else None)
    
    # Gestione differenziata per pacchetti fissi e aperti
    if package.package_type == "fixed":
        # Pacchetto fisso: i valori devono essere definiti
        total_hours = package.total_hours if package.total_hours > 0 else Decimal('1.0')  # Default a 1 ora
        package_cost = package.package_cost if package.package_cost >= 0 else Decimal('0')
        remaining_hours = total_hours  # Le ore rimanenti sono inizialmente uguali alle ore totali
    else:
        # Pacchetto aperto: le ore accumulate partono da zero
        # Forza i valori a zero per pacchetti aperti non pagati
        if not package.is_paid:
            total_hours = Decimal('0')
            package_cost = Decimal('0')
            remaining_hours = Decimal('0')
        else:
            # Se pagato, usa i valori forniti o default a zero
            total_hours = package.total_hours if package.total_hours > 0 else Decimal('0')
            package_cost = package.package_cost if package.package_cost >= 0 else Decimal('0')
            remaining_hours = total_hours
    
    # Calcola la data di scadenza per pacchetti a durata fissa
    expiry_date = None
    if package.package_type == "fixed":
        expiry_date = calculate_expiry_date(package.start_date)
    
    # Crea un nuovo pacchetto
    db_package = models.Package(
        student_id=package.student_id,
        start_date=package.start_date,
        total_hours=total_hours,
        package_cost=package_cost,
        status="in_progress",
        is_paid=package.is_paid,
        payment_date=payment_date,
        remaining_hours=remaining_hours,
        package_type=package.package_type,
        expiry_date=expiry_date
    )
    
    # Salva nel database
    db.add(db_package)
    db.commit()
    db.refresh(db_package)
    return db_package

@router.get("/", response_model=List[models.PackageResponse])
def read_packages(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    packages = db.query(models.Package).offset(skip).limit(limit).all()
    return packages

@router.get("/{package_id}", response_model=models.PackageResponse)
def read_package(package_id: int, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    return db_package

@router.get("/student/{student_id}", response_model=List[models.PackageResponse])
def read_student_packages(student_id: int, db: Session = Depends(get_db)):
    # Controlla se lo studente esiste
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Ottieni tutti i pacchetti dello studente
    packages = db.query(models.Package).filter(models.Package.student_id == student_id).all()
    return packages

@router.get("/student/{student_id}/active", response_model=models.PackageResponse)
def read_student_active_package(student_id: int, db: Session = Depends(get_db)):
    # Controlla se lo studente esiste
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Ottieni il pacchetto attivo dello studente
    active_package = db.query(models.Package).filter(
        models.Package.student_id == student_id,
        models.Package.status == "in_progress"
    ).first()
    
    if not active_package:
        raise HTTPException(status_code=404, detail="No active package found for this student")
    
    return active_package

@router.put("/{package_id}", response_model=models.PackageResponse)
def update_package(package_id: int, package: models.PackageUpdate, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Calcola le ore già utilizzate in questo pacchetto
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Gestisce il cambio di tipo di pacchetto
    type_changed = "package_type" in package.dict(exclude_unset=True) and package.package_type != db_package.package_type
    
    # Se stiamo cambiando da fisso ad aperto
    if type_changed and package.package_type == "open":
        # Per pacchetti aperti, le ore totali sono le ore utilizzate
        update_data = package.dict(exclude_unset=True)
        update_data["total_hours"] = hours_used
        update_data["remaining_hours"] = hours_used
        update_data["expiry_date"] = None
        update_data["is_paid"] = False  # Reset dello stato di pagamento
        
        for key, value in update_data.items():
            setattr(db_package, key, value)
    
    # Se stiamo cambiando da aperto a fisso
    elif type_changed and package.package_type == "fixed":
        # Per pacchetti fissi, verifica che total_hours sia definito e sufficiente
        if "total_hours" not in package.dict(exclude_unset=True) or package.total_hours < hours_used:
            # Se non specificato, usa le ore accumulate come ore totali
            update_data = package.dict(exclude_unset=True)
            update_data["total_hours"] = max(hours_used, Decimal('1.0'))  # Almeno 1 ora
            update_data["remaining_hours"] = update_data["total_hours"] - hours_used
            update_data["expiry_date"] = calculate_expiry_date(db_package.start_date)
            
            for key, value in update_data.items():
                setattr(db_package, key, value)
        else:
            # Aggiorna le ore rimanenti in base alle nuove ore totali
            update_data = package.dict(exclude_unset=True)
            update_data["remaining_hours"] = package.total_hours - hours_used
            update_data["expiry_date"] = calculate_expiry_date(db_package.start_date)
            
            for key, value in update_data.items():
                setattr(db_package, key, value)
    
    # Gestione dello stato di pagamento
    if "is_paid" in package.dict(exclude_unset=True) and package.is_paid and not db_package.is_paid:
        # Se passa da non pagato a pagato
        if "payment_date" not in package.dict(exclude_unset=True) or package.payment_date is None:
            db_package.payment_date = date.today()
        
        # Per pacchetti aperti che vengono pagati, verifica che ci siano ore ed un costo
        if db_package.package_type == "open" and (db_package.total_hours == 0 or db_package.package_cost == 0):
            if "total_hours" not in package.dict(exclude_unset=True) or not package.total_hours:
                db_package.total_hours = hours_used or Decimal('1.0')  # Default a 1 ora se non ci sono lezioni
                
            if "package_cost" not in package.dict(exclude_unset=True) or not package.package_cost:
                # Se non è specificato un costo, calcola un costo basato sulle ore
                default_hourly_rate = Decimal('20.0')
                db_package.package_cost = db_package.total_hours * default_hourly_rate
    
    # Aggiorna i campi rimanenti
    update_data = package.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key not in ["remaining_hours", "total_hours", "package_type", "expiry_date"] or not type_changed:
            setattr(db_package, key, value)
    
    # Se total_hours è stato aggiornato, verifica che sia sufficiente per le ore già utilizzate
    if "total_hours" in package.dict(exclude_unset=True) and db_package.package_type == "fixed":
        if package.total_hours < hours_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le ore totali non possono essere inferiori alle ore già utilizzate ({hours_used})"
            )
    
    # Commit e aggiornamento ore rimanenti
    db.commit()
    update_package_remaining_hours(db, package_id)
    
    # Refresh per ottenere tutti i campi aggiornati
    db.refresh(db_package)
    return db_package

@router.delete("/{package_id}", response_model=dict)
def delete_package(package_id: int, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Trova tutte le lezioni associate a questo pacchetto
    related_lessons = db.query(models.Lesson).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).all()
    
    # Salva le informazioni sulle lezioni da eliminare
    lessons_info = [
        {
            "id": lesson.id, 
            "date": lesson.lesson_date, 
            "student_id": lesson.student_id,
            "professor_id": lesson.professor_id,
            "duration": float(lesson.duration)
        } 
        for lesson in related_lessons
    ]
    
    # Elimina le lezioni associate
    for lesson in related_lessons:
        db.delete(lesson)
    
    # Elimina il pacchetto
    db.delete(db_package)
    db.commit()
    
    # Restituisci informazioni su ciò che è stato eliminato
    return {
        "package_id": package_id,
        "deleted_lessons_count": len(related_lessons),
        "deleted_lessons": lessons_info
    }