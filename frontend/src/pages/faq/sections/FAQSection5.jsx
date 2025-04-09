// src/pages/faq/sections/FAQSection5.jsx
import React from 'react';
import { Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

function FAQSection5({ searchQuery = '' }) {
  const items = [
    {
      question: 'Cosa succede se devo annullare l\'estensione di un pacchetto?',
      answer: (
        <Typography paragraph>
          Se hai esteso un pacchetto ma hai necessità di annullare l'estensione, puoi farlo dalla pagina di 
          dettaglio del pacchetto cliccando su "Annulla estensione (-1)". Nota che questa operazione non è 
          possibile se ci sono lezioni programmate nella settimana che verrebbe rimossa. Dovrai prima eliminare
          o spostare tali lezioni.
        </Typography>
      )
    },
    {
      question: 'Cosa succede se una lezione ha più ore di quelle rimanenti su un pacchetto?',
      answer: (
        <Typography paragraph>
          Il sistema chiederà cosa fare con le ore eccedenti e basterà seguire le istruzioni: potrai scegliere di 
          creare una lezione singola per le ore eccedenti oppure far partire un nuovo pacchetto. In entrambi i casi,
          il sistema gestirà automaticamente la divisione delle ore tra il pacchetto esistente e la nuova soluzione
          scelta.
        </Typography>
      )
    },
    {
      question: 'Cosa succede se elimino un pacchetto che ha lezioni associate?',
      answer: (
        <Typography paragraph>
          Eliminando un pacchetto, verranno eliminate anche tutte le lezioni associate. Il sistema mostrerà 
          un avviso con l'elenco delle lezioni che verranno eliminate, chiedendo conferma prima di 
          procedere. Se desideri conservare le lezioni, dovresti modificarle per dissociarle dal pacchetto
          prima di eliminare quest'ultimo.
        </Typography>
      )
    },
    {
      question: 'Come gestisco i pagamenti parziali o ritardati?',
      answer: (
        <>
          <Typography paragraph>
            In caso di pagamenti parziali, è possibile:
          </Typography>
          <ol>
            <li>
              Impostare il pacchetto come "non pagato" finché non viene saldato completamente
            </li>
            <li>
              Inserire nelle note del pacchetto che si è ricevuto un acconto il giorno X
            </li>
          </ol>
          <Typography>
            Puoi modificare le note del pacchetto dalla pagina di dettaglio, dove troverai un'area di testo
            dedicata alle note che può essere utilizzata per tenere traccia di informazioni aggiuntive
            come pagamenti parziali.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso aggiornare l\'importo di un pacchetto dopo averlo creato?',
      answer: (
        <>
          <Typography paragraph>
            Gli amministratori possono modificare l'importo di un pacchetto dalla pagina di dettaglio 
            cliccando su "Modifica prezzo". Questo può essere utile quando il pacchetto è stato inizialmente 
            creato senza specificare l'importo o se è necessario modificarlo.
          </Typography>
          <Typography>
            Se non sei un amministratore, dovrai contattare un amministratore per effettuare questa modifica.
          </Typography>
        </>
      )
    },
    {
      question: 'Come faccio a vedere quante ore di lezione ho svolto in un determinato periodo?',
      answer: (
        <Typography paragraph>
          Nella tua dashboard personale, troverai un riepilogo delle ore di lezione svolte nel periodo selezionato.
          Puoi filtrare per diversi periodi (settimana, mese, anno) per visualizzare il totale delle ore e il
          relativo compenso. Inoltre, il calendario settimanale offre una rappresentazione visiva della distribuzione
          delle tue lezioni.
        </Typography>
      )
    },
    {
      question: 'Come posso inserire una lezione che si ripete ogni settimana?',
      answer: (
        <>
          <Typography paragraph>
            Attualmente, il sistema non supporta la creazione automatica di lezioni ricorrenti. Per inserire lezioni
            che si ripetono settimanalmente, dovrai creare manualmente ciascuna lezione.
          </Typography>
          <Typography paragraph>
            Un approccio pratico è:
          </Typography>
          <ol>
            <li>Creare la prima lezione con tutti i dettagli corretti</li>
            <li>Per le lezioni successive, utilizzare la funzione "Copia lezione" 
            (selezionando una lezione esistente e usando il pulsante "Copia") e modificare solo la data</li>
          </ol>
          <Typography>
            In questo modo, puoi mantenere tutti gli altri dettagli invariati (studente, orario, durata, pacchetto).
          </Typography>
        </>
      )
    },
    {
      question: 'Cosa faccio se devo spostare una lezione da un pacchetto all\'altro?',
      answer: (
        <Typography paragraph>
          Per spostare una lezione da un pacchetto all'altro, vai alla pagina di modifica della lezione
          e seleziona il nuovo pacchetto dal menu a tendina "Pacchetto". Assicurati che il nuovo pacchetto
          abbia ore sufficienti per coprire la durata della lezione. Il sistema aggiornerà automaticamente
          i conteggi delle ore per entrambi i pacchetti coinvolti.
        </Typography>
      )
    },
    {
      question: 'Come registro una lezione annullata o non svolta?',
      answer: (
        <>
          <Typography paragraph>
            Esistono due approcci principali per gestire le lezioni annullate:
          </Typography>
          <ol>
            <li>
              <strong>Eliminazione</strong>: Se la lezione è stata completamente annullata e non verrà recuperata,
              puoi semplicemente eliminarla dalla pagina di dettaglio della lezione.
            </li>
            <li>
              <strong>Annotazione</strong>: Se preferisci mantenere traccia delle lezioni annullate, puoi mantenere
              la lezione nel sistema ma aggiungere nel campo note (disponibile nella pagina di modifica) un'annotazione
              che indichi che la lezione è stata annullata e i motivi.
            </li>
          </ol>
          <Typography>
            Ricorda che l'eliminazione di una lezione associata a un pacchetto "restituirà" le ore al pacchetto,
            che saranno nuovamente disponibili per future lezioni.
          </Typography>
        </>
      )
    },
    {
      question: 'Come posso vedere rapidamente quali pacchetti stanno per scadere?',
      answer: (
        <Typography paragraph>
          Nella lista dei pacchetti, i pacchetti che stanno per scadere (entro la settimana successiva) sono
          evidenziati con un colore di avviso (giallo). Inoltre, puoi utilizzare il filtro "Stato" nella pagina dei
          pacchetti e selezionare "In scadenza" per visualizzare solo i pacchetti che stanno per scadere.
          Gli amministratori vedono anche un conteggio dei pacchetti in scadenza nella dashboard amministrativa.
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
          Casi Particolari e Funzionalità Avanzate
        </Typography>
      )}
      
      {filteredItems.map((item, index) => (
        <FAQItem key={index} question={item.question} answer={item.answer} />
      ))}
    </>
  );
}

export default FAQSection5;