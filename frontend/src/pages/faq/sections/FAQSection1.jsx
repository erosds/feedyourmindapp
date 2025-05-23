// src/pages/faq/sections/FAQSection1.jsx
import React from 'react';
import { Typography, Accordion, AccordionSummary, AccordionDetails, Link } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

function FAQSection1({ searchQuery = '' }) {
  const items = [
    {
      question: 'A cosa mi serve questa app?',
      answer: (
        <Typography paragraph>
          Questa app è stata creata per aiutare tutti noi a gestire <b>lezioni</b>, <b>pacchetti</b> e <b>pagamenti</b> in maniera automatica.
          Tra le altre cose permette di:
          <ul>
            <li>Calcolare in automatico il proprio <b>compenso settimanale</b></li>
            <li>Gestire le <b>lezioni</b> e associarle agli eventuali <b>pacchetti</b> di ogni studente</li>
            <li>Tenere traccia delle <b>ore rimanenti</b> sui pacchetti</li>
            <li>Tenere traccia delle <b>scadenze</b> e degli <b>acconti</b></li>
            <li>Gestire il <b>planning giornaliero</b> in base alle lezioni di tutti</li>
          </ul>
          Tenerla aggiornata è fondamentale: con un minimo di contributo da parte di tutti, possiamo semplificare di molto la gestione dell'associazione.
        </Typography>
      )
    },

    {
      question: 'Cosa c\'è nell\'app?',
      answer: (
        <>
          <Typography paragraph>
            Nell'app ci sono 4 entità principali:
          </Typography>
          <ul>
            <li>
              <Link component={RouterLink} to="/students">Studenti</Link> - Gestione anagrafica degli studenti
            </li>
            <li>
              <Link component={RouterLink} to="/professors">Professori</Link> - Gestione degli insegnanti (solo per amministratori)
            </li>
            <li>
              <Link component={RouterLink} to="/lessons">Lezioni</Link> - Gestione delle singole lezioni
            </li>
            <li>
              <Link component={RouterLink} to="/packages">Pacchetti</Link> - Gestione dei pacchetti di più lezioni
            </li>
          </ul>
          <Typography paragraph>
            Sono organizzati nel menu a sinistra con voci che ne offrono una <b>lista</b>: cliccando su lezioni, pacchetti, studenti comparirà la
            lista di quelli disponibili. Dalla lista, cliccando su un elemento, si aprirà una <b>scheda dettagli</b> di quell'elemento.
          </Typography>
          <Typography>
            In più c'è <Link component={RouterLink} to="/dashboard">MyDashboard</Link>. Questa dashboard mostra
            automaticamente un calendario settimanale con tutte le tue lezioni. Puoi navigare tra le settimane
            usando i pulsanti "Precedente" e "Successiva", o tornare alla settimana corrente con il pulsante
            centrale. In più viene visualizzato un riepilogo del proprio compenso.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso cambiare la mia password?',
      answer: (
        <>
          <Typography paragraph>
            Puoi cambiare la tua password dalla pagina di login cliccando su <b>"Cambia password"</b>, oppure
            contattare l'amministratore se hai completamente dimenticato le tue credenziali.
          </Typography>
          <Typography>
            Vai alla <Link component={RouterLink} to="/change-password">pagina di cambio password</Link>.
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
          Domande di Base
        </Typography>
      )}

      {filteredItems.map((item, index) => (
        <FAQItem key={index} question={item.question} answer={item.answer} />
      ))}
    </>
  );
}

export default FAQSection1;