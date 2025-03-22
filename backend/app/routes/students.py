# routes/students.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/students",
    tags=["students"],
    responses={404: {"description": "Not found"}},
)

class HomonymCheckResponse(BaseModel):
    has_homonyms: bool
    message: Optional[str] = None

@router.get("/check-homonyms/", response_model=HomonymCheckResponse)
def check_student_homonyms(first_name: str, last_name: str, db: Session = Depends(get_db)):
    """Verifica se esistono studenti omonimi con lo stesso nome e cognome."""
    existing_students = db.query(models.Student).filter(
        models.Student.first_name == first_name,
        models.Student.last_name == last_name
    ).all()
    
    has_homonyms = len(existing_students) > 0
    message = "Esistono studenti con lo stesso nome e cognome" if has_homonyms else None
    
    return {"has_homonyms": has_homonyms, "message": message}

@router.post("/", response_model=models.StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(student: models.StudentCreate, db: Session = Depends(get_db)):
    # Cerca studenti con lo stesso nome e cognome
    existing_students = db.query(models.Student).filter(
        models.Student.first_name == student.first_name,
        models.Student.last_name == student.last_name
    ).all()
    
    # Se ci sono omonimi e la data di nascita non è fornita, solleva un'eccezione
    if existing_students and student.birth_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data di nascita obbligatoria per studenti omonimi"
        )
    
    # Se ci sono omonimi con la stessa data di nascita, solleva un'eccezione
    if student.birth_date:
        for existing in existing_students:
            if existing.birth_date == student.birth_date:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Esiste già uno studente con lo stesso nome, cognome e data di nascita"
                )
    
    # Crea un'istanza del modello Student con gestione esplicita dei valori null
    db_student = models.Student(
        first_name=student.first_name,
        last_name=student.last_name,
        birth_date=student.birth_date if student.birth_date else None,  # Gestione esplicita del null
        email=student.email,
        phone=student.phone
    )
    
    # Salva nel database
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

@router.get("/", response_model=List[models.StudentResponse])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    students = db.query(models.Student).offset(skip).limit(limit).all()
    return students

@router.get("/{student_id}", response_model=models.StudentResponse)
def read_student(student_id: int, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student

@router.put("/{student_id}", response_model=models.StudentResponse)
def update_student(student_id: int, student: models.StudentUpdate, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Se si sta modificando nome o cognome, controlla gli omonimi
    if (student.first_name and student.first_name != db_student.first_name) or \
       (student.last_name and student.last_name != db_student.last_name):
        
        first_name = student.first_name or db_student.first_name
        last_name = student.last_name or db_student.last_name
        
        # Cerca studenti con lo stesso nome e cognome (escludendo lo studente corrente)
        existing_students = db.query(models.Student).filter(
            models.Student.first_name == first_name,
            models.Student.last_name == last_name,
            models.Student.id != student_id
        ).all()
        
        # Se ci sono omonimi e non è fornita una data di nascita
        if existing_students and student.birth_date is None and db_student.birth_date is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data di nascita obbligatoria per studenti omonimi"
            )
    
    # Aggiorna i campi se presenti
    update_data = student.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
    
    db.commit()
    db.refresh(db_student)
    return db_student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    db_student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(db_student)
    db.commit()
    return None