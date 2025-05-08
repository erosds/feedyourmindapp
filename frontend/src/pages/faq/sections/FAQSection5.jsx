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
        <>
          <Typography paragraph>
            Informati se lo studente intende continuare con un nuovo pacchetto.
          </Typography>
          <Typography paragraph>
            Se sì, puoi crearlo e associare parte delle ore della tua lezione al vacchio pacchetto e il resto al nuovo pacchetto.
          </Typography>
          <Typography paragraph>
            Se lo studente non intende rinnovare il pacchetto, associa la parte delle ore della tua lezione al vacchio pacchetto
            in modo da completarlo e le ore rimanenti come lezione singola.
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