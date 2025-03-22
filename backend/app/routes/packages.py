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
    # Importa func da sqlalchemy all'inizio della funzione
    from sqlalchemy import func
    
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
        setattr(db_package, key, value)
    
    # Ricalcola sempre le ore rimanenti (non modificabili direttamente)
    if package.total_hours is not None or package.status is not None:
        # Calcola le ore già utilizzate
        hours_used = db.query(func.sum(models.Lesson.duration)).filter(
            models.Lesson.package_id == package_id,
            models.Lesson.is_package == True
        ).scalar() or Decimal('0')
        
        # Ore rimanenti = ore totali - ore utilizzate
        db_package.remaining_hours = db_package.total_hours - hours_used
        
        # Se non ci sono più ore rimanenti, imposta lo stato a "completed"
        if db_package.remaining_hours <= 0 and db_package.status != "completed":
            db_package.status = "completed"
        # Se ci sono ore rimanenti e lo stato era "completed", riattivalo
        elif db_package.remaining_hours > 0 and db_package.status == "completed":
            db_package.status = "in_progress"
    
    db.commit()
    db.refresh(db_package)
    return db_package

@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(package_id: int, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    db.delete(db_package)
    db.commit()
    return None