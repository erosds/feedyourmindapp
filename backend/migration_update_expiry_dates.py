# migration_update_expiry_dates.py
import os
from datetime import date, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Carica le variabili d'ambiente (se disponibili)
load_dotenv()

# Configurazione database - MODIFICA QUESTI VALORI
DB_USER = "postgres"         # Inserisci il tuo nome utente 
DB_PASSWORD = "4422"     # Inserisci la tua password
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "school_management"

# URL di connessione
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Importa i modelli dopo aver configurato l'engine
from app import models

def calculate_new_expiry_date(start_date: date) -> date:
    """Calcola la nuova data di scadenza (domenica della 4a settimana)"""
    weekday = start_date.weekday()
    monday = start_date - timedelta(days=weekday)
    expiry_date = monday + timedelta(days=27)  # 27 = domenica della 4a settimana
    return expiry_date

def migrate_package_expiry_dates():
    """Aggiorna tutti i pacchetti esistenti alla nuova data di scadenza"""
    db = SessionLocal()
    try:
        # Ottieni tutti i pacchetti
        packages = db.query(models.Package).all()
        
        updated_count = 0
        for package in packages:
            # Calcola nuova data di scadenza
            new_expiry_date = calculate_new_expiry_date(package.start_date)
            
            # Aggiorna il pacchetto
            package.expiry_date = new_expiry_date
            updated_count += 1
        
        # Salva le modifiche
        db.commit()
        print(f"Aggiornamento completato: {updated_count} pacchetti aggiornati")
    except Exception as e:
        db.rollback()
        print(f"Errore durante l'aggiornamento: {e}")
    finally:
        db.close()

def update_package_status_after_migration():
    """Aggiorna lo stato dei pacchetti dopo la modifica delle date di scadenza"""
    # Importa la funzione ma fornisci la tua sessione db
    from app.routes.packages import update_package_status
    
    db = SessionLocal()
    try:
        packages = db.query(models.Package).all()
        
        status_count = 0
        for package in packages:
            update_package_status(db, package.id, commit=False)
            status_count += 1
        
        db.commit()
        print(f"Stato aggiornato per {status_count} pacchetti")
    except Exception as e:
        db.rollback()
        print(f"Errore durante l'aggiornamento dello stato: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_package_expiry_dates()
    update_package_status_after_migration()