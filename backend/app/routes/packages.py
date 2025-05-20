# routes/packages.py
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import func

from ..auth import get_current_professor  # Importato per ottenere l'utente corrente
from app.routes.activity import log_activity  # Importato per registrare le attività

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
    Update package status based on expiry date, payment status and remaining hours.
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
    
    # Update status based on expiry date, payment status and remaining hours
    today = date.today()
    
    if today <= package.expiry_date:
        # Se non è scaduto, è in corso indipendentemente dal pagamento
        package.status = "in_progress"
    else:
        # Se è scaduto, lo stato dipende dalle ore rimanenti
        if package.remaining_hours > Decimal('0'):
            # Se ha ore rimanenti, è considerato scaduto (expired)
            # indipendentemente dallo stato di pagamento
            package.status = "expired"
        else:
            # Se non ha ore rimanenti, è completato solo se pagato
            if package.is_paid:
                package.status = "completed"
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
    
    # Calculate paid_amount as the sum of all payments
    from decimal import Decimal
    paid_amount = Decimal('0')
    if hasattr(package_orm, 'payments') and package_orm.payments:
        paid_amount = sum(Decimal(str(payment.amount)) for payment in package_orm.payments)
    
    # Set payment_status based on payments
    package_cost = Decimal(str(package_orm.package_cost))
    if paid_amount <= 0:
        payment_status = "non_paid"
    elif paid_amount >= package_cost:
        payment_status = "fully_paid"
    else:
        payment_status = "partially_paid"
    
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
        "created_at": package_orm.created_at,
        "paid_amount": paid_amount,
        "payment_status": payment_status,
        "payments": package_orm.payments if hasattr(package_orm, 'payments') else []
    }
    
    return models.PackageResponse(**package_dict)

# In backend/app/routes/packages.py
# Update the create_package function to check for existing future packages
@router.post("/", response_model=models.PackageResponse)
def create_package(
    package: models.PackageCreate, 
    allow_multiple: bool = False, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
    # Verifica che tutti gli studenti esistano
    for student_id in package.student_ids:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
    
    # Controlla sovrapposizioni con pacchetti esistenti (salta se allow_multiple è True)
    if not allow_multiple:
        for student_id in package.student_ids:
            # Calcola la data di scadenza del nuovo pacchetto
            new_package_expiry = calculate_expiry_date(package.start_date)
            
            # Ottieni tutti i pacchetti dello studente (attivi, completati, scaduti)
            existing_packages = db.query(models.Package).join(
                models.PackageStudent
            ).filter(
                models.PackageStudent.student_id == student_id
            ).all()
            
            for existing_package in existing_packages:
                # Controlla se c'è sovrapposizione
                # (il nuovo pacchetto inizia prima che l'esistente finisca) E 
                # (il nuovo pacchetto finisce dopo che l'esistente è iniziato)
                if (package.start_date <= existing_package.expiry_date and 
                    new_package_expiry >= existing_package.start_date):
                    
                    # NUOVA CONDIZIONE: Consenti sovrapposizione se il pacchetto esistente ha 
                    # ore rimanenti <= delle ore settimanali (total_hours / 4)
                    weekly_hours = existing_package.total_hours / Decimal('4')
                    if existing_package.remaining_hours <= weekly_hours:
                        continue  # Permetti la sovrapposizione in questo caso
                    
                    # Se il pacchetto esistente è attivo, aggiungi info aggiuntive
                    if existing_package.status == "in_progress":
                        raise HTTPException(
                            status_code=http_status.HTTP_409_CONFLICT,
                            detail={
                                "message": f"Il nuovo pacchetto si sovrappone a un pacchetto attivo per lo studente con ID {student_id}.",
                                "existing_package_id": existing_package.id,
                                "existing_package_dates": f"{existing_package.start_date} - {existing_package.expiry_date}",
                                "existing_package_status": existing_package.status,
                                "remaining_hours": float(existing_package.remaining_hours)
                            }
                        )
                    else:
                        raise HTTPException(
                            status_code=http_status.HTTP_409_CONFLICT,
                            detail={
                                "message": f"Il nuovo pacchetto si sovrappone a un pacchetto esistente per lo studente con ID {student_id}.",
                                "existing_package_id": existing_package.id,
                                "existing_package_dates": f"{existing_package.start_date} - {existing_package.expiry_date}",
                                "existing_package_status": existing_package.status
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
    today = date.today()
    if today <= expiry_date:
        status = "in_progress"
    else:
        # Se è già scaduto alla creazione (caso raro), mantieni la logica basata sulle ore residue
        if package.is_paid and total_hours <= 0:
            status = "completed"
        else:
            status = "expired"
    
    # Crea nuovo pacchetto
    db_package = models.Package(
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

    # Log dell'attività
    student_names = []
    for student_id in package.student_ids:
        student = db.query(models.Student).filter(models.Student.id == student_id).first()
        if student:
            student_names.append(f"{student.first_name} {student.last_name}")

    students_str = ", ".join(student_names) if student_names else "nessuno studente"
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="create",
        entity_type="package",
        entity_id=db_package.id,
        description=f"Creato pacchetto di {total_hours} ore per {students_str}"
    )
    
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

# Modifica la funzione read_package in packages.py

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
    
    # Calculate paid amount (sum of all payments)
    paid_amount = sum(payment.amount for payment in db_package.payments) if db_package.payments else Decimal('0')
    
    # Use the package_orm_to_response function with additional fields
    response = package_orm_to_response(db_package)
    response.paid_amount = paid_amount
    response.payment_status = db_package.payment_status
    response.payments = db_package.payments
    
    return response

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
def update_package(
    package_id: int, 
    package: models.PackageUpdate, 
    allow_multiple: bool = False, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
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

    # Salva i valori originali
    old_is_paid = db_package.is_paid
    old_package_cost = db_package.package_cost
    
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

    # Log dell'attività
    student_names = []
    for student in db_package.students:
        student_names.append(f"{student.first_name} {student.last_name}")

    students_str = ", ".join(student_names) if student_names else "nessuno studente"

    # Descrizione base
    description = f"Modificato pacchetto di {db_package.total_hours} ore per {students_str}"

    # Aggiungi dettagli sul cambiamento dello stato di pagamento
    if "is_paid" in update_data and old_is_paid != db_package.is_paid:
        if db_package.is_paid:
            description += f" - impostato come pagato (€{db_package.package_cost})"
        else:
            description += " - impostato come non pagato"

    # Se è stato cambiato solo il costo senza cambiare lo stato di pagamento
    elif "package_cost" in update_data and old_package_cost != db_package.package_cost and db_package.is_paid:
        description += f" - aggiornato importo pagamento a €{db_package.package_cost}"

    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="update",
        entity_type="package",
        entity_id=package_id,
        description=description
    )

    return package_orm_to_response(db_package)  # Use the helper function for consistent response format

# In backend/app/routes/packages.py
# Update the extend_package_expiry function

@router.put("/{package_id}/extend", response_model=models.PackageResponse)
def extend_package_expiry(
    package_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
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

    # Log dell'attività
    student_names = []
    for student in db_package.students:
        student_names.append(f"{student.first_name} {student.last_name}")

    students_str = ", ".join(student_names) if student_names else "nessuno studente"
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="update",
        entity_type="package",
        entity_id=package_id,
        description=f"Estesa scadenza del pacchetto per {students_str} a {new_expiry.strftime('%d/%m/%Y')}"
    )

    return db_package

# Add this to backend/app/routes/packages.py
@router.put("/{package_id}/cancel-extension", response_model=models.PackageResponse)
def cancel_package_extension(
    package_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
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
        # Usa la stessa logica che abbiamo definito in update_package_status
        if db_package.remaining_hours > Decimal('0'):
            db_package.status = "expired"
        else:
            if db_package.is_paid:
                db_package.status = "completed"
            else:
                db_package.status = "expired"
    
    db.commit()
    db.refresh(db_package)

    # Log dell'attività
    student_names = []
    for student in db_package.students:
        student_names.append(f"{student.first_name} {student.last_name}")

    students_str = ", ".join(student_names) if student_names else "nessuno studente"
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="update",
        entity_type="package",
        entity_id=package_id,
        description=f"Annullata estensione del pacchetto per {students_str}, nuova scadenza: {db_package.expiry_date.strftime('%d/%m/%Y')}"
    )

    return db_package

@router.delete("/{package_id}", response_model=dict)
def delete_package(
    package_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
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

    # Log dell'attività
    student_names = []
    for student in db_package.students:
        student_names.append(f"{student.first_name} {student.last_name}")

    students_str = ", ".join(student_names) if student_names else "nessuno studente"
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="delete",
        entity_type="package",
        entity_id=package_id,
        description=f"Eliminato pacchetto di {db_package.total_hours} ore per {students_str}"
    )
    
    # Return information about what was deleted
    return {
        "package_id": package_id,
        "deleted_lessons_count": len(related_lessons),
        "deleted_lessons": lessons_info
    }