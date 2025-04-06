# routes/packages.py
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import func

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/packages",
    tags=["packages"],
    responses={404: {"description": "Not found"}},
)

def calculate_expiry_date(start_date: date) -> date:
    """
    Calcola la data di scadenza per un pacchetto a durata fissa (4 settimane).
    La scadenza cade la domenica della quarta settimana dopo la data di inizio.
    
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
    expiry_date = monday + timedelta(days=27)
    
    return expiry_date

def update_package_status(db: Session, package_id: int, commit: bool = True):
    """
    Update package status based on expiry date and payment status.
    Also recalculates remaining hours.
    """
    # Get the package
    package = db.query(models.Package).filter(models.Package.id == package_id).with_for_update().first()
    if not package:
        return None
    
    # Calculate hours used in lessons
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Remaining hours are total hours minus used hours
    package.remaining_hours = max(Decimal('0'), package.total_hours - hours_used)
    
    # Update status based on expiry date and payment
    today = date.today()
    
    if package.is_paid:
        if today <= package.expiry_date:
            package.status = "in_progress"
        else:
            package.status = "completed"
    else:
        if today <= package.expiry_date:
            package.status = "in_progress"
        else:
            package.status = "expired"
    
    # Commit if requested
    if commit:
        db.commit()
        db.refresh(package)
    
    return package

# Aggiungi questa funzione helper
def package_orm_to_response(package_orm):
    """Converts a Package ORM object to a PackageResponse object"""
    # Extract student IDs more safely
    student_ids = []
    if hasattr(package_orm, 'students'):
        student_ids = [student.id for student in package_orm.students]
    
    # Create a dictionary with all required fields
    package_dict = {
        "id": package_orm.id,
        "student_ids": student_ids,
        "start_date": package_orm.start_date,
        "total_hours": package_orm.total_hours,
        "package_cost": package_orm.package_cost,
        "status": package_orm.status,
        "is_paid": package_orm.is_paid,
        "payment_date": package_orm.payment_date,
        "remaining_hours": package_orm.remaining_hours,
        "expiry_date": package_orm.expiry_date,
        "extension_count": package_orm.extension_count,
        "notes": package_orm.notes,
        "created_at": package_orm.created_at
    }
    
    return models.PackageResponse(**package_dict)

# In backend/app/routes/packages.py
# Update the create_package function to check for existing future packages

@router.post("/", response_model=models.PackageResponse)
def create_package(package: models.PackageCreate, allow_multiple: bool = False, db: Session = Depends(get_db)):
    # Verifica che tutti gli studenti esistano
    for student_id in package.student_ids:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
    
    # Controlla pacchetti attivi e futuri (salta se allow_multiple è True)
    if not allow_multiple:
        for student_id in package.student_ids:
            # Controlla prima i pacchetti attivi
            active_package = db.query(models.Package).join(
                models.PackageStudent
            ).filter(
                models.PackageStudent.student_id == student_id,
                models.Package.status == "in_progress"
            ).first()
            
            if active_package:
                # Se il nuovo pacchetto inizia dopo la scadenza del pacchetto attuale
                if package.start_date > active_package.expiry_date:
                    # Controlla se esiste già un pacchetto futuro per questo studente
                    future_package = db.query(models.Package).join(
                        models.PackageStudent
                    ).filter(
                        models.PackageStudent.student_id == student_id,
                        models.Package.start_date > active_package.expiry_date
                    ).first()
                    
                    if future_package:
                        # Se esiste già un pacchetto futuro, blocca la creazione
                        raise HTTPException(
                            status_code=http_status.HTTP_409_CONFLICT,
                            detail={
                                "message": f"Lo studente con ID {student_id} ha già un pacchetto attivo e un pacchetto futuro. Non è possibile creare un ulteriore pacchetto.",
                                "active_package_id": active_package.id,
                                "future_package_id": future_package.id,
                                "active_package_expiry": active_package.expiry_date.isoformat()
                            }
                        )
                    # Se non c'è un pacchetto futuro, permetti la creazione
                    continue
                
                # Se il pacchetto inizia prima della scadenza, non permettere la creazione
                raise HTTPException(
                    status_code=http_status.HTTP_409_CONFLICT,
                    detail={
                        "message": f"Student with ID {student_id} already has an active package",
                        "active_package_id": active_package.id,
                        "active_package_remaining_hours": float(active_package.remaining_hours)
                    }
                )
    
    # Assicurati che total_hours e cost siano positivi
    total_hours = max(Decimal('0.5'), package.total_hours)
    package_cost = max(Decimal('0'), package.package_cost)
    
    # Calcola data di scadenza
    expiry_date = calculate_expiry_date(package.start_date)
    
    # Determina la data di pagamento
    payment_date = package.payment_date if package.is_paid else None

    # Determina lo stato
    if package.is_paid:
        status = "in_progress" if date.today() <= expiry_date else "completed"
    else:
        status = "in_progress" if date.today() <= expiry_date else "expired"
    
    # Crea nuovo pacchetto
    db_package = models.Package(
        # Rimuovi student_id
        start_date=package.start_date,
        total_hours=total_hours,
        package_cost=package_cost,
        status=status,
        is_paid=package.is_paid,
        payment_date=payment_date,
        remaining_hours=total_hours,
        expiry_date=expiry_date,
        notes=package.notes
    )
    
    # Salva nel database
    db.add(db_package)
    db.flush()  # Per ottenere l'ID
    
    # Aggiungi le relazioni con gli studenti
    for student_id in package.student_ids:
        db_package_student = models.PackageStudent(
            package_id=db_package.id,
            student_id=student_id
        )
        db.add(db_package_student)
    
    db.commit()
    db.refresh(db_package)
    
    return package_orm_to_response(db_package)


@router.get("/", response_model=List[models.PackageResponse])
def read_packages(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
    # Fetch all packages
    packages = db.query(models.Package).offset(skip).limit(limit).all()
    
    # Update status for each package
    for pkg in packages:
        # Update package status
        update_package_status(db, pkg.id, commit=False)
    
    db.commit()
    
    # Now re-fetch packages to ensure we have the latest data
    packages = db.query(models.Package).offset(skip).limit(limit).all()
    
    # Convert packages to PackageResponse manually
    package_responses = [package_orm_to_response(pkg) for pkg in packages]
    
    return package_responses

@router.get("/{package_id}", response_model=models.PackageResponse)
def read_package(package_id: int, db: Session = Depends(get_db)):
    """Get a specific package by ID with detailed information."""
    # Find the package
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Always update status when fetching a package
    update_package_status(db, package_id, commit=True)
    
    # Re-fetch the package to get up-to-date data
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    
    # Use the custom function to convert ORM to response model
    return package_orm_to_response(db_package)

@router.get("/student/{student_id}", response_model=List[models.PackageResponse])
def read_student_packages(student_id: int, db: Session = Depends(get_db)):
    # Verifica che lo studente esista
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Ottieni tutti i pacchetti dello studente tramite la tabella di giunzione
    packages = db.query(models.Package).join(
        models.PackageStudent
    ).filter(
        models.PackageStudent.student_id == student_id
    ).all()
    
    # Aggiorna lo stato di ogni pacchetto
    for pkg in packages:
        update_package_status(db, pkg.id, commit=False)
    
    db.commit()
    
    # Ricarica i pacchetti con lo stato aggiornato
    packages = db.query(models.Package).join(
        models.PackageStudent
    ).filter(
        models.PackageStudent.student_id == student_id
    ).all()
    
    return packages

@router.get("/student/{student_id}/active", response_model=models.PackageResponse)
def read_student_active_package(student_id: int, db: Session = Depends(get_db)):
    # Verifica che lo studente esista
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Aggiorna tutti i pacchetti per questo studente
    packages = db.query(models.Package).join(
        models.PackageStudent
    ).filter(
        models.PackageStudent.student_id == student_id
    ).all()
    
    for pkg in packages:
        update_package_status(db, pkg.id, commit=False)
    db.commit()
    
    # Ottieni il pacchetto attivo
    active_package = db.query(models.Package).join(
        models.PackageStudent
    ).filter(
        models.PackageStudent.student_id == student_id,
        models.Package.status == "in_progress"
    ).first()
    
    if not active_package:
        raise HTTPException(status_code=404, detail="No active package found for this student")
    
    return active_package

# Modifica della funzione update_package in packages.py
@router.put("/{package_id}", response_model=models.PackageResponse)
def update_package(package_id: int, package: models.PackageUpdate, allow_multiple: bool = False, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Calculate hours used in lessons
    hours_used = db.query(func.sum(models.Lesson.duration)).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).scalar() or Decimal('0')
    
    # Create a copy of the update data
    update_data = package.dict(exclude_unset=True)
    
    # Handle start date change (recalculate expiry date while preserving extensions)
    if "start_date" in update_data:
        # Calculate base expiry date
        base_expiry_date = calculate_expiry_date(update_data["start_date"])
        
        # Apply extensions if any
        if db_package.extension_count > 0:
            base_expiry_date = base_expiry_date + timedelta(days=7 * db_package.extension_count)
        
        update_data["expiry_date"] = base_expiry_date
        
    # Validate total hours (must be >= hours used)
    if "total_hours" in update_data and update_data["total_hours"] < hours_used:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Total hours cannot be less than hours already used ({hours_used})"
        )
    
    # Handle payment status change
    if "is_paid" in update_data:
        # If changing to paid and no payment date provided
        if update_data["is_paid"] and not db_package.is_paid:
            if "payment_date" not in update_data or not update_data["payment_date"]:
                update_data["payment_date"] = date.today()
        
        # If changing to unpaid, remove payment date
        if not update_data["is_paid"] and db_package.is_paid:
            update_data["payment_date"] = None
    
    # Estrai gli ID degli studenti in modo sicuro
    student_ids = update_data.pop("student_ids", None)
    
    # Aggiorna i campi normali del pacchetto
    for key, value in update_data.items():
        setattr(db_package, key, value)
    
    # Aggiorna le relazioni con gli studenti solo se student_ids è stato fornito
    if student_ids is not None:
        # Verifica che tutti gli studenti esistano
        for student_id in student_ids:
            student = db.query(models.Student).filter(models.Student.id == student_id).first()
            if not student:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
        
        # Controlla se stai cercando di rimuovere uno studente con lezioni esistenti
        existing_student_ids = [student.id for student in db_package.students]

        # Identifica i nuovi studenti (non presenti nel pacchetto attuale)
        new_student_ids = set(student_ids) - set(existing_student_ids)

        # Verifica se i nuovi studenti hanno già pacchetti attivi (se allow_multiple è falso)
        if not allow_multiple and new_student_ids:
            for student_id in new_student_ids:
                # Cerca pacchetti attivi per questo studente (escludendo il pacchetto corrente)
                active_package = db.query(models.Package).join(
                    models.PackageStudent
                ).filter(
                    models.PackageStudent.student_id == student_id,
                    models.Package.status == "in_progress",
                    models.Package.id != package_id  # Escludi il pacchetto corrente
                ).first()
                
                if active_package:
                    raise HTTPException(
                        status_code=http_status.HTTP_409_CONFLICT,
                        detail={
                            "message": f"Student with ID {student_id} already has an active package",
                            "active_package_id": active_package.id,
                            "active_package_remaining_hours": float(active_package.remaining_hours)
                        }
                    )
        
        student_ids_to_remove = set(existing_student_ids) - set(student_ids)
        for student_id in student_ids_to_remove:
            # Controlla se lo studente ha lezioni in questo pacchetto
            has_lessons = db.query(models.Lesson).filter(
                models.Lesson.package_id == package_id,
                models.Lesson.student_id == student_id,
                models.Lesson.is_package == True
            ).count() > 0
            
            if has_lessons:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Non puoi rimuovere lo studente con ID {student_id} perché ha lezioni in questo pacchetto"
                )
        
        # Elimina le relazioni pacchetto-studente esistenti
        db.query(models.PackageStudent).filter(
            models.PackageStudent.package_id == package_id
        ).delete()
        
        # Aggiungi nuove relazioni pacchetto-studente
        for student_id in student_ids:
            db_package_student = models.PackageStudent(
                package_id=package_id,
                student_id=student_id
            )
            db.add(db_package_student)
    
    # Save changes
    db.commit()
    
    # Update remaining hours and status
    update_package_status(db, package_id)
    
    # Refresh package data
    db.refresh(db_package)
    return package_orm_to_response(db_package)  # Use the helper function for consistent response format

# In backend/app/routes/packages.py
# Update the extend_package_expiry function

@router.put("/{package_id}/extend", response_model=models.PackageResponse)
def extend_package_expiry(package_id: int, db: Session = Depends(get_db)):
    """Estende la scadenza del pacchetto alla domenica successiva"""
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Controlla se qualche studente in questo pacchetto ha un pacchetto futuro
    for student in db_package.students:
        student_id = student.id
        # Cerca pacchetti futuri per questo studente (che iniziano dopo la scadenza del pacchetto corrente)
        future_package = db.query(models.Package).join(
            models.PackageStudent
        ).filter(
            models.PackageStudent.student_id == student_id,
            models.Package.start_date > db_package.expiry_date,
            models.Package.id != package_id
        ).first()
        
        if future_package:
            raise HTTPException(
                status_code=400,
                detail=f"Non è possibile estendere il pacchetto perché lo studente {student.first_name} {student.last_name} ha già un pacchetto futuro programmato"
            )
    
    # Calcola la domenica successiva
    current_expiry = db_package.expiry_date
    days_until_next_monday = 7  # Se siamo a domenica, andiamo alla domenica successiva
    
    # Calcola la nuova data di scadenza
    new_expiry = current_expiry + timedelta(days=days_until_next_monday)
    
    # Aggiorna il pacchetto
    db_package.expiry_date = new_expiry
    db_package.status = "in_progress"  # Rimetti il pacchetto in corso
    db_package.extension_count += 1  # Incrementa il contatore delle estensioni
    
    db.commit()
    db.refresh(db_package)
    return db_package

# Add this to backend/app/routes/packages.py
@router.put("/{package_id}/cancel-extension", response_model=models.PackageResponse)
def cancel_package_extension(package_id: int, db: Session = Depends(get_db)):
    """Cancella l'ultima estensione del pacchetto riducendo la data di scadenza di 7 giorni"""
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Calculate what the original expiry date would be (4 weeks from start)
    base_expiry_date = calculate_expiry_date(db_package.start_date)
    
    # If the current expiry date is not greater than the base, there's no extension to cancel
    if db_package.expiry_date <= base_expiry_date:
        raise HTTPException(status_code=400, detail="Non ci sono estensioni da annullare")
    
    # Simply subtract 7 days from the current expiry date
    db_package.expiry_date = db_package.expiry_date - timedelta(days=7)
    # Nel backend, in cancel_package_extension()
    if db_package.extension_count > 0:
        db_package.extension_count -= 1

    # Make sure we don't go below the base expiry date
    if db_package.expiry_date < base_expiry_date:
        db_package.expiry_date = base_expiry_date
    
    # Update package status based on the new expiry date
    today = date.today()
    if today < db_package.expiry_date:
        db_package.status = "in_progress"
    else:
        db_package.status = "completed" if db_package.is_paid else "expired"
    
    db.commit()
    db.refresh(db_package)
    return db_package

@router.delete("/{package_id}", response_model=dict)
def delete_package(package_id: int, db: Session = Depends(get_db)):
    db_package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if db_package is None:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Find all lessons associated with this package
    related_lessons = db.query(models.Lesson).filter(
        models.Lesson.package_id == package_id,
        models.Lesson.is_package == True
    ).all()
    
    # Save information about lessons to delete
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
    
    # Delete associated lessons
    for lesson in related_lessons:
        db.delete(lesson)
    
    # Delete the package
    db.delete(db_package)
    db.commit()
    
    # Return information about what was deleted
    return {
        "package_id": package_id,
        "deleted_lessons_count": len(related_lessons),
        "deleted_lessons": lessons_info
    }