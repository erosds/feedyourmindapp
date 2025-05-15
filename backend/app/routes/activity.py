# routes/activity.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Dict, Any
from datetime import datetime, timedelta

from .. import models
from ..database import get_db
from ..auth import get_current_admin

router = APIRouter(
    prefix="/activities",
    tags=["activities"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[models.ActivityLogResponse])
def get_all_activities(
    skip: int = 0, 
    limit: int = 100, 
    days: int = 30, 
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene tutte le attività, filtrate per periodo (default: ultimi 30 giorni).
    Solo gli amministratori possono accedere a questa risorsa.
    """
    # Calcola la data di inizio per il filtro
    start_date = datetime.now() - timedelta(days=days)
    
    # Ottieni le attività ordinate per timestamp decrescente
    activities = db.query(models.ActivityLog).filter(
        models.ActivityLog.timestamp >= start_date
    ).order_by(
        desc(models.ActivityLog.timestamp)
    ).offset(skip).limit(limit).all()
    
    return activities

@router.get("/users", response_model=List[models.UserActivitySummary])
def get_user_activities(
    limit_per_user: int = 5, 
    days: int = 30, 
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene un riepilogo delle attività aggregato per utente.
    Solo gli amministratori possono accedere a questa risorsa.
    """
    # Calcola la data di inizio per il filtro
    start_date = datetime.now() - timedelta(days=days)
    
    # Ottieni tutti i professori
    professors = db.query(models.Professor).all()
    
    result = []
    for professor in professors:
        # Ottieni il conteggio delle attività per questo professore
        activities_count = db.query(func.count(models.ActivityLog.id)).filter(
            models.ActivityLog.professor_id == professor.id,
            models.ActivityLog.timestamp >= start_date
        ).scalar() or 0
        
        # Ottieni le attività recenti per questo professore
        recent_activities = db.query(models.ActivityLog).filter(
            models.ActivityLog.professor_id == professor.id,
            models.ActivityLog.timestamp >= start_date
        ).order_by(
            desc(models.ActivityLog.timestamp)
        ).limit(limit_per_user).all()
        
        # Ottieni l'ultima attività (se presente)
        last_activity = recent_activities[0] if recent_activities else None
        
        # Aggiungi al risultato
        result.append({
            "professor_id": professor.id,
            "professor_name": f"{professor.first_name} {professor.last_name}",
            "last_activity_time": last_activity.timestamp if last_activity else None,
            "activities_count": activities_count,
            "recent_activities": recent_activities
        })
    
    # Ordina il risultato per conteggio attività (decrescente)
    result.sort(key=lambda x: x["activities_count"], reverse=True)
    
    return result

@router.get("/user/{professor_id}", response_model=List[models.ActivityLogResponse])
def get_professor_activities(
    professor_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    days: int = 30, 
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene tutte le attività di un professore specifico.
    Solo gli amministratori possono accedere a questa risorsa.
    """
    # Verifica che il professore esista
    professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if professor is None:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Calcola la data di inizio per il filtro
    start_date = datetime.now() - timedelta(days=days)
    
    # Ottieni le attività del professore
    activities = db.query(models.ActivityLog).filter(
        models.ActivityLog.professor_id == professor_id,
        models.ActivityLog.timestamp >= start_date
    ).order_by(
        desc(models.ActivityLog.timestamp)
    ).offset(skip).limit(limit).all()
    
    return activities

# Funzione helper per registrare le attività
def log_activity(
    db: Session, 
    professor_id: int, 
    action_type: str,
    entity_type: str,
    entity_id: int,
    description: str
):
    """
    Registra un'attività nel database.
    
    Args:
        db: Sessione del database
        professor_id: ID del professore che ha eseguito l'azione
        action_type: Tipo di azione (create, update, delete)
        entity_type: Tipo di entità (lesson, package, student, professor)
        entity_id: ID dell'entità
        description: Descrizione dell'attività
    """
    activity_log = models.ActivityLog(
        professor_id=professor_id,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description
    )
    
    db.add(activity_log)
    db.commit()
    
    return activity_log