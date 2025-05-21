# migration.py
# Questo script può essere eseguito singolarmente o integrato nell'applicazione

from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal, engine
from decimal import Decimal

def migrate_existing_payments():
    """
    Migra i pagamenti esistenti nel nuovo sistema.
    Per ogni pacchetto pagato, crea un record di pagamento.
    """
    db = SessionLocal()
    try:
        # Verifica che la tabella package_payments esista
        tables = [t.name for t in models.Base.metadata.sorted_tables]
        if "package_payments" not in tables:
            print("La tabella package_payments non esiste ancora. Eseguire prima le migrazioni del database.")
            return
        
        # Trova tutti i pacchetti pagati che non hanno pagamenti associati
        paid_packages = db.query(models.Package).filter(
            models.Package.is_paid == True
        ).all()
        
        migrate_count = 0
        for package in paid_packages:
            # Controlla se ha già dei pagamenti
            payments = db.query(models.PackagePayment).filter(
                models.PackagePayment.package_id == package.id
            ).count()
            
            if payments == 0:
                # Crea un record di pagamento per l'intero importo
                payment = models.PackagePayment(
                    package_id=package.id,
                    amount=package.package_cost,
                    payment_date=package.payment_date or package.start_date,  # Usa la data di pagamento o la data di inizio come fallback
                    notes="Pagamento migrato dal sistema precedente"
                )
                db.add(payment)
                
                # Aggiorna il totale pagato
                package.total_paid = package.package_cost
                
                migrate_count += 1
        
        db.commit()
        print(f"Migrati {migrate_count} pacchetti al nuovo sistema di pagamenti")
    except Exception as e:
        db.rollback()
        print(f"Errore durante la migrazione: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Crea le tabelle se non esistono
    models.Base.metadata.create_all(bind=engine)
    # Esegui la migrazione
    migrate_existing_payments()