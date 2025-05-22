// src/pages/faq/sections/FAQSection3.jsx
import React from 'react';
import { Typography, Link, Box, Chip, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

function FAQSection3({ searchQuery = '' }) {
  const items = [
    {
      question: 'Come creo un nuovo pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Vai alla sezione <Link component={RouterLink} to="/packages">Pacchetti</Link> e clicca su <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '130px' }}
              >
                Nuovo Pacchetto
              </Button> in alto a destra. Basta inserire poche informazioni necessarie: <b>studente/i</b>, <b>data di inizio</b>, <b>ore totali</b>. Se non conosci queste informazioni, chiedile ad un admin oppure allo studente stesso.
          </Typography>
          <Typography paragraph>    
              Se vedi che non c'è nessun pacchetto per lo studente di cui vuoi inserire una lezione, <b>non esitare a crearlo</b>! Creare i pacchetti non è compito solo degli admin, ma soprattutto <b>tuo</b>.
          </Typography>
          <Typography paragraph>    
              Di default un nuovo pacchetto viene inserito come non pagato. Se vuoi inserire un <b>pacchetto aperto</b>, inserisci 30 come ore totali.
          </Typography>
        </>
      )
    },
    {
      question: 'Posso creare pacchetti condivisi tra più studenti?',
      answer: (
        <Typography paragraph>
          Sì, il sistema permette di inserire più studenti associati allo stesso pacchetto per un massimo di <b>3 studenti</b>. Questo è utile quando più studenti condividono lo stesso pacchetto, ad esempio fratelli/sorelle.
        </Typography>
      )
    },
    {
      question: 'Qual è la differenza tra gli stati di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            I pacchetti possono trovarsi in diversi stati, indicati da colori diversi:
          </Typography>

          <Box sx={{ mb: 3, ml: 1, mr: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="In corso"
                  color="primary"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto <b>attivo</b>, quindi siamo entro la data di scadenza.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="In scadenza"
                  color="warning"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto <b>attivo</b> che scadrà al termine della settimana corrente.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', mb: 2 }}>
              <Box>
                <Chip
                  label="Scaduto"
                  color="error"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto con <b>data di scadenza superata</b>, ma con ore ancora disponibili e/o non ancora pagato.
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center' }}>
              <Box>
                <Chip
                  label="Completato"
                  color="default"
                  size="small"
                />
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'justify' }}>
                Pacchetto <b>terminato</b>: scaduto, pagato e senza ore rimanenti.
              </Typography>
            </Box>
          </Box>
        </>
      )
    },
    {
      question: 'Come faccio a sapere quante ore rimangono in un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Le ore rimanenti, insieme a tutte le altre informazioni, sono visualizzate sia nella <b>lista dei pacchetti</b> che nella pagina di <b>dettaglio pacchetto</b>. Troverai anche dei cerchietti di avanzamento che mostrano visivamente il completamento settimana per settimana.
          </Typography>
          <Typography>
            Per vedere il dettaglio completo, vai alla <Link component={RouterLink} to="/packages">lista pacchetti</Link> e
            clicca su un pacchetto specifico per visualizzare tutte le informazioni sulle ore utilizzate e rimanenti.
          </Typography>
        </>
      )
    },
    {
      question: 'Quando scade un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            La scadenza di un pacchetto è automaticamente calcolata come <b>4 settimane (28 giorni)</b> dopo la
            data di inizio. Il sistema calcola il lunedì della settimana corrente e aggiunge 4 settimane.
            Questo significa che il pacchetto scade sempre di domenica, alla fine della quarta settimana.
          </Typography>
          <Typography>
            <strong>Nota:</strong> sarebbe meglio far iniziare un pacchetto sempre di lunedì, anche se la prima
            lezione di quel pacchetto non cade di lunedì.
          </Typography>
        </>
      )
    },
    {
      question: 'Posso estendere la scadenza di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Se un pacchetto è <b>scaduto</b> ma ha ancora <b>ore disponibili</b>, puoi estenderlo dalla
            pagina di dettaglio del pacchetto cliccando sul pulsante <Button
              variant="outlined"
              color="secondary"
              size="small"
              sx={{ fontSize: '0.75rem', py: 0, ml: 0.5, mr: 0.5, minWidth: '130px' }}
            >
              Estendi scadenza +1
            </Button> in alto a destra.
          </Typography>
          <Typography>
            Questa funzionalità è particolarmente utile quando uno studente ha saltato alcune lezioni
            e ha ancora ore disponibili nel pacchetto che altrimenti andrebbero perse. 
            </Typography>
          <Typography paragraph>
            <b>Attenzione</b>: la funzionalità di estensione
            diventa utilizzabile solo se il pacchetto sta per scadere ma ha ore rimanenti.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso vedere tutte le lezioni associate ad un pacchetto?',
      answer: (
        <Typography paragraph>
          Vai alla <b>pagina dettaglio</b> del pacchetto cliccandoci sopra una volta individuato nella lista dei pacchetti.
          Nella parte inferiore della pagina troverai una <b>tabella</b> con tutte le lezioni associate a quel pacchetto,
          con informazioni su studente, professore, data e durata. Inoltre, è disponibile un <b>calendario</b>
          mensile che mostra visivamente la distribuzione delle lezioni.
        </Typography>
      )
    },
    
  ];

  // If there's a search query, filter the items
  // Modifica la funzione di filtro in ogni sezione
  const filteredItems = searchQuery
    ? items.filter(item => {
      // Controlla che la domanda contenga la query di ricerca
      if (item.question.toLowerCase().includes(searchQuery.toLowerCase())) {
        return true;
      }

      // Controlla il contenuto della risposta
      const { children } = item.answer.props;

      // Handle diversi tipi di children
      if (Array.isArray(children)) {
        // Se children è un array, usa .some
        return children.some(child => {
          if (typeof child === 'string') {
            return child.toLowerCase().includes(searchQuery.toLowerCase());
          }
          if (child && typeof child === 'object' && child.props) {
            const childText = child.props.children;
            if (typeof childText === 'string') {
              return childText.toLowerCase().includes(searchQuery.toLowerCase());
            }
          }
          return false;
        });
      } else if (typeof children === 'string') {
        // Se children è una stringa, cerca direttamente
        return children.toLowerCase().includes(searchQuery.toLowerCase());
      }

      // Nessuna corrispondenza trovata
      return false;
    })
    : items;

  if (searchQuery && filteredItems.length === 0) {
    return null;
  }

  return (
    <>
      {searchQuery && (
        <Typography variant="h6" gutterBottom>
          Gestione Pacchetti
        </Typography>
      )}

      {filteredItems.map((item, index) => (
        <FAQItem key={index} question={item.question} answer={item.answer} />
      ))}
    </>
  );
}

export default FAQSection3;