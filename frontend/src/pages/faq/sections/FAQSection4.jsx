// src/pages/faq/sections/FAQSection4.jsx
import React from 'react';
import { Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

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
              Dalla <Link component={RouterLink} to="/dashboard">dashboard</Link>, cliccando su un giorno nel calendario
            </li>
            <li>
              Dalla pagina <Link component={RouterLink} to="/lessons">Lezioni</Link>, usando il pulsante "Nuova Lezione"
            </li>
            <li>
              Dalla scheda di uno studente, cliccando su "Nuova Lezione"
            </li>
            <li>
              Dalla pagina di un pacchetto precedentemente aperto, usando il calendario per selezionare un giorno
            </li>
          </ul>
          <Typography>
            Importante: le lezioni che fanno parte di un pacchetto, vanno associate al loro pacchetto!
          </Typography>
        </>
      )
    },
    {
      question: 'Come inserisco una lezione all\'interno di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Quando crei una nuova lezione, seleziona lo studente e poi attiva l'opzione "Lezione da
            pacchetto". Seleziona quindi il pacchetto desiderato dal menu a tendina che apparirà. Il sistema
            mostrerà automaticamente le ore disponibili nel pacchetto.
          </Typography>
          <Typography paragraph>
            Se non vedi pacchetti disponibili, chiedi se hanno un pacchetto, e nel caso, crealo facendoti dare
            le informazioni da inserire (data di partenza e numero di ore).
          </Typography>
          <Typography>
            Puoi anche aggiungere una lezione direttamente dalla pagina di dettaglio del pacchetto
            cliccando su un giorno nel calendario, che creerà automaticamente una lezione associata
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
            Se stai creando una lezione e lo studente dovrebbe avere un pacchetto ma questo
            non appare tra le opzioni disponibili, significa che il pacchetto non è ancora stato
            registrato nel sistema. Segui questi passaggi:
          </Typography>
          <ol>
            <li>
              Interrompi la creazione della lezione (clicca "Annulla")
            </li>
            <li>
              Vai alla sezione <Link component={RouterLink} to="/packages">Pacchetti</Link> e crea un nuovo pacchetto
              per lo studente, inserendo la data di inizio e il numero di ore
            </li>
            <li>
              Torna a creare la lezione, ora sarai in grado di selezionare il pacchetto appena creato
            </li>
          </ol>
          <Typography>
            Se è urgente inserire la lezione, puoi anche crearla come lezione singola e successivamente
            modificarla per associarla al pacchetto una volta che questo sarà stato creato.
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa succede se la durata della lezione supera le ore rimanenti nel pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Se stai aggiungendo una lezione dalla sezione Lezioni, e la durata della lezione supera le ore disponibili nel pacchetto, il sistema mostrerà una finestra
            di dialogo con due opzioni:
          </Typography>
          <ol>
            <li>
              <strong>Utilizzare le ore rimanenti del pacchetto e creare una lezione singola</strong> per le ore eccedenti:
              questa opzione crea automaticamente una lezione singola per le ore che superano quelle disponibili
              nel pacchetto.
            </li>
            <li>
              <strong>Creare un nuovo pacchetto</strong> per le ore eccedenti: questa opzione ti guiderà nella
              creazione di un nuovo pacchetto per lo studente, che includerà le ore eccedenti.
            </li>
          </ol>
          <Typography>
            Scegli l'opzione più adatta in base alle preferenze dello studente e alla tua organizzazione.
            Attenzione: se stai aggiungendo la lezione dalla dashboard, il sistema semplicemente non ti permetterà di crearla.
            Per farlo dovrai andare nella sezione Lezioni.
          </Typography>
        </>
      )
    },
    {
      question: 'Come gestisco le lezioni che si sovrappongono?',
      answer: (
        <Typography paragraph>
          Il sistema rileva automaticamente eventuali sovrapposizioni per lo stesso studente e ti avviserà nel
          caso in cui tenti di creare una lezione che si sovrappone a un'altra. Non è possibile avere due
          lezioni contemporanee per lo stesso studente. Dovrai modificare l'orario di una delle lezioni
          se desideri programmarle nella stessa giornata.
        </Typography>
      )
    },
    {
      question: 'Come posso filtrare le lezioni?',
      answer: (
        <>
          <Typography paragraph>
            Nella <Link component={RouterLink} to="/lessons">pagina delle lezioni</Link>, puoi utilizzare i filtri disponibili per:
          </Typography>
          <ul>
            <li>
              <strong>Periodo</strong>: oggi, questa settimana, settimana scorsa, settimana prossima, questo mese
            </li>
            <li>
              <strong>Stato del pagamento</strong>: pagate, non pagate, da pacchetto
            </li>
            <li>
              <strong>Ricerca per nome</strong> dello studente o del professore
            </li>
          </ul>
          <Typography>
            Questi filtri possono essere combinati per trovare esattamente le lezioni che ti interessano.
          </Typography>
        </>
      )
    },
    {
      question: 'Come marco una lezione singola come pagata?',
      answer: (
        <>
          <Typography paragraph>
            Esistono diversi modi per segnare una lezione come pagata:
          </Typography>
          <ol>
            <li>
              Dalla lista lezioni, clicca sul badge "Non pagata" accanto alla lezione per aprire
              un menu che ti consente di impostare la data di pagamento
            </li>
            <li>
              Dalla pagina di dettaglio della lezione, clicca sul badge "Non pagata" per contrassegnare
              la lezione come pagata
            </li>
            <li>
              Quando modifichi una lezione, puoi cambiare lo stato del pagamento usando l'apposito
              interruttore "Lezione pagata"
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
      question: 'Come posso modificare una lezione esistente?',
      answer: (
        <Typography paragraph>
          Per modificare una lezione, vai alla pagina di dettaglio della lezione (cliccando sulla lezione
          dalla dashboard o dalla lista lezioni) e clicca sul pulsante "Modifica" in alto a destra.
          Potrai modificare tutti i dettagli come data, orario, durata, professore, studente e
          se la lezione fa parte di un pacchetto o è singola.
        </Typography>
      )
    },
    {
      question: 'Come visualizzo l\'elenco completo delle mie lezioni?',
      answer: (
        <Typography paragraph>
          Vai alla sezione <Link component={RouterLink} to="/lessons">Lezioni</Link> per visualizzare tutte le tue lezioni.
          Per impostazione predefinita, se sei un professore standard, vedrai solo le tue lezioni. Se sei un amministratore,
          puoi scegliere di visualizzare le lezioni di tutti i professori o solo le tue usando il filtro "Solo le mie lezioni".
        </Typography>
      )
    },
    {
      question: 'Come posso aggiungere una lezione online?',
      answer: (
        <Typography paragraph>
          Quando crei o modifichi una lezione, troverai un'opzione "Lezione online" che puoi attivare
          per indicare che la lezione si svolgerà online anziché in presenza. Le lezioni online verranno
          visualizzate con un'icona speciale nella dashboard e nelle liste, consentendoti di distinguerle
          facilmente dalle lezioni in presenza.
        </Typography>
      )
    },
    {
      question: 'Come posso vedere le lezioni di un giorno specifico?',
      answer: (
        <Typography paragraph>
          Dalla dashboard, puoi cliccare su un giorno nel calendario per visualizzare le lezioni programmate
          per quel giorno. Si aprirà una finestra di dialogo che mostra tutte le lezioni del giorno selezionato,
          con orari e dettagli. Da questa finestra, puoi anche aggiungere una nuova lezione per quel giorno
          specifico.
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