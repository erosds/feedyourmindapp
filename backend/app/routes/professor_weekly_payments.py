# backend/app/routes/professor_weekly_payments.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import date, timedelta, datetime

from .. import models
from ..database import get_db
from ..auth import get_current_admin
from app.routes.activity import log_activity

from pydantic import BaseModel
from typing import Optional

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

# Modello Pydantic per la richiesta di toggle
class PaymentToggleRequest(BaseModel):
    professor_id: int
    week_start_date: str
    payment_date: Optional[str] = None  # Data personalizzata opzionale

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
    request: PaymentToggleRequest,  # Usa il modello Pydantic invece di dict
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Cambia lo stato di pagamento di un professore per una determinata settimana.
    Se viene fornita una payment_date, la usa come data di pagamento.
    """
    try:
        # Parsing delle date
        week_start_date = datetime.strptime(request.week_start_date, '%Y-%m-%d').date()
        
        # Se è fornita una data di pagamento personalizzata, usala
        custom_payment_date = None
        if request.payment_date:
            custom_payment_date = datetime.strptime(request.payment_date, '%Y-%m-%d')
        
        # Assicurati che la data sia un lunedì
        monday = get_monday_of_week(week_start_date)
        
        # Verifica che il professore esista
        professor = db.query(models.Professor).filter(models.Professor.id == request.professor_id).first()
        if not professor:
            raise HTTPException(status_code=404, detail="Professore non trovato")
        
        # Cerca un record esistente
        existing_payment = db.query(models.ProfessorWeeklyPayment).filter(
            models.ProfessorWeeklyPayment.professor_id == request.professor_id,
            models.ProfessorWeeklyPayment.week_start_date == monday
        ).first()
        
        if existing_payment:
            # Cambia lo stato esistente
            existing_payment.is_paid = not existing_payment.is_paid
            existing_payment.marked_by = current_user.id
            
            if existing_payment.is_paid:
                # Se stiamo marcando come pagato, usa la data personalizzata o quella odierna
                existing_payment.marked_at = custom_payment_date or datetime.utcnow()
            else:
                # Se stiamo togliendo il pagamento, rimuovi la data
                existing_payment.marked_at = None
            
            db.commit()
            db.refresh(existing_payment)
            
            # Log dell'attività
            status_text = "pagato" if existing_payment.is_paid else "non pagato"
            date_info = ""
            if existing_payment.is_paid and existing_payment.marked_at:
                date_info = f" in data {existing_payment.marked_at.strftime('%d/%m/%Y')}"
            
            log_activity(
                db=db,
                professor_id=current_user.id,
                action_type="update",
                entity_type="professor_weekly_payment",
                entity_id=existing_payment.id,
                description=f"Marcato {professor.first_name} {professor.last_name} come {status_text}{date_info} per la settimana del {monday.strftime('%d/%m/%Y')}"
            )
            
            return existing_payment
        else:
            # Crea un nuovo record (sempre marcato come pagato quando viene creato)
            new_payment = models.ProfessorWeeklyPayment(
                professor_id=request.professor_id,
                week_start_date=monday,
                is_paid=True,
                marked_by=current_user.id,
                marked_at=custom_payment_date or datetime.utcnow()
            )
            
            db.add(new_payment)
            db.commit()
            db.refresh(new_payment)
            
            # Log dell'attività
            date_info = ""
            if new_payment.marked_at:
                date_info = f" in data {new_payment.marked_at.strftime('%d/%m/%Y')}"
            
            log_activity(
                db=db,
                professor_id=current_user.id,
                action_type="create",
                entity_type="professor_weekly_payment",
                entity_id=new_payment.id,
                description=f"Marcato {professor.first_name} {professor.last_name} come pagato{date_info} per la settimana del {monday.strftime('%d/%m/%Y')}"
            )
            
            return new_payment
            
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato data non valido: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore interno del server: {str(e)}"
        )

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