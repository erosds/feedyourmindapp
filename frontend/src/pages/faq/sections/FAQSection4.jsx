// src/pages/faq/sections/FAQSection4.jsx
import React from 'react';
import { Typography, Link, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

function FAQSection4({ searchQuery = '' }) {
  const items = [
    {
      question: 'Come aggiungo una nuova lezione?',
      answer: (
        <>
          <Typography paragraph>
            Puoi aggiungere una lezione in diversi modi:
          </Typography>
          <ul>
            <li>
              Dalla tua <Link component={RouterLink} to="/dashboard">dashboard personale</Link>, cliccando su un giorno nel calendario
            </li>
            <li>
              Dalla pagina <Link component={RouterLink} to="/lessons">Lezioni</Link>, usando il pulsante <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '130px' }}
              >
                Nuova Lezione
              </Button>
            </li>
            <li>
              Dalla scheda di uno studente, cliccando su <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '130px' }}
              >
                Nuova Lezione
              </Button>
            </li>
            <li>
              Dalla pagina di un pacchetto precedentemente aperto, usando il calendario per selezionare un giorno
            </li>
          </ul>
          <Typography>
            Importante: le lezioni che fanno parte di un pacchetto, vanno <b>associate al loro pacchetto</b>!
          </Typography>
        </>
      )
    },
    {
      question: 'Come inserisco una lezione all\'interno di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Quando crei una nuova lezione, se lo studente ha pacchetti con ore rimanenti verrà mostrato un avviso. 
            Spunta quindi l'opzione in basso <b>"Parte di un pacchetto"</b> e scegli il pacchetto desiderato dal menu a tendina che apparirà.
          </Typography>
          <Typography>
            Puoi anche aggiungere una lezione di un pacchetto direttamente dalla pagina di dettaglio del pacchetto <b>cliccando su un giorno nel calendario</b>, che creerà automaticamente una lezione associata
            a quel pacchetto.
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa faccio se la lezione è di un pacchetto ma non è stato ancora creato?',
      answer: (
        <>
          <Typography paragraph>
            Molto semplice: crealo! Segui questi passaggi:
          </Typography>
          <ol>
            <li>
              Se stavi aggiungendo la lezione, interrompi la creazione cliccando su annulla
            </li>
            <li>
              Vai alla sezione <Link component={RouterLink} to="/packages">Pacchetti</Link> e <b>crea un nuovo pacchetto</b> per lo studente: basta inserire la <b>data di inizio</b> e il <b>numero di ore</b>
            </li>
            <li>
              Torna a creare la lezione, ora sarai in grado di selezionare il pacchetto appena creato
            </li>
          </ol>
        </>
      )
    },
    {
      question: 'Come gestisco le lezioni che si sovrappongono?',
      answer: (
        <>
        <Typography paragraph>
          Il sistema rileva automaticamente eventuali sovrapposizioni per lo stesso studente e ti avviserà nel
          caso in cui tenti di creare una lezione che si sovrappone a un'altra con un altro professore. 
        </Typography>
        <Typography paragraph>
          <b>Importante:</b> se hai studenti condivisi, <b>concorda gli orari delle lezioni con gli altri insegnanti</b>. Fallo <b>prima</b> di inserirle,
          in modo da essere più coordinati e favorire i bisogni sia degli studenti che dei professori.
        </Typography>
        </>
      )
    },
    {
      question: 'Posso marcare una lezione singola come pagata?',
      answer: (
        <>
          <Typography paragraph>
            <b>Sì</b>, ed è consigliabile farlo se sai che lo studente in questione ha già pagato la sua lezione. Esistono diversi modi per farlo:
          </Typography>
          <ol>
            <li>
              Dalla lista lezioni, clicca sul badge nella colonna <b>"Pagamento"</b>: il badge cambierà da "Non pagata" a "Pagata" e ti chiederà di inserire la data di pagamento
            </li>
            <li>
              Dalla pagina di dettaglio della lezione, clicca su <Button
                variant="outlined"
                color="secondary"
                startIcon={<EditIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '100px' }}
              >
                Modifica
              </Button> in alto a destra, e cambia lo stato del pagamento usando l'apposito
              interruttore <b>"Lezione pagata"</b>
            </li>
          </ol>
          <Typography>
            Nota: le lezioni associate a un pacchetto sono sempre considerate "pagate" poiché il pagamento
            viene gestito a livello di pacchetto.
          </Typography>
        </>
      )
    },
    
    {
      question: 'Posso aggiungere una lezione anche se è stata svolta online?',
      answer: (
        <Typography paragraph>
          Certo: quando crei o modifichi una lezione, troverai un'opzione <b>"Lezione online"</b> che puoi attivare
          per indicare che la lezione si svolgerà online anziché in presenza. Le lezioni online verranno
          visualizzate con un'icona speciale nella dashboard e nelle liste, consentendoti di distinguerle
          facilmente dalle lezioni in presenza.
        </Typography>
      )
    },
    {
      question: 'Posso vedere le lezioni di un giorno specifico tutte in ordine?',
      answer: (
        <Typography paragraph>
          Dalla tua dashboard, puoi cliccare sulla lente di ingrandimento di un giorno nel calendario per visualizzare le lezioni programmate
          per quel giorno. Si aprirà una finestra di dialogo che mostra <b>una timeline</b> con tutte le lezioni, più una lista con orari e dettagli. 
        </Typography>
      )
    }
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
          Gestione Lezioni
        </Typography>
      )}

      {filteredItems.map((item, index) => (
        <FAQItem key={index} question={item.question} answer={item.answer} />
      ))}
    </>
  );
}

export default FAQSection4;