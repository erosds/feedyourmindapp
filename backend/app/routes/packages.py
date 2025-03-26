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
        
        # Se il pacchetto è pagato, le ore totali sono fissate
        if not package.is_paid:
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
    
    # Gestione differenziata per pacchetti fissi e aperti
    if package.package_type == "fixed":
        # Pacchetto fisso: assicurati che ore totali e costo siano positivi
        total_hours = max(Decimal('0.5'), package.total_hours)
        package_cost = max(Decimal('0'), package.package_cost)
        remaining_hours = total_hours
        expiry_date = calculate_expiry_date(package.start_date)
    else:
        # Pacchetto aperto
        if not package.is_paid:
            total_hours = Decimal('0')
            package_cost = Decimal('0')
            remaining_hours = Decimal('0')
            expiry_date = None
        else:
            total_hours = max(Decimal('0.5'), package.total_hours)
            package_cost = max(Decimal('0'), package.package_cost)
            remaining_hours = total_hours
            expiry_date = None
    
    # Determina la data di pagamento
    payment_date = package.payment_date if package.is_paid else None
    
    # Crea un nuovo pacchetto con valori sicuri
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
    
    # Crea una copia dei dati per l'aggiornamento
    update_data = package.dict(exclude_unset=True)
    
    # Gestione del cambio di tipo di pacchetto
    type_changed = "package_type" in update_data and update_data["package_type"] != db_package.package_type
    
    # Gestione speciale per il cambio di tipo di pacchetto
    if type_changed:
        if update_data["package_type"] == "open":
            # Cambio da fisso ad aperto
            update_data["remaining_hours"] = hours_used
            if not db_package.is_paid:
                update_data["total_hours"] = hours_used
                update_data["package_cost"] = Decimal('0')
            update_data["expiry_date"] = None
        else:  # Cambio da aperto a fisso
            # Verifica ore totali sufficienti
            if "total_hours" not in update_data or update_data["total_hours"] is None:
                update_data["total_hours"] = max(hours_used, Decimal('1.0'))
            elif update_data["total_hours"] < hours_used:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Le ore totali non possono essere inferiori alle ore già utilizzate ({hours_used})"
                )
            # Calcola la scadenza
            update_data["expiry_date"] = calculate_expiry_date(
                update_data.get("start_date", db_package.start_date)
            )
            # Calcola le ore rimanenti
            update_data["remaining_hours"] = update_data["total_hours"] - hours_used
    
    # Gestione del cambio di stato pagamento
    if "is_paid" in update_data and update_data["is_paid"] and not db_package.is_paid:
        # Se passa da non pagato a pagato
        if "payment_date" not in update_data or update_data["payment_date"] is None:
            update_data["payment_date"] = date.today()
        
        # Per pacchetti aperti che vengono pagati, fissiamo le ore accumulate e il costo
        if db_package.package_type == "open":
            # Se non è specificato un totale ore, usa le ore accumulate
            if "total_hours" not in update_data:
                update_data["total_hours"] = hours_used or Decimal('1.0')
            
            # Se non è specificato un costo, calcola in base alle ore
            if "package_cost" not in update_data:
                hourly_rate = Decimal('20.0')  # Tariffa oraria predefinita
                update_data["package_cost"] = update_data["total_hours"] * hourly_rate
    
    # Aggiorna tutti i campi
    for key, value in update_data.items():
        setattr(db_package, key, value)
    
    # Salva le modifiche
    db.commit()
    
    # Aggiorna le ore rimanenti/accumulate
    update_package_remaining_hours(db, package_id)
    
    # Aggiorna il pacchetto
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