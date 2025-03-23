# main.py
import os
from dotenv import load_dotenv

# Carica le variabili d'ambiente dal file .env
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm

from app import models, database
from app.database import get_db
from app.routes import professors, students, packages, lessons
from app.auth import (
    authenticate_professor, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES, 
    get_current_professor
)

# Creazione dell'istanza dell'applicazione FastAPI
app = FastAPI(
    title="School Management API",
    description="API per la gestione di una scuola di ripetizioni private",
    version="0.1.0"
)

# Configurazione CORS aggiornata per risolvere problemi di accesso cross-origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Consenti tutte le origini per il test
    allow_credentials=True,
    allow_methods=["*"],  # Consenti tutti i metodi HTTP
    allow_headers=["*"],  # Consenti tutte le intestazioni
    expose_headers=["*"],  # Esponi tutte le intestazioni nella risposta
)

# Crea tutte le tabelle nel database
models.Base.metadata.create_all(bind=database.engine)

# Endpoint per ottenere un token di accesso
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        professor = authenticate_professor(db, form_data.username, form_data.password)
        if not professor:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username o password non corretti",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": professor.username, "is_admin": professor.is_admin},
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        # Log l'errore specifico
        print(f"ERRORE IN TOKEN ENDPOINT: {str(e)}")
        # Rilancia l'eccezione per FastAPI
        raise

# Endpoint per ottenere i dati dell'utente corrente
@app.get("/users/me", response_model=models.ProfessorResponse)
async def read_users_me(current_user: models.Professor = Depends(get_current_professor)):
    return current_user

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Benvenuto nella School Management API"}

# Health check
@app.get("/health")
def health_check():
    return {"status": "ok"}

# Includi i router delle varie entità
app.include_router(professors.router)
app.include_router(students.router)
app.include_router(packages.router)
app.include_router(lessons.router)

# Endpoint per le statistiche finanziarie (solo per admin)
@app.get("/stats/finance", tags=["statistics"])
def get_finance_stats(db: Session = Depends(get_db)):
    # Totale entrate dai pacchetti pagati
    packages_income = db.query(models.Package).filter(
        models.Package.is_paid == True
    ).with_entities(
        db.func.sum(models.Package.package_cost)
    ).scalar() or 0
    
    # Totale entrate dalle lezioni singole
    single_lessons_income = db.query(models.Lesson).filter(
        models.Lesson.is_package == False
    ).with_entities(
        db.func.sum(models.Lesson.total_payment)
    ).scalar() or 0
    
    # Totale uscite (pagamenti ai professori)
    expenses = db.query(models.Lesson).with_entities(
        db.func.sum(models.Lesson.total_payment)
    ).scalar() or 0
    
    # Calcolo del netto
    total_income = packages_income + single_lessons_income
    net_profit = total_income - expenses
    
    return {
        "total_income": total_income,
        "packages_income": packages_income,
        "single_lessons_income": single_lessons_income,
        "expenses": expenses,
        "net_profit": net_profit
    }

# Endpoint per le statistiche degli studenti
@app.get("/stats/students", tags=["statistics"])
def get_student_stats(db: Session = Depends(get_db)):
    # Numero totale di studenti
    total_students = db.query(models.Student).count()
    
    # Numero di studenti con pacchetti attivi
    active_students = db.query(models.Package).filter(
        models.Package.status == "in_progress"
    ).with_entities(
        models.Package.student_id
    ).distinct().count()
    
    # Studenti più attivi (per numero di lezioni)
    top_students = db.query(
        models.Student.id,
        models.Student.first_name,
        models.Student.last_name,
        db.func.count(models.Lesson.id).label('lesson_count')
    ).join(
        models.Lesson, models.Student.id == models.Lesson.student_id
    ).group_by(
        models.Student.id
    ).order_by(
        db.func.count(models.Lesson.id).desc()
    ).limit(5).all()
    
    return {
        "total_students": total_students,
        "active_students": active_students,
        "top_students": [
            {
                "id": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "lesson_count": student.lesson_count
            } for student in top_students
        ]
    }

# Endpoint per le statistiche dei professori
@app.get("/stats/professors", tags=["statistics"])
def get_professor_stats(db: Session = Depends(get_db)):
    # Numero totale di professori
    total_professors = db.query(models.Professor).count()
    
    # Professori più attivi (per numero di lezioni)
    top_professors = db.query(
        models.Professor.id,
        models.Professor.first_name,
        models.Professor.last_name,
        db.func.count(models.Lesson.id).label('lesson_count'),
        db.func.sum(models.Lesson.total_payment).label('total_earnings')
    ).join(
        models.Lesson, models.Professor.id == models.Lesson.professor_id
    ).group_by(
        models.Professor.id
    ).order_by(
        db.func.count(models.Lesson.id).desc()
    ).limit(5).all()
    
    return {
        "total_professors": total_professors,
        "top_professors": [
            {
                "id": professor.id,
                "name": f"{professor.first_name} {professor.last_name}",
                "lesson_count": professor.lesson_count,
                "total_earnings": professor.total_earnings
            } for professor in top_professors
        ]
    }