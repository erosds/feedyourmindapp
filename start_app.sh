#!/bin/bash

cleanup() {
    echo "Fermando i processi..."
    kill $(jobs -p)
    wait
    exit 0
}

trap cleanup SIGINT SIGTERM

# Avvia backend FastAPI
cd /Users/erosdesimone/VSProject/feedyourmind/backend
source env/bin/activate
echo "Avvio del backend su http://localhost:8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# Avvia frontend React
cd /Users/erosdesimone/VSProject/feedyourmind/frontend
echo "Avvio del frontend su http://localhost:3000..."
npm start -- --host 0.0.0.0 &

# Attendi che i servizi siano pronti
sleep 5

# Esponi Nginx con ngrok (porta 80)
echo "Avvio tunnel ngrok verso Nginx..."
ngrok http 80 --host-header=rewrite

# Attendi l'interruzione
wait