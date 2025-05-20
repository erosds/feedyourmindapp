# Crea un nuovo file routes/package_payments.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from .. import models
from ..database import get_db
from ..auth import get_current_professor
from ..utils import update_package_payment_status
from app.routes.activity import log_activity

router = APIRouter(
    prefix="/packages/{package_id}/payments",
    tags=["package-payments"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=models.PackagePaymentResponse, status_code=status.HTTP_201_CREATED)
def create_package_payment(
    package_id: int, 
    payment: models.PackagePaymentCreate, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
    """Aggiunge un nuovo pagamento (acconto) a un pacchetto."""
    # Verifica che il pacchetto esista
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    # Crea il nuovo pagamento
    db_payment = models.PackagePayment(
        package_id=package_id,
        amount=payment.amount,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        notes=payment.notes
    )
    
    db.add(db_payment)
    db.flush()
    
    # Aggiorna lo stato di pagamento del pacchetto
    update_package_payment_status(db, package_id)
    
    # Log dell'attività
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="create",
        entity_type="payment",
        entity_id=db_payment.id,
        description=f"Registrato pagamento di €{payment.amount} per pacchetto #{package_id}"
    )
    
    db.refresh(db_payment)
    return db_payment

@router.get("/", response_model=List[models.PackagePaymentResponse])
def read_package_payments(
    package_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
    """Ottiene tutti i pagamenti di un pacchetto."""
    # Verifica che il pacchetto esista
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    payments = db.query(models.PackagePayment).filter(
        models.PackagePayment.package_id == package_id
    ).order_by(models.PackagePayment.payment_date.desc()).all()
    
    return payments

@router.get("/{payment_id}", response_model=models.PackagePaymentResponse)
def read_package_payment(
    package_id: int, 
    payment_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
    """Ottiene un singolo pagamento di un pacchetto."""
    payment = db.query(models.PackagePayment).filter(
        models.PackagePayment.id == payment_id,
        models.PackagePayment.package_id == package_id
    ).first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payment

@router.put("/{payment_id}", response_model=models.PackagePaymentResponse)
def update_package_payment(
    package_id: int, 
    payment_id: int, 
    payment: models.PackagePaymentUpdate, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
    """Aggiorna un pagamento esistente."""
    db_payment = db.query(models.PackagePayment).filter(
        models.PackagePayment.id == payment_id,
        models.PackagePayment.package_id == package_id
    ).first()
    
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Salva i valori originali per il log
    old_amount = db_payment.amount
    
    # Aggiorna i campi del pagamento
    update_data = payment.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_payment, key, value)
    
    db.commit()
    
    # Aggiorna lo stato di pagamento del pacchetto
    update_package_payment_status(db, package_id)
    
    # Log dell'attività
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="update",
        entity_type="payment",
        entity_id=payment_id,
        description=f"Aggiornato pagamento per pacchetto #{package_id} da €{old_amount} a €{db_payment.amount}"
    )
    
    db.refresh(db_payment)
    return db_payment

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package_payment(
    package_id: int, 
    payment_id: int, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_professor)
):
    """Elimina un pagamento."""
    db_payment = db.query(models.PackagePayment).filter(
        models.PackagePayment.id == payment_id,
        models.PackagePayment.package_id == package_id
    ).first()
    
    if not db_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Salva i valori per il log
    payment_amount = db_payment.amount
    
    # Elimina il pagamento
    db.delete(db_payment)
    db.commit()
    
    # Aggiorna lo stato di pagamento del pacchetto
    update_package_payment_status(db, package_id)
    
    # Log dell'attività
    log_activity(
        db=db,
        professor_id=current_user.id,
        action_type="delete",
        entity_type="payment",
        entity_id=payment_id,
        description=f"Eliminato pagamento di €{payment_amount} per pacchetto #{package_id}"
    )
    
    return None