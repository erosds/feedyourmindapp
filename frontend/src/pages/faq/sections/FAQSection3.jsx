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
            Vai alla sezione <Link component={RouterLink} to="/packages">Pacchetti</Link> e clicca su "Nuovo Pacchetto",
            oppure dalla pagina di un singolo studente clicca su "Nuovo Pacchetto". Compila il modulo con le informazioni necessarie:
            studente/i, data di inizio, ore totali. Di default un nuovo pacchetto viene inserito come non
            pagato. Se invece vuoi inserire che è stato pagato, va inserita anche la data di pagamento.
          </Typography>
          <Typography>
            Puoi aggiungere rapidamente un nuovo pacchetto anche dal collegamento diretto alla <Link component={RouterLink} to="/packages/new">pagina di creazione pacchetto</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa succede se il pacchetto è condiviso?',
      answer: (
        <Typography paragraph>
          In automatico il sistema permette di inserire un massimo di 3 studenti associati allo stesso
          pacchetto. Questo è utile quando più studenti condividono lo stesso pacchetto
          di ore, ad esempio fratelli/sorelle.
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
            Le ore rimanenti sono visualizzate sia nella lista dei pacchetti che nella pagina di dettaglio del
            singolo pacchetto. Troverai anche dei cerchietti di avanzamento che mostrano visivamente il completamento settimana per settimana.
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
            La scadenza di un pacchetto è automaticamente calcolata come 4 settimane (28 giorni) dopo la
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
      question: 'Come posso estendere la scadenza di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Se un pacchetto è scaduto ma ha ancora ore disponibili, puoi estenderlo di una settimana dalla
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
            e ha ancora ore disponibili nel pacchetto che altrimenti andrebbero perse. Attenzione: la funzionalità di estensione
            diventa utilizzabile solo se il pacchetto sta per scadere ma ha ore rimanenti.
          </Typography>
        </>
      )
    },

    {
      question: 'Cosa faccio se il vecchio pacchetto è scaduto?',
      answer: (
        <>
          <Typography paragraph>
            Se un pacchetto è scaduto ma ha ancora ore disponibili, hai due opzioni:
          </Typography>
          <ol>
            <li>
              <strong>Estendere la scadenza</strong>: Dalla pagina di dettaglio del pacchetto, clicca su
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                sx={{ fontSize: '0.75rem', py: 0, ml: 0.5, mr: 0.5, minWidth: '130px' }}
              >
                Estendi scadenza +1
              </Button> per prolungare la validità di una settimana. Puoi ripetere questa operazione
              più volte se necessario.
            </li>
            <li>
              <strong>Creare un nuovo pacchetto</strong>: Se sono passate molte settimane o preferisci creare un
              nuovo pacchetto, vai alla sezione Pacchetti e clicca su <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '130px' }}
              >
                Nuovo pacchetto
              </Button> in alto a destra. Il nuovo pacchetto avrà
              una nuova data di inizio e scadenza.
            </li>
          </ol>
          <Typography>
            Se il pacchetto scaduto non ha ore rimanenti, semplicemente crea un nuovo pacchetto.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso vedere tutte le lezioni di un pacchetto?',
      answer: (
        <Typography paragraph>
          Vai alla pagina dettaglio del pacchetto cliccando sul suo ID nella lista dei pacchetti.
          Nella parte inferiore della pagina troverai una tabella con tutte le lezioni associate a quel pacchetto,
          con informazioni su studente, professore, data, durata e tariffa. Inoltre, è disponibile un calendario
          mensile che mostra visivamente la distribuzione delle lezioni.
        </Typography>
      )
    },
    {
      question: 'Voglio aggiungere le mie lezioni per la settimana prossima, ma un pacchetto scade questa settimana. Come faccio?',
      answer: (
        <>
          <Typography paragraph>
            All'aggiunta di una lezione futura, potresti non trovare il pacchetto corretto per
            associarlo. Questo può succedere se il pacchetto è scaduto o se non ha più ore disponibili.
          </Typography>
          <Typography paragraph>
            Se un pacchetto è scaduto ma ha ancora ore disponibili, estendi la durata del vecchio pacchetto: dopo sarà possibile aggiungere la lezione a questo.
          </Typography>
          <Typography paragraph>
            Se invece il pacchetto è terminato (non ha più ore disponibili), informati se lo studente intende rinnovare il pacchetto e per quante ore. In caso rinnovi, puoi creare il pacchetto tu stesso.
          </Typography>
        </>
      )
    },
    {
      question: 'Che succede quando nella stessa settimana vanno fissate lezioni sia di un vecchio che di un nuovo pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Nei casi in cui un pacchetto ha <b>poche ore rimanenti</b> e quindi va fatto partire anche il nuovo nella stessa settimana, è possibile far partire il nuovo pacchetto <b>in sovrapposizione</b>.
          </Typography>
          <Typography paragraph>
            Così facendo nella stessa settimana potrai fissare lezioni sia per il pacchetto in scadenza che per il nuovo pacchetto.
          </Typography>
          <Typography paragraph>
            Quando verranno inserite le lezioni, il sistema darà come disponibili entrambi i pacchetti e dovrai scegliere quale pacchetto associare alla lezione. Preferibilmente andrebbe prima portato a completamento il pacchetto che sta per terminare.
          </Typography>
        </>
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