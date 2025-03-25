# School Management App

Applicazione web per la gestione di una scuola di ripetizioni private, con funzionalità per professori, pacchetti di lezioni e studenti.

## Struttura del Progetto

Il progetto è organizzato in due parti principali:

- **Backend**: API REST con FastAPI in Python, connessa a un database PostgreSQL
- **Frontend**: Applicazione web con React e Material UI

## Funzionalità

- **Autenticazione**: Login per professori con livelli di accesso (admin/normale)
- **Gestione Professori**: Riservato agli admin, permette la gestione completa dei professori
- **Gestione Studenti**: Creazione, visualizzazione e modifica dei dati degli studenti
- **Gestione Pacchetti**: Creazione e gestione di pacchetti di lezioni per gli studenti
- **Gestione Lezioni**: Registrazione di lezioni singole o associate a pacchetti
- **Dashboard**: Visualizzazione di statistiche e informazioni rilevanti
- **Reportistica Finanziaria**: Per monitorare entrate, uscite e guadagni netti

## Tecnologie Utilizzate

### Backend
- Python 3.9+
- FastAPI
- SQLAlchemy (ORM)
- PostgreSQL
- JWT per l'autenticazione

### Frontend
- React 18
- React Router per la navigazione
- Material UI per i componenti dell'interfaccia
- Formik e Yup per la gestione e validazione dei form
- Recharts per la visualizzazione dei dati
- Axios per le chiamate API

## Prerequisiti

- Python 3.9+
- Node.js 16+
- PostgreSQL 13+

## Installazione e Configurazione

### Backend

1. Clona il repository
2. Crea e attiva un ambiente virtuale
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

3. Installa le dipendenze
```bash
cd backend
pip install -r requirements.txt
```

4. Configura il database PostgreSQL modificando il file `database.py`

5. Avvia il server di sviluppo
```bash
uvicorn app.main:app --reload
```

### Frontend

1. Installa le dipendenze
```bash
cd frontend
npm install
```

2. Avvia il server di sviluppo
```bash
npm start
```

## Struttura del Database

Il database è relazionale (PostgreSQL) con le seguenti tabelle:

- **professors**: Dati dei professori e credenziali di accesso
- **students**: Anagrafica degli studenti
- **packages**: Pacchetti di lezioni acquistati dagli studenti
- **lessons**: Singole lezioni registrate

## Modello di Sicurezza

- **JWT**: Per l'autenticazione e la gestione delle sessioni
- **Ruoli**: Admin hanno accesso completo, professori standard hanno accesso limitato
- **Password**: Le password sono memorizzate come hash sicuri
- **CORS**: Configurato per consentire solo richieste dall'applicazione frontend

## Funzionalità Principali

### Per gli Admin
- Gestione completa dei professori
- Visualizzazione di tutti gli studenti e pacchetti
- Dashboard con statistiche finanziarie
- Reportistica completa

### Per i Professori Standard
- Gestione delle proprie lezioni
- Visualizzazione dei propri studenti
- Creazione di nuovi studenti e pacchetti
- Dashboard con statistiche limitate

## Sviluppi Futuri

- App mobile (React Native)
- Sistema di notifiche (email, SMS)
- Calendario integrato
- Pagamenti online
- Reportistica avanzata
