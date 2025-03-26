# create_admin.py
import sys
import os
from dotenv import load_dotenv

# Aggiunge il path del progetto al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Carica variabili d'ambiente
load_dotenv()

from app import models
from app.database import SessionLocal, engine
from app.utils import get_password_hash

# Crea le tabelle se non esistono
models.Base.metadata.create_all(bind=engine)

def create_admin():
    db = SessionLocal()
    try:
        # Controlla se esiste già un admin
        admin = db.query(models.Professor).filter(models.Professor.username == "admin").first()
        if admin:
            print("L'utente admin esiste già")
            return
        
        # Crea il nuovo admin
        admin = models.Professor(
            first_name="Admin",
            last_name="User",
            username="admin",
            password=get_password_hash("password123"),
            is_admin=True
        )
        db.add(admin)
        db.commit()
        print("Admin creato con successo")
    except Exception as e:
        print(f"Errore durante la creazione dell'admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()