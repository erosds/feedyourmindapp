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
            Vai alla sezione <Link component={RouterLink} to="/students">Studenti</Link> e clicca sul pulsante "Nuovo Studente". 
            Compila il modulo con le informazioni richieste e clicca su "Crea". I campi obbligatori sono nome e cognome.
          </Typography>
          <Typography>
            Puoi aggiungere rapidamente un nuovo studente anche dal collegamento diretto alla 
            <Link component={RouterLink} to="/students/new"> pagina di creazione studente</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa faccio se ci sono due studenti con lo stesso nome e cognome?',
      answer: (
        <Typography paragraph>
          In caso di omonimi, il sistema richiederà di inserire anche la data di nascita per distinguerli.
          Questo campo diventa obbligatorio solo quando viene rilevato un possibile omonimo nel sistema.
          L'applicazione mostrerà un messaggio specifico richiedendo di inserire la data di nascita per
          entrambi gli studenti omonimi.
        </Typography>
      )
    },
    {
      question: 'Come posso vedere tutte le lezioni di uno studente?',
      answer: (
        <>
          <Typography paragraph>
            Vai alla pagina dello studente cliccando sul suo nome nella 
            <Link component={RouterLink} to="/students"> lista degli studenti</Link>. 
            Nella parte inferiore della pagina troverai una tabella con tutte le sue lezioni, 
            che puoi filtrare per tipo (singole/pacchetto).
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
  const filteredItems = searchQuery 
    ? items.filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.props.children.some(child => 
          typeof child === 'object' && child.props && child.props.children && 
          typeof child.props.children === 'string' && 
          child.props.children.toLowerCase().includes(searchQuery.toLowerCase())
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