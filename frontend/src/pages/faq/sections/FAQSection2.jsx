// src/pages/faq/sections/FAQSection2.jsx
import React from 'react';
import { Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

function FAQSection2({ searchQuery = '' }) {
  const items = [
    {
      question: 'Come aggiungo un nuovo studente?',
      answer: (
        <>
          <Typography paragraph>
            Prima di inserire le tue lezioni e gli eventuali pacchetti, devi prima aggiungere uno studente (se non è stato già fatto).
          </Typography>
          <Typography paragraph>
            Per farlo, vai alla sezione <Link component={RouterLink} to="/students">Studenti</Link> e clicca sul pulsante "Nuovo Studente".
            Compila il modulo con le informazioni richieste e clicca su "Crea". I campi obbligatori sono nome e cognome (se non lo sai, fattelo dire!).
            Aggiungi lo studente anche se è uno studente occasionale o da lezione una-tantum.
          </Typography>
          <Typography>
            Puoi aggiungere rapidamente un nuovo studente anche da <Link component={RouterLink} to="/students/new">qui</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa faccio se ci sono due studenti con lo stesso nome e cognome?',
      answer: (
        <Typography paragraph>
          In caso di omonimi, il sistema richiederà di inserire anche la data di nascita per distinguere due studenti.
          Controlla quindi se lo studente che volevi aggiungere non fosse lo stesso già presente, dopodichè se si tratta davvero di studenti omonimi
          puoi procedere ad aggiungere il secondo studente. Se non conosci la data di nascita, puoi inserire qualcosa nel nome o cognome per differenziarli.
        </Typography>
      )
    },
    {
      question: 'Come posso vedere tutte le lezioni di uno studente?',
      answer: (
        <>
          <Typography paragraph>
            Vai alla pagina dello studente cliccando sul suo nome nella <Link component={RouterLink} to="/students">lista degli studenti</Link>.
            C'è sia un calendario settimanale che mostra tutte le lezioni di quello studente settimana per settimana sia una tabella con tutte le sue lezioni,
            che puoi filtrare per tipo (singole/pacchetto) e cliccare per vedere il dettaglio di ogni lezione.
          </Typography>
          <Typography>
            Inoltre, la scheda dettaglio dello studente include un calendario mensile che visualizza
            le lezioni programmate, statistiche riassuntive sulle ore totali, e gli ultimi pacchetti acquistati.
          </Typography>
        </>
      )
    },
    {
      question: 'È possibile eliminare uno studente?',
      answer: (
        <Typography paragraph>
          Sì, puoi eliminare uno studente dalla sua pagina di dettaglio cliccando sul pulsante "Elimina".
          Attenzione: non sarà possibile eliminare uno studente che ha lezioni o pacchetti associati attivi.
          Dovrai prima eliminare tutte le lezioni e i pacchetti associati allo studente.
        </Typography>
      )
    },
    {
      question: 'Come posso modificare i dati di uno studente?',
      answer: (
        <Typography paragraph>
          Vai alla pagina dettaglio dello studente cliccando sul suo nome nella lista degli studenti,
          quindi clicca sul pulsante "Modifica" in alto a destra. Potrai aggiornare i suoi dati personali
          come nome, cognome, email, telefono e data di nascita.
        </Typography>
      )
    },
    {
      question: 'Come posso cercare rapidamente uno studente?',
      answer: (
        <Typography paragraph>
          Nella pagina <Link component={RouterLink} to="/students">lista studenti</Link>, usa la barra di
          ricerca in alto per cercare uno studente per nome o cognome. I risultati vengono filtrati in tempo
          reale mentre digiti.
        </Typography>
      )
    },
    {
      question: 'Come verifico quali studenti hanno pacchetti attivi?',
      answer: (
        <Typography paragraph>
          Nella <Link component={RouterLink} to="/students">lista degli studenti</Link>,
          la colonna "Ultimo Pacchetto" mostra lo stato del pacchetto più recente di ogni studente
          (In corso, Scaduto, Terminato). Puoi usare questa informazione per verificare rapidamente
          quali studenti hanno pacchetti attivi.
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
          Gestione Studenti
        </Typography>
      )}

      {filteredItems.map((item, index) => (
        <FAQItem key={index} question={item.question} answer={item.answer} />
      ))}
    </>
  );
}

export default FAQSection2;