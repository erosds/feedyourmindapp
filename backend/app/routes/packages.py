# routes/packages.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

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
    Calcola e aggiorna le ore rimanenti di un pacchetto in base alle lezioni associate.
    
    Args:
        db: Sessione del database
        package_id: ID del pacchetto da aggiornare
        commit: Se True, esegue il commit delle modifiche
        
    Returns:
        Il pacchetto aggiornato
    """
    # Recupera il pacchetto
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        return None
    
    # Calcola le ore utilizzate nelle lezioni
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Aggiorna le ore rimanenti
    package.remaining_hours = package.total_hours - hours_used
    
    # Aggiorna lo stato del pacchetto in base alle ore rimanenti
    if package.remaining_hours <= 0:
        package.status = "completed"
    else:
        package.status = "in_progress"
    
    # Commit se richiesto
    if commit:
        db.commit()
        db.refresh(package)
    
    return package

# CRUD operations
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
        # Opzionale: gestisci il caso in cui lo studente ha già un pacchetto attivo
        # Ad esempio, potresti impostare il pacchetto precedente come completato
        active_package.status = "completed"
        db.commit()
    
    # Crea un nuovo pacchetto
    db_package = models.Package(
        student_id=package.student_id,
        start_date=package.start_date,
        total_hours=package.total_hours,
        package_cost=package.package_cost,
        status="in_progress",
        is_paid=package.is_paid,
        remaining_hours=package.total_hours  # Inizialmente, le ore rimanenti sono uguali al totale
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
    
    # Se stiamo aggiornando le ore totali, dobbiamo verificare che non siano inferiori 
    # alle ore già utilizzate
    if package.total_hours is not None:
        # Calcola le ore già utilizzate in questo pacchetto
        hours_used = db.query(func.sum(models.Lesson.duration)).filter(
            models.Lesson.package_id == package_id,
            models.Lesson.is_package == True
        ).scalar() or Decimal('0')
        
        # Controlla che le nuove ore totali non siano inferiori alle ore già utilizzate
        if package.total_hours < hours_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le ore totali non possono essere inferiori alle ore già utilizzate ({hours_used})"
            )
    
    # Aggiorna i campi se presenti
    update_data = package.dict(exclude_unset=True)
    for key, value in update_data.items():
        # Non aggiornare remaining_hours direttamente, verranno calcolate dalla funzione helper
        if key != 'remaining_hours':
            setattr(db_package, key, value)
    
    # Esegui il commit per salvare le modifiche di base
    db.commit()
    
    # Ricalcola e aggiorna le ore rimanenti
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