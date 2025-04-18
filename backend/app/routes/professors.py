# app/routes/professors.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import models
from ..database import get_db
from ..utils import get_password_hash
from ..auth import get_current_professor, get_current_admin

router = APIRouter(
    prefix="/professors",
    tags=["professors"],
    responses={404: {"description": "Not found"}},
)

# CRUD operations
@router.post("/", response_model=models.ProfessorResponse, status_code=status.HTTP_201_CREATED)
def create_professor(professor: models.ProfessorCreate, db: Session = Depends(get_db), current_user: models.Professor = Depends(get_current_admin)):
    # Solo gli admin possono creare nuovi professori
    
    # Controlla se l'username esiste già
    db_professor = db.query(models.Professor).filter(models.Professor.username == professor.username).first()
    if db_professor:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Crea un'istanza del professore con password hashata
    hashed_password = get_password_hash(professor.password)
    db_professor = models.Professor(
        first_name=professor.first_name,
        last_name=professor.last_name,
        username=professor.username,
        password=hashed_password,
        is_admin=professor.is_admin
    )
    
    # Salva nel database
    db.add(db_professor)
    db.commit()
    db.refresh(db_professor)
    return db_professor

@router.get("/", response_model=List[models.ProfessorResponse])
def read_professors(skip: int = 0, limit: int = 1000, db: Session = Depends(get_db), current_user: models.Professor = Depends(get_current_admin)):
    # Solo gli admin possono vedere tutti i professori
    professors = db.query(models.Professor).offset(skip).limit(limit).all()
    return professors

@router.get("/{professor_id}", response_model=models.ProfessorResponse)
def read_professor(professor_id: int, db: Session = Depends(get_db), current_user: models.Professor = Depends(get_current_professor)):
    # Ottiene un professore specifico
    db_professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if db_professor is None:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Rimuoviamo la restrizione per la visualizzazione
    # Tutti gli utenti autenticati possono vedere i dettagli di qualsiasi professore
    
    return db_professor

@router.put("/{professor_id}", response_model=models.ProfessorResponse)
def update_professor(
    professor_id: int, 
    professor: models.ProfessorUpdate, 
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_professor)
):
    # Ottiene il professore da aggiornare
    db_professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if db_professor is None:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Verifica che l'utente sia admin o stia aggiornando il proprio profilo
    if not current_user.is_admin and current_user.id != professor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Non hai il permesso di modificare questo professore"
        )
    
    # Solo gli admin possono modificare lo stato di admin o le note
    update_data = professor.dict(exclude_unset=True)
    
    if "is_admin" in update_data and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Solo gli amministratori possono modificare lo stato di admin"
        )
    
    # Solo gli admin possono modificare le note
    if "notes" in update_data and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Solo gli amministratori possono modificare le note del professore"
        )
    
    # Hash della password se presente
    if "password" in update_data and update_data["password"]:
        update_data["password"] = get_password_hash(update_data["password"])
    
    for key, value in update_data.items():
        setattr(db_professor, key, value)
    
    db.commit()
    db.refresh(db_professor)
    return db_professor

@router.delete("/{professor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_professor(professor_id: int, db: Session = Depends(get_db), current_user: models.Professor = Depends(get_current_admin)):
    # Solo gli admin possono eliminare professori
    db_professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if db_professor is None:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Non permettere di eliminare l'ultimo admin nel sistema
    if db_professor.is_admin:
        admin_count = db.query(models.Professor).filter(models.Professor.is_admin == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossibile eliminare l'ultimo amministratore nel sistema"
            )
    
    # Controlla se il professore sta tentando di eliminare se stesso
    if current_user.id == professor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non puoi eliminare il tuo account"
        )
    
    db.delete(db_professor)
    db.commit()
    return None