# routes/lessons.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/lessons",
    tags=["lessons"],
    responses={404: {"description": "Not found"}},
)

# CRUD operations
@router.post("/", response_model=models.LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(lesson: models.LessonCreate, db: Session = Depends(get_db)):
    # Controlla se il professore esiste
    professor = db.query(models.Professor).filter(models.Professor.id == lesson.professor_id).first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Controlla se lo studente esiste
    student = db.query(models.Student).filter(models.Student.id == lesson.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Gestione del pacchetto (se applicabile)
    if lesson.is_package:
        if not lesson.package_id:
            # Cerca il pacchetto attivo dello studente
            active_package = db.query(models.Package).filter(
                models.Package.student_id == lesson.student_id,
                models.Package.status == "in_progress"
            ).first()
            
            if not active_package:
                raise HTTPException(status_code=400, detail="No active package found for this student")
            
            package_id = active_package.id
        else:
            # Usa il pacchetto specificato
            package = db.query(models.Package).filter(models.Package.id == lesson.package_id).first()
            if not package:
                raise HTTPException(status_code=404, detail="Package not found")
            
            if package.student_id != lesson.student_id:
                raise HTTPException(status_code=400, detail="Package does not belong to this student")
            
            if package.status != "in_progress":
                raise HTTPException(status_code=400, detail="Package is not active")
            
            package_id = package.id
        
        # Aggiorna le ore rimanenti nel pacchetto
        package = db.query(models.Package).filter(models.Package.id == package_id).first()
        
        # Controlla se ci sono abbastanza ore rimanenti nel pacchetto
        if package.remaining_hours < lesson.duration:
            # Automatic handling of package overflow
            remaining_duration = lesson.duration - package.remaining_hours
            
            # Mark current package as completed
            package.remaining_hours = Decimal('0')
            package.status = "completed"
            db.commit()
            
            # Create a new package if needed
            new_package = models.Package(
                student_id=lesson.student_id,
                start_date=lesson.lesson_date,
                total_hours=remaining_duration,  # Starting with just the overflow hours
                package_cost=Decimal('0'),  # This should be updated later
                status="in_progress",
                is_paid=False,
                remaining_hours=Decimal('0')  # Will be set to 0 after this lesson
            )
            
            db.add(new_package)
            db.commit()
            db.refresh(new_package)
            
            # Now we need to create two lessons: one for the remaining hours of the old package
            # and one for the overflow hours in the new package
            
            # First lesson (old package)
            old_lesson = models.Lesson(
                professor_id=lesson.professor_id,
                student_id=lesson.student_id,
                lesson_date=lesson.lesson_date,
                duration=package.remaining_hours,
                is_package=True,
                package_id=package.id,
                hourly_rate=lesson.hourly_rate,
                total_payment=package.remaining_hours * lesson.hourly_rate
            )
            
            db.add(old_lesson)
            
            # Second lesson (new package)
            new_lesson = models.Lesson(
                professor_id=lesson.professor_id,
                student_id=lesson.student_id,
                lesson_date=lesson.lesson_date,
                duration=remaining_duration,
                is_package=True,
                package_id=new_package.id,
                hourly_rate=lesson.hourly_rate,
                total_payment=remaining_duration * lesson.hourly_rate
            )
            
            db.add(new_lesson)
            db.commit()
            db.refresh(old_lesson)
            
            return old_lesson  # Return the first lesson as the response
        else:
            # Normal case: enough hours in package
            package.remaining_hours -= lesson.duration
            
            # If no hours remain, mark package as completed
            if package.remaining_hours <= 0:
                package.status = "completed"
            
            # Crea la lezione normale
            db_lesson = models.Lesson(
                professor_id=lesson.professor_id,
                student_id=lesson.student_id,
                lesson_date=lesson.lesson_date,
                duration=lesson.duration,
                is_package=True,
                package_id=package_id,
                hourly_rate=lesson.hourly_rate,
                total_payment=lesson.duration * lesson.hourly_rate
            )
            
            db.add(db_lesson)
            db.commit()
            db.refresh(db_lesson)
            return db_lesson
    else:
        # Lezione singola (non parte di un pacchetto)
        db_lesson = models.Lesson(
            professor_id=lesson.professor_id,
            student_id=lesson.student_id,
            lesson_date=lesson.lesson_date,
            duration=lesson.duration,
            is_package=False,
            hourly_rate=lesson.hourly_rate,
            total_payment=lesson.duration * lesson.hourly_rate
        )
        
        db.add(db_lesson)
        db.commit()
        db.refresh(db_lesson)
        return db_lesson

@router.get("/", response_model=List[models.LessonResponse])
def read_lessons(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    lessons = db.query(models.Lesson).offset(skip).limit(limit).all()
    return lessons

@router.get("/{lesson_id}", response_model=models.LessonResponse)
def read_lesson(lesson_id: int, db: Session = Depends(get_db)):
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if db_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return db_lesson

@router.get("/professor/{professor_id}", response_model=List[models.LessonResponse])
def read_professor_lessons(professor_id: int, db: Session = Depends(get_db)):
    # Controlla se il professore esiste
    professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Ottieni tutte le lezioni del professore
    lessons = db.query(models.Lesson).filter(models.Lesson.professor_id == professor_id).all()
    return lessons

@router.get("/student/{student_id}", response_model=List[models.LessonResponse])
def read_student_lessons(student_id: int, db: Session = Depends(get_db)):
    # Controlla se lo studente esiste
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Ottieni tutte le lezioni dello studente
    lessons = db.query(models.Lesson).filter(models.Lesson.student_id == student_id).all()
    return lessons

@router.put("/{lesson_id}", response_model=models.LessonResponse)
def update_lesson(lesson_id: int, lesson: models.LessonUpdate, db: Session = Depends(get_db)):
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if db_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Se la durata cambia e la lezione fa parte di un pacchetto, occorre aggiornare anche il pacchetto
    if lesson.duration is not None and db_lesson.is_package and db_lesson.package_id:
        old_duration = db_lesson.duration
        duration_diff = lesson.duration - old_duration
        
        package = db.query(models.Package).filter(models.Package.id == db_lesson.package_id).first()
        if package:
            # Aggiorna le ore rimanenti
            package.remaining_hours -= duration_diff
            
            # Se le ore rimanenti sono 0 o meno, imposta lo stato del pacchetto a "completed"
            if package.remaining_hours <= 0:
                package.status = "completed"
            
            db.commit()
    
    # Aggiorna i campi della lezione
    update_data = lesson.dict(exclude_unset=True)
    
    # Ricalcola il pagamento totale se necessario
    if "duration" in update_data or "hourly_rate" in update_data:
        new_duration = update_data.get("duration", db_lesson.duration)
        new_hourly_rate = update_data.get("hourly_rate", db_lesson.hourly_rate)
        update_data["total_payment"] = new_duration * new_hourly_rate
    
    for key, value in update_data.items():
        setattr(db_lesson, key, value)
    
    db.commit()
    db.refresh(db_lesson)
    return db_lesson

@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if db_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Se la lezione fa parte di un pacchetto, aggiorna le ore rimanenti
    if db_lesson.is_package and db_lesson.package_id:
        package = db.query(models.Package).filter(models.Package.id == db_lesson.package_id).first()
        if package:
            package.remaining_hours += db_lesson.duration
            
            # Se il pacchetto era completato, riattivalo
            if package.status == "completed":
                package.status = "in_progress"
            
            db.commit()
    
    db.delete(db_lesson)
    db.commit()
    return None