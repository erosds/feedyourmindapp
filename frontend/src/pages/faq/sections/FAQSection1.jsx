// src/pages/faq/sections/FAQSection1.jsx
import React from 'react';
import { Typography, Accordion, AccordionSummary, AccordionDetails, Link } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

function FAQSection1({ searchQuery = '' }) {
  const items = [
    {
      question: 'Come accedo all\'applicazione?',
      answer: (
        <>
          <Typography paragraph>
            Utilizza il tuo nomecognome come username. La password di default è 1234.
          </Typography>
          <Typography>
            Per accedere, vai alla <Link component={RouterLink} to="/login">pagina di login</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso cambiare la mia password?',
      answer: (
        <>
          <Typography paragraph>
            Puoi cambiare la tua password dalla pagina di login cliccando su "Cambia password", oppure
            contattare l'amministratore se hai completamente dimenticato le tue credenziali.
          </Typography>
          <Typography>
            Vai alla <Link component={RouterLink} to="/change-password">pagina di cambio password</Link>.
          </Typography>
        </>
      )
    },
    {
      question: 'Se dimentico la password cosa succede?',
      answer: (
        <Typography>
          Se hai dimenticato la password, contatta l'amministratore del sistema. Solo l'amministratore
          può reimpostare una password dimenticata.
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
              <Link component={RouterLink} to="/packages">Pacchetti</Link> - Gestione dei pacchetti di ore
            </li>
          </ul>
          <Typography paragraph>
            Sono organizzati nel menu a sinistra con voci che ne offrono una lista: cliccando su lezioni, pacchetti, studenti comparirà la
            lista di quelli disponibili.
          </Typography>
          <Typography>
            In più la prima voce di questo menu è <Link component={RouterLink} to="/dashboard">MyDashboard</Link>. Questa dashboard personale mostra
            automaticamente un calendario settimanale con tutte le tue lezioni. Puoi navigare tra le settimane
            usando i pulsanti "Precedente" e "Successiva", o tornare alla settimana corrente con il pulsante
            centrale. In più viene visualizzato un riepilogo del proprio compenso.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso accedere subito alla mia dashboard?',
      answer: (
        <Typography>
          La dashboard è la prima pagina che visualizzi dopo il login. Puoi tornare alla dashboard in qualsiasi momento
          cliccando su <Link component={RouterLink} to="/dashboard">MyDashboard</Link> nel menu laterale.
        </Typography>
      )
    },
    {
      question: 'Come posso vedere il mio calendario delle lezioni?',
      answer: (
        <Typography>
          Il calendario delle lezioni è disponibile nella <Link component={RouterLink} to="/dashboard">Dashboard</Link> personale.
          Puoi navigare tra le settimane usando i pulsanti di navigazione e visualizzare i dettagli di ogni lezione
          cliccando su di essa nel calendario.
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