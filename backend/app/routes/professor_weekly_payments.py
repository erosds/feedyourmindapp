# Crea un nuovo file: backend/app/routes/professor_weekly_payments.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import date, timedelta

from .. import models
from ..database import get_db
from ..auth import get_current_admin
from app.routes.activity import log_activity

router = APIRouter(
    prefix="/professor-weekly-payments",
    tags=["professor-weekly-payments"],
    responses={404: {"description": "Not found"}},
)

def get_monday_of_week(target_date: date) -> date:
    """Restituisce il lunedì della settimana che contiene la data specificata."""
    days_since_monday = target_date.weekday()
    monday = target_date - timedelta(days=days_since_monday)
    return monday

@router.get("/professor/{professor_id}/week/{week_start_date}", response_model=models.ProfessorWeeklyPaymentResponse)
def get_professor_weekly_payment(
    professor_id: int,
    week_start_date: date,
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene lo stato del pagamento per un professore specifico in una settimana specifica.
    """
    # Assicurati che la data sia un lunedì
    monday = get_monday_of_week(week_start_date)
    
    # Verifica che il professore esista
    professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professore non trovato")
    
    # Cerca il record del pagamento
    payment = db.query(models.ProfessorWeeklyPayment).filter(
        models.ProfessorWeeklyPayment.professor_id == professor_id,
        models.ProfessorWeeklyPayment.week_start_date == monday
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Record di pagamento non trovato")
    
    return payment

@router.get("/week/{week_start_date}", response_model=Dict[int, models.ProfessorWeeklyPaymentResponse])
def get_weekly_payments_status(
    week_start_date: date,
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene lo stato dei pagamenti per tutti i professori per una settimana specifica.
    Restituisce un dizionario con professor_id come chiave e stato del pagamento come valore.
    """
    # Assicurati che la data sia un lunedì
    monday = get_monday_of_week(week_start_date)
    
    # Ottieni tutti i pagamenti settimanali per questa settimana
    payments = db.query(models.ProfessorWeeklyPayment).filter(
        models.ProfessorWeeklyPayment.week_start_date == monday
    ).all()
    
    # Converti in dizionario per facilità d'uso
    payments_dict = {payment.professor_id: payment for payment in payments}
    
    return payments_dict

@router.post("/toggle", response_model=models.ProfessorWeeklyPaymentResponse)
def toggle_professor_payment_status(
    request_data: dict,
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Cambia lo stato del pagamento per un professore in una settimana specifica.
    Se non esiste un record, lo crea. Se esiste, inverte lo stato is_paid.
    """
    professor_id = request_data.get('professor_id')
    week_start_date_str = request_data.get('week_start_date')
    
    if not professor_id or not week_start_date_str:
        raise HTTPException(status_code=400, detail="professor_id e week_start_date sono richiesti")
    
    # Converti la stringa in data
    try:
        from datetime import datetime
        week_start_date = datetime.strptime(week_start_date_str, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato data non valido. Usa YYYY-MM-DD")
    
    # Assicurati che la data sia un lunedì
    monday = get_monday_of_week(week_start_date)
    
    # Verifica che il professore esista
    professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professore non trovato")
    
    # Cerca un record esistente
    existing_payment = db.query(models.ProfessorWeeklyPayment).filter(
        models.ProfessorWeeklyPayment.professor_id == professor_id,
        models.ProfessorWeeklyPayment.week_start_date == monday
    ).first()
    
    if existing_payment:
        # Inverte lo stato
        existing_payment.is_paid = not existing_payment.is_paid
        existing_payment.marked_by = current_user.id
        existing_payment.marked_at = func.now()
        
        db.commit()
        db.refresh(existing_payment)
        
        # Log dell'attività
        status_text = "pagato" if existing_payment.is_paid else "non pagato"
        log_activity(
            db=db,
            professor_id=current_user.id,
            action_type="update",
            entity_type="professor_weekly_payment",
            entity_id=existing_payment.id,
            description=f"Marcato {professor.first_name} {professor.last_name} come {status_text} per la settimana del {monday.strftime('%d/%m/%Y')}"
        )
        
        return existing_payment
    else:
        # Crea nuovo record (di default is_paid=True quando viene creato tramite toggle)
        new_payment = models.ProfessorWeeklyPayment(
            professor_id=professor_id,
            week_start_date=monday,
            is_paid=True,  # Quando si clicca per la prima volta, assumiamo che sia per marcarlo come pagato
            marked_by=current_user.id,
            marked_at=func.now()
        )
        
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)
        
        # Log dell'attività
        log_activity(
            db=db,
            professor_id=current_user.id,
            action_type="create",
            entity_type="professor_weekly_payment",
            entity_id=new_payment.id,
            description=f"Marcato {professor.first_name} {professor.last_name} come pagato per la settimana del {monday.strftime('%d/%m/%Y')}"
        )
        
        return new_payment

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weekly_payment_record(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Elimina un record di pagamento settimanale (solo per admin).
    """
    payment = db.query(models.ProfessorWeeklyPayment).filter(
        models.ProfessorWeeklyPayment.id == payment_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Record di pagamento non trovato")
    
    # Log dell'attività prima di eliminare
    professor = db.query(models.Professor).filter(models.Professor.id == payment.professor_id).first()
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="delete",
        entity_type="professor_weekly_payment",
        entity_id=payment_id,
        description=f"Eliminato record pagamento settimanale per {professor.first_name if professor else 'Professore sconosciuto'} {professor.last_name if professor else ''} della settimana del {payment.week_start_date.strftime('%d/%m/%Y')}"
    )
    
    db.delete(payment)
    db.commit()
    
    return None