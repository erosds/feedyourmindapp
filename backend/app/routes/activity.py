# routes/activity.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from typing import List, Dict, Any, Optional
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
    action_type: Optional[str] = Query(None, description="Filter by action type (create, update, delete)"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (lesson, package, student, professor)"),
    professor_id: Optional[int] = Query(None, description="Filter by professor ID"),
    search: Optional[str] = Query(None, description="Search in description"),
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene tutte le attività con filtri mirati per performance ottimali.
    """
    # Calcola la data di inizio per il filtro
    start_date = datetime.now() - timedelta(days=days)
    
    # Costruisci la query base
    query = db.query(models.ActivityLog).filter(
        models.ActivityLog.timestamp >= start_date
    )
    
    # Applica filtri in modo efficiente
    if professor_id:
        query = query.filter(models.ActivityLog.professor_id == professor_id)
    
    if action_type:
        query = query.filter(models.ActivityLog.action_type == action_type)
    
    if entity_type:
        query = query.filter(models.ActivityLog.entity_type == entity_type)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            models.ActivityLog.description.ilike(search_term)
        )
    
    # Ordina e applica paginazione
    activities = query.order_by(
        desc(models.ActivityLog.timestamp)
    ).offset(skip).limit(limit).all()
    
    return activities

@router.get("/users", response_model=List[models.UserActivitySummary])
def get_user_activities(
    days: int = 30,
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    search: Optional[str] = Query(None, description="Search in description or professor name"),
    search_type: Optional[str] = Query("all", description="Search scope: all, professor, description, entity"),
    limit_per_user: int = 50,
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene un riepilogo delle attività aggregato per utente con filtri efficienti.
    """
    # Calcola la data di inizio per il filtro
    start_date = datetime.now() - timedelta(days=days)
    
    # Query base per le attività filtrate
    activities_query = db.query(models.ActivityLog).filter(
        models.ActivityLog.timestamp >= start_date
    )
    
    # Applica filtri per tipo di azione ed entità
    if action_type:
        activities_query = activities_query.filter(models.ActivityLog.action_type == action_type)
    
    if entity_type:
        activities_query = activities_query.filter(models.ActivityLog.entity_type == entity_type)
    
    # Applica filtro di ricerca nella descrizione se specificato
    if search and search_type in ['all', 'description']:
        search_term = f"%{search.lower()}%"
        activities_query = activities_query.filter(
            models.ActivityLog.description.ilike(search_term)
        )
    
    # Ottieni tutti i professori
    professors_query = db.query(models.Professor)
    
    # Applica filtro di ricerca nel nome professore se specificato
    if search and search_type in ['all', 'professor']:
        search_term = f"%{search.lower()}%"
        professors_query = professors_query.filter(
            or_(
                models.Professor.first_name.ilike(search_term),
                models.Professor.last_name.ilike(search_term),
                func.concat(models.Professor.first_name, ' ', models.Professor.last_name).ilike(search_term)
            )
        )
    
    professors = professors_query.all()
    
    result = []
    for professor in professors:
        # Query specifica per questo professore
        professor_activities_query = activities_query.filter(
            models.ActivityLog.professor_id == professor.id
        )
        
        # Conta le attività filtrate per questo professore
        activities_count = professor_activities_query.count()
        
        # Se non ci sono attività dopo i filtri, salta questo professore
        if activities_count == 0:
            continue
        
        # Ottieni le attività recenti per questo professore
        recent_activities = professor_activities_query.order_by(
            desc(models.ActivityLog.timestamp)
        ).limit(limit_per_user).all()
        
        # Ottieni l'ultima attività
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
    limit: int = 1000,  # Aumentato per evitare paginazione complessa 
    days: int = 30,
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    search: Optional[str] = Query(None, description="Search in description"),
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene tutte le attività di un professore specifico con filtri efficienti.
    """
    # Verifica che il professore esista
    professor = db.query(models.Professor).filter(models.Professor.id == professor_id).first()
    if professor is None:
        raise HTTPException(status_code=404, detail="Professor not found")
    
    # Calcola la data di inizio per il filtro
    start_date = datetime.now() - timedelta(days=days)
    
    # Costruisci la query base
    query = db.query(models.ActivityLog).filter(
        and_(
            models.ActivityLog.professor_id == professor_id,
            models.ActivityLog.timestamp >= start_date
        )
    )
    
    # Applica filtri in modo efficiente
    if action_type:
        query = query.filter(models.ActivityLog.action_type == action_type)
    
    if entity_type:
        query = query.filter(models.ActivityLog.entity_type == entity_type)
    
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            models.ActivityLog.description.ilike(search_term)
        )
    
    # Ottieni le attività ordinate
    activities = query.order_by(
        desc(models.ActivityLog.timestamp)
    ).offset(skip).limit(limit).all()
    
    return activities

@router.get("/stats/summary")
def get_activity_stats_summary(
    days: int = 30,
    db: Session = Depends(get_db), 
    current_user: models.Professor = Depends(get_current_admin)
):
    """
    Ottiene statistiche riassuntive delle attività per il periodo specificato.
    """
    start_date = datetime.now() - timedelta(days=days)
    
    # Conta attività per tipo di azione
    action_stats = db.query(
        models.ActivityLog.action_type,
        func.count(models.ActivityLog.id).label('count')
    ).filter(
        models.ActivityLog.timestamp >= start_date
    ).group_by(models.ActivityLog.action_type).all()
    
    # Conta attività per tipo di entità
    entity_stats = db.query(
        models.ActivityLog.entity_type,
        func.count(models.ActivityLog.id).label('count')
    ).filter(
        models.ActivityLog.timestamp >= start_date
    ).group_by(models.ActivityLog.entity_type).all()
    
    # Professori più attivi
    top_professors = db.query(
        models.Professor.id,
        models.Professor.first_name,
        models.Professor.last_name,
        func.count(models.ActivityLog.id).label('activity_count')
    ).join(
        models.ActivityLog, models.Professor.id == models.ActivityLog.professor_id
    ).filter(
        models.ActivityLog.timestamp >= start_date
    ).group_by(
        models.Professor.id, models.Professor.first_name, models.Professor.last_name
    ).order_by(
        desc(func.count(models.ActivityLog.id))
    ).limit(10).all()
    
    return {
        "period_days": days,
        "total_activities": db.query(models.ActivityLog).filter(
            models.ActivityLog.timestamp >= start_date
        ).count(),
        "action_stats": [{"action_type": stat.action_type, "count": stat.count} for stat in action_stats],
        "entity_stats": [{"entity_type": stat.entity_type, "count": stat.count} for stat in entity_stats],
        "top_professors": [
            {
                "professor_id": prof.id,
                "professor_name": f"{prof.first_name} {prof.last_name}",
                "activity_count": prof.activity_count
            } 
            for prof in top_professors
        ]
    }

# Funzione helper per registrare le attività (mantieni uguale)
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