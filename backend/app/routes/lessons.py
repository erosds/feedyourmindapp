# routes/lessons.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from decimal import Decimal, InvalidOperation

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/lessons",
    tags=["lessons"],
    responses={404: {"description": "Not found"}},
)

# Eccezione personalizzata per gestire l'overflow delle ore
class PackageOverflowError(HTTPException):
    def __init__(self, detail: Dict[str, Any]):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT, 
            detail=detail
        )

@router.post("/", response_model=models.LessonResponse, status_code=status.HTTP_201_CREATED)
def create_lesson(
    lesson: models.LessonCreate, 
    db: Session = Depends(get_db)
):
    # Importa la funzione update_package_remaining_hours
    from app.routes.packages import update_package_remaining_hours
    
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
        
        # Recupera il pacchetto
        package = db.query(models.Package).filter(models.Package.id == package_id).first()
        
        # Calcola l'overflow delle ore
        overflow_hours = max(Decimal('0'), lesson.duration - package.remaining_hours)
        lesson_hours_in_package = lesson.duration - overflow_hours
        
        # Se ci sono ore in overflow, solleva un'eccezione con dettagli
        if overflow_hours > 0:
            raise PackageOverflowError({
                "message": "Lesson duration exceeds remaining package hours",
                "package_id": package.id,
                "remaining_hours": float(package.remaining_hours),
                "lesson_duration": float(lesson.duration),
                "lesson_hours_in_package": float(lesson_hours_in_package),
                "overflow_hours": float(overflow_hours)
            })
        
        # Crea la lezione normale
        db_lesson = models.Lesson(
            professor_id=lesson.professor_id,
            student_id=lesson.student_id,
            lesson_date=lesson.lesson_date,
            duration=lesson.duration,
            is_package=True,
            package_id=package_id,
            hourly_rate=lesson.hourly_rate,
            total_payment=lesson.duration * lesson.hourly_rate,
            is_paid=True  # Le lezioni da pacchetto sono considerate pagate
        )
        
        db.add(db_lesson)
        db.commit()
        db.refresh(db_lesson)
        
        # Aggiorna le ore rimanenti del pacchetto usando la nostra funzione helper
        update_package_remaining_hours(db, package_id)
        
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
            total_payment=lesson.duration * lesson.hourly_rate,
            is_paid=lesson.is_paid  # Usa il valore fornito dal frontend
        )
        
        db.add(db_lesson)
        db.commit()
        db.refresh(db_lesson)
        return db_lesson

@router.post("/handle-overflow", response_model=Dict[str, Any])
def handle_lesson_overflow(
    overflow_data: dict, 
    db: Session = Depends(get_db)
):
    """
    Endpoint per gestire l'overflow delle ore del pacchetto.
    
    Parametri possibili:
    - action: 'use_package' o 'create_new_package'
    - package_id: ID del pacchetto originale
    - lesson_data: dati originali della lezione
    - lesson_hours_in_package: ore da usare nel pacchetto originale
    - overflow_hours: ore in eccesso
    """
    # Importa la funzione update_package_remaining_hours
    from app.routes.packages import update_package_remaining_hours
    
    action = overflow_data.get('action')
    package_id = overflow_data.get('package_id')
    lesson_data = overflow_data.get('lesson_data')
    lesson_hours_in_package = overflow_data.get('lesson_hours_in_package')
    overflow_hours = overflow_data.get('overflow_hours')
    
    # Validazione input e debug
    print(f"Dati ricevuti per overflow: {overflow_data}")
    
    if not action:
        raise HTTPException(status_code=400, detail="Azione mancante")
    if not package_id:
        raise HTTPException(status_code=400, detail="ID pacchetto mancante")
    if not lesson_data:
        raise HTTPException(status_code=400, detail="Dati lezione mancanti")
    if lesson_hours_in_package is None:
        raise HTTPException(status_code=400, detail="Ore in pacchetto mancanti")
    if overflow_hours is None:
        raise HTTPException(status_code=400, detail="Ore in eccesso mancanti")
    
    # Converti i valori in Decimal per evitare problemi di precisione
    try:
        lesson_hours_in_package = Decimal(str(lesson_hours_in_package))
        overflow_hours = Decimal(str(overflow_hours))
        print(f"Valori convertiti: lesson_hours_in_package={lesson_hours_in_package}, overflow_hours={overflow_hours}")
    except (InvalidOperation, ValueError) as e:
        print(f"Errore nella conversione dei valori: {e}")
        raise HTTPException(status_code=400, detail=f"Valori numerici non validi: {str(e)}")
    
    # Recupera il pacchetto originale
    package = db.query(models.Package).filter(models.Package.id == package_id).first()
    if not package:
        raise HTTPException(status_code=404, detail="Pacchetto non trovato")
    
    # Crea un oggetto per la risposta
    response_data = {
        "action": action,
        "package_id": package_id,
        "lessons_created": []
    }
    
    if action == 'use_package':
        # 1. Crea lezione nel pacchetto originale con le ore disponibili
        lesson_in_package = models.Lesson(
            professor_id=lesson_data["professor_id"],
            student_id=lesson_data["student_id"],
            lesson_date=lesson_data["lesson_date"],
            duration=lesson_hours_in_package,
            is_package=True,
            package_id=package_id,
            hourly_rate=lesson_data["hourly_rate"],
            total_payment=lesson_hours_in_package * Decimal(str(lesson_data["hourly_rate"]))
        )
        
        # 2. Crea lezione singola per le ore rimanenti
        lesson_single = models.Lesson(
            professor_id=lesson_data["professor_id"],
            student_id=lesson_data["student_id"],
            lesson_date=lesson_data["lesson_date"],
            duration=overflow_hours,
            is_package=False,
            hourly_rate=lesson_data["hourly_rate"],
            total_payment=overflow_hours * Decimal(str(lesson_data["hourly_rate"]))
        )
        
        db.add(lesson_in_package)
        db.add(lesson_single)
        db.commit()
        db.refresh(lesson_in_package)
        db.refresh(lesson_single)
        
        # Aggiorna le ore rimanenti del pacchetto con la nostra funzione helper
        update_package_remaining_hours(db, package_id)
        package = db.query(models.Package).filter(models.Package.id == package_id).first()
        
        # Aggiungi informazioni alla risposta
        response_data["lessons_created"] = [
            {
                "id": lesson_in_package.id,
                "type": "package",
                "duration": float(lesson_in_package.duration),
                "total_payment": float(lesson_in_package.total_payment)
            },
            {
                "id": lesson_single.id,
                "type": "single",
                "duration": float(lesson_single.duration),
                "total_payment": float(lesson_single.total_payment)
            }
        ]
        response_data["remaining_hours"] = float(package.remaining_hours)
        response_data["package_status"] = package.status
        
    elif action == 'create_new_package':
        # Calcola il costo proporzionale per il nuovo pacchetto
        # Se il pacchetto originale costa X per Y ore, il nuovo costerà (X/Y)*Z per Z ore
        original_hourly_cost = package.package_cost / package.total_hours
        new_package_cost = original_hourly_cost * overflow_hours
        
        # Crea nuovo pacchetto per le ore rimanenti
        new_package = models.Package(
            student_id=package.student_id,
            start_date=lesson_data["lesson_date"],
            total_hours=overflow_hours,
            package_cost=new_package_cost,
            status="in_progress",
            is_paid=False,
            remaining_hours=overflow_hours
        )
        db.add(new_package)
        db.flush()  # Ottiene l'ID del nuovo pacchetto senza commit
        
        # Crea lezione nel pacchetto originale
        lesson_in_original_package = models.Lesson(
            professor_id=lesson_data["professor_id"],
            student_id=lesson_data["student_id"],
            lesson_date=lesson_data["lesson_date"],
            duration=lesson_hours_in_package,
            is_package=True,
            package_id=package_id,
            hourly_rate=lesson_data["hourly_rate"],
            total_payment=lesson_hours_in_package * Decimal(str(lesson_data["hourly_rate"]))
        )
        
        # Crea lezione nel nuovo pacchetto
        lesson_in_new_package = models.Lesson(
            professor_id=lesson_data["professor_id"],
            student_id=lesson_data["student_id"],
            lesson_date=lesson_data["lesson_date"],
            duration=overflow_hours,
            is_package=True,
            package_id=new_package.id,
            hourly_rate=lesson_data["hourly_rate"],
            total_payment=overflow_hours * Decimal(str(lesson_data["hourly_rate"]))
        )
        
        db.add(lesson_in_original_package)
        db.add(lesson_in_new_package)
        db.commit()
        db.refresh(new_package)
        db.refresh(lesson_in_original_package)
        db.refresh(lesson_in_new_package)
        
        # Aggiorna le ore rimanenti di entrambi i pacchetti con la nostra funzione helper
        update_package_remaining_hours(db, package_id)
        update_package_remaining_hours(db, new_package.id)
        
        # Aggiorna le referenze per la risposta
        package = db.query(models.Package).filter(models.Package.id == package_id).first()
        
        # Aggiungi informazioni alla risposta
        response_data["lessons_created"] = [
            {
                "id": lesson_in_original_package.id,
                "type": "package",
                "package_id": package_id,
                "duration": float(lesson_in_original_package.duration),
                "total_payment": float(lesson_in_original_package.total_payment)
            },
            {
                "id": lesson_in_new_package.id,
                "type": "package",
                "package_id": new_package.id,
                "duration": float(lesson_in_new_package.duration),
                "total_payment": float(lesson_in_new_package.total_payment)
            }
        ]
        response_data["new_package"] = {
            "id": new_package.id,
            "total_hours": float(new_package.total_hours),
            "package_cost": float(new_package.package_cost)
        }
        response_data["original_package"] = {
            "remaining_hours": float(package.remaining_hours),
            "status": package.status
        }
        
    else:
        raise HTTPException(status_code=400, detail="Azione non valida")
    
    return response_data

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
@router.put("/{lesson_id}", response_model=models.LessonResponse)
def update_lesson(lesson_id: int, lesson: models.LessonUpdate, db: Session = Depends(get_db)):
    """
    Aggiorna una lezione esistente. Se la lezione fa parte di un pacchetto, aggiorna anche le ore rimanenti del pacchetto.
    Gestisce correttamente la modifica della durata della lezione, anche per le lezioni di pacchetti.
    """
    # Importa la funzione update_package_remaining_hours
    from app.routes.packages import update_package_remaining_hours
    
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if db_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Salva i valori originali prima della modifica
    old_duration = db_lesson.duration
    old_is_package = db_lesson.is_package
    old_package_id = db_lesson.package_id
    
    # Aggiorna i campi della lezione
    update_data = lesson.dict(exclude_unset=True)
    
    # Ricalcola il pagamento totale se necessario
    if "duration" in update_data or "hourly_rate" in update_data:
        new_duration = update_data.get("duration", db_lesson.duration)
        new_hourly_rate = update_data.get("hourly_rate", db_lesson.hourly_rate)
        update_data["total_payment"] = new_duration * new_hourly_rate
    
    # Aggiorna i campi della lezione
    for key, value in update_data.items():
        setattr(db_lesson, key, value)
    
    # Controlla se la lezione sta cambiando tipo (da singola a pacchetto o viceversa)
    is_becoming_package = "is_package" in update_data and update_data["is_package"] and not old_is_package
    is_becoming_single = "is_package" in update_data and not update_data["is_package"] and old_is_package
    
    # Verifica se la lezione diventa parte di un pacchetto e se ci sono ore sufficienti
    if is_becoming_package and "package_id" in update_data:
        package = db.query(models.Package).filter(models.Package.id == update_data["package_id"]).first()
        if package and package.remaining_hours < db_lesson.duration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ore rimanenti nel pacchetto ({package.remaining_hours}) insufficienti per la durata della lezione ({db_lesson.duration})"
            )
    
    # Esegui il commit delle modifiche alla lezione
    db.commit()
    db.refresh(db_lesson)
    
    # Lista di pacchetti da aggiornare
    packages_to_update = set()
    
    # Caso 1: Se la lezione era parte di un pacchetto, aggiorna quel pacchetto
    if old_is_package and old_package_id:
        packages_to_update.add(old_package_id)
    
    # Caso 2: Se la lezione è ora parte di un pacchetto, aggiorna il nuovo pacchetto
    if db_lesson.is_package and db_lesson.package_id:
        packages_to_update.add(db_lesson.package_id)
    
    # Aggiorna tutti i pacchetti coinvolti
    for package_id in packages_to_update:
        update_package_remaining_hours(db, package_id)
    
    # Refresh della lezione per ottenere tutti i campi aggiornati
    db.refresh(db_lesson)
    return db_lesson

@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(lesson_id: int, db: Session = Depends(get_db)):
    # Importa la funzione update_package_remaining_hours
    from app.routes.packages import update_package_remaining_hours
    
    db_lesson = db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()
    if db_lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Salva l'ID del pacchetto se la lezione fa parte di un pacchetto
    package_id = None
    if db_lesson.is_package and db_lesson.package_id:
        package_id = db_lesson.package_id
    
    # Elimina la lezione
    db.delete(db_lesson)
    db.commit()
    
    # Se la lezione faceva parte di un pacchetto, aggiorna le ore rimanenti
    if package_id:
        update_package_remaining_hours(db, package_id)
    
    return None