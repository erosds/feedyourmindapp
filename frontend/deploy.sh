#!/bin/bash

# Nome script: deploy.sh
# Uso: ./deploy.sh

# Colori per output
GREEN='\033[0;32m'
NC='\033[0m' # Nessun colore

# Configurazione
REMOTE_USER=root
REMOTE_HOST=feed-your-mind.it
REMOTE_DIR=/var/www/feed-your-mind/public_html

echo -e "${GREEN}➡️  Costruzione del progetto React...${NC}"
npm run build || { echo "❌ Build fallita."; exit 1; }

echo -e "${GREEN}➡️  Deploy dei file sul server...${NC}"
scp -r build/* $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR || { echo "❌ SCP fallito."; exit 1; }

echo -e "${GREEN}➡️  Riavvio di nginx sul server...${NC}"
ssh $REMOTE_USER@$REMOTE_HOST "systemctl restart nginx" || { echo "❌ Riavvio nginx fallito."; exit 1; }

echo -e "${GREEN}✅ Deploy completato con successo.${NC}"
