// src/pages/faq/sections/FAQSection5.jsx
import React from 'react';
import { Typography, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';

function FAQSection5({ searchQuery = '' }) {
  const items = [
    {
      question: 'Cosa succede se svolgo una lezione che dura più ore di quelle rimanenti su un pacchetto?',
      answer: (
        <>
          <Typography paragraph>
            <b>Informati</b> se lo studente intende continuare con un nuovo pacchetto.
          </Typography>
          <Typography paragraph>
            Se sì, puoi <b>crearlo</b> e associare parte delle ore della tua lezione al vacchio pacchetto e il resto al nuovo pacchetto.
          </Typography>
          <Typography paragraph>
            Se lo studente invece non intende rinnovare il pacchetto, associa la parte delle ore della tua lezione al vacchio pacchetto
            in modo da completarlo e le ore rimanenti come lezione singola.
          </Typography>
        </>
      )
    },
    {
      question: 'Un nuovo pacchetto può partire nonostante ci siano ore da completare su quello precedente?',
      answer: (
        <>
          <Typography paragraph>
            Nei casi in cui un pacchetto ha <b>poche ore rimanenti</b> e quindi va fatto partire anche il nuovo nella stessa settimana, <b>è possibile far partire il nuovo pacchetto in sovrapposizione</b>.
          </Typography>
          <Typography paragraph>
            Così facendo nella stessa settimana potrai fissare lezioni sia per il pacchetto in scadenza che per il nuovo pacchetto.
          </Typography>
          <Typography paragraph>
            Quando verranno inserite le lezioni, il sistema darà come disponibili entrambi i pacchetti e dovrai scegliere quale pacchetto associare alla lezione. Preferibilmente andrebbe prima <b>portato a completamento</b> il pacchetto che sta per terminare e quindi ha meno ore.
          </Typography>
        </>
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
              Inserire nelle <b>note del pacchetto</b> che si è ricevuto un acconto il giorno X
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
      question: 'Voglio aggiungere le mie lezioni per la settimana prossima, ma un pacchetto scade questa settimana. Come faccio?',
      answer: (
        <>
          <Typography paragraph>
            All'aggiunta di una lezione futura associata ad un pacchetto che scade prima della data della lezione, il sistema ti avviserà che <b>non puoi inserire lezioni dopo la scadenza del pacchetto</b>.
          </Typography>
          <Typography paragraph>
            Se il pacchetto ha però ancora ore da esaurire, bisogna <b>estenderne la durata</b>, in modo da poter inserire poi la lezione.
          </Typography>          
          <Typography paragraph>
            Se invece il pacchetto è terminato (non ha più ore disponibili), <b>informati</b> se lo studente intende rinnovare il pacchetto e per quante ore. In caso rinnovi, puoi <b>creare</b> il pacchetto tu stesso.
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