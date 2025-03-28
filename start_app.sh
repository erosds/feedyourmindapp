#!/bin/bash

cleanup() {
    echo "Fermando i processi..."
    kill $(jobs -p)
    wait
    exit 0
}

trap cleanup SIGINT SIGTERM

# Avvia backend FastAPI
cd /Users/erosdesimone/VSProject/feedyourmindapp/backend
source venv/bin/activate
echo "Avvio del backend su http://localhost:8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Avvia frontend React
cd /Users/erosdesimone/VSProject/feedyourmindapp/frontend
echo "Avvio del frontend su http://localhost:3000..."
DANGEROUSLY_DISABLE_HOST_CHECK=true npm start -- --host 0.0.0.0 &

# Attendi l'interruzione
wait