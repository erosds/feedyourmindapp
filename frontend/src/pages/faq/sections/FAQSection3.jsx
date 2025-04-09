// src/pages/faq/sections/FAQSection3.jsx
import React from 'react';
import { Typography, Link } from '@mui/material';
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
            Puoi aggiungere rapidamente un nuovo pacchetto anche dal collegamento diretto alla 
            <Link component={RouterLink} to="/packages/new"> pagina di creazione pacchetto</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa succede se il pacchetto è condiviso?',
      answer: (
        <Typography paragraph>
          In automatico il sistema permette di inserire un massimo di 3 studenti associati allo stesso 
          pacchetto. Una volta inserito il primo, comparirà la casella per inserire un (eventuale) secondo 
          studente. Stessa cosa per il terzo. Questo è utile quando più studenti condividono lo stesso pacchetto
          di ore, ad esempio per lezioni di gruppo.
        </Typography>
      )
    },
    {
      question: 'Qual è la differenza tra gli stati di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Lo stato si determina in automatico:
          </Typography>
          <ul>
            <li>
              <strong>In corso</strong>: il pacchetto è attivo e non ha ancora raggiunto la data di scadenza 
              (diventa giallo se scade la settimana successiva)
            </li>
            <li>
              <strong>Terminato</strong>: il pacchetto è stato pagato e ha raggiunto la data di scadenza
            </li>
            <li>
              <strong>Scaduto</strong>: il pacchetto non è stato pagato ed ha superato la data di scadenza
            </li>
          </ul>
          <Typography>
            Puoi visualizzare lo stato di tutti i pacchetti nella 
            <Link component={RouterLink} to="/packages"> lista pacchetti</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Quando scade un pacchetto?',
      answer: (
        <Typography paragraph>
          La scadenza di un pacchetto è automaticamente calcolata come 4 settimane (28 giorni) dopo la 
          data di inizio. Il sistema calcola il lunedì della settimana corrente e aggiunge 4 settimane.
          Questo significa che il pacchetto scade sempre di domenica, alla fine della quarta settimana.
        </Typography>
      )
    },
    {
      question: 'Come posso estendere la scadenza di un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Se un pacchetto è scaduto ma ha ancora ore disponibili, puoi estenderlo di una settimana dalla 
            pagina di dettaglio del pacchetto cliccando sul pulsante "Estendi scadenza +1".
          </Typography>
          <Typography>
            Questa funzionalità è particolarmente utile quando uno studente ha saltato alcune lezioni
            e ha ancora ore disponibili nel pacchetto che altrimenti andrebbero perse.
          </Typography>
        </>
      )
    },
    {
      question: 'Come faccio a sapere quante ore rimangono in un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            Le ore rimanenti sono visualizzate sia nella lista dei pacchetti che nella pagina di dettaglio del 
            singolo pacchetto. Troverai anche una barra di avanzamento che mostra visivamente la 
            percentuale di completamento.
          </Typography>
          <Typography>
            Per vedere il dettaglio completo, vai alla <Link component={RouterLink} to="/packages">lista pacchetti</Link> e
            clicca su un pacchetto specifico per visualizzare tutte le informazioni sulle ore utilizzate e rimanenti.
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
              "Estendi scadenza +1" per prolungare la validità di una settimana. Puoi ripetere questa operazione
              più volte se necessario.
            </li>
            <li>
              <strong>Creare un nuovo pacchetto</strong>: Se sono passate molte settimane o preferisci creare un
              nuovo pacchetto, vai alla sezione Pacchetti e clicca su "Nuovo Pacchetto". Il nuovo pacchetto avrà
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
      question: 'Come posso aggiungere rapidamente un pacchetto a uno studente che ne ha bisogno?',
      answer: (
        <Typography paragraph>
          Il modo più rapido è andare alla pagina dettaglio dello studente (cliccando sul suo nome nella lista degli studenti), 
          e poi cliccare sul pulsante "Nuovo Pacchetto". Questo pre-selezionerà automaticamente lo studente nel form
          di creazione pacchetto, consentendoti di specificare solo le ore e la data di inizio.
        </Typography>
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
    }
  ];

  // If there's a search query, filter the items
  const filteredItems = searchQuery 
    ? items.filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.props.children.some(child => 
          (typeof child === 'object' && child.props && child.props.children && 
          typeof child.props.children === 'string' && 
          child.props.children.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (Array.isArray(child) && child.some(subChild =>
            typeof subChild === 'object' && subChild.props && subChild.props.children &&
            typeof subChild.props.children === 'string' &&
            subChild.props.children.toLowerCase().includes(searchQuery.toLowerCase())
          ))
        )
      )
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