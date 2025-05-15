# main.py
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from fastapi.security import OAuth2PasswordRequestForm
from typing import Dict

from app import models, database
from app.database import get_db
from app.routes import professors, students, packages, lessons, activity
from app.auth import (
    authenticate_professor, 
    create_access_token, 
    ACCESS_TOKEN_EXPIRE_MINUTES, 
    get_current_professor
)
from app.utils import verify_password, get_password_hash
from app.auth import get_current_admin

# Creazione dell'app FastAPI
app = FastAPI(
    title="School Management API",
    description="API per la gestione di una scuola di ripetizioni private",
    version="0.1.0"
)
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Crea tabelle database
models.Base.metadata.create_all(bind=database.engine)

# Endpoint per ottenere un token di accesso
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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

# Include i router delle varie entità
app.include_router(professors.router)
app.include_router(students.router)
app.include_router(packages.router)
app.include_router(lessons.router)
app.include_router(activity.router)

# Endpoint per le statistiche
@app.get("/stats/finance", tags=["statistics"])
def get_finance_stats(db: Session = Depends(get_db)):
    # Entrate dai pacchetti pagati
    packages_income = db.query(models.Package).filter(
        models.Package.is_paid == True
    ).with_entities(
        db.func.sum(models.Package.package_cost)
    ).scalar() or 0
    
    # Entrate dalle lezioni singole
    single_lessons_income = db.query(models.Lesson).filter(
        models.Lesson.is_package == False
    ).with_entities(
        db.func.sum(models.Lesson.total_payment)
    ).scalar() or 0
    
    # Uscite (pagamenti ai professori)
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
    
    # Studenti più attivi
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

@app.get("/stats/professors", tags=["statistics"])
def get_professor_stats(db: Session = Depends(get_db)):
    # Numero totale di professori
    total_professors = db.query(models.Professor).count()
    
    # Professori più attivi
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

# Endpoint per gestione password
@app.post("/change-password", tags=["auth"])
async def change_password(
    change_data: Dict[str, str], 
    db: Session = Depends(get_db)
):
    username = change_data.get("username")
    old_password = change_data.get("old_password")
    new_password = change_data.get("new_password")
    
    if not all([username, old_password, new_password]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, password attuale e nuova password sono richiesti"
        )
    
    professor = db.query(models.Professor).filter(models.Professor.username == username).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utente non trovato"
        )
    
    if not verify_password(old_password, professor.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password attuale non corretta"
        )
    
    professor.password = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password aggiornata con successo"}

@app.post("/admin-reset-password")
async def admin_reset_password(
    reset_data: dict, 
    db: Session = Depends(get_db),
    current_user: models.Professor = Depends(get_current_admin)
):
    username = reset_data.get("username")
    new_password = reset_data.get("new_password")
    
    if not username or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username e nuova password sono richiesti"
        )
    
    professor = db.query(models.Professor).filter(models.Professor.username == username).first()
    if not professor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utente con username {username} non trovato"
        )
    
    if len(new_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nuova password deve essere di almeno 4 caratteri"
        )
    
    professor.password = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Password resettata con successo"}