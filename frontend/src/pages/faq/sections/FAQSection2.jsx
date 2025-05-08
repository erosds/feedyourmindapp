// src/pages/faq/sections/FAQSection2.jsx
import React from 'react';
import { Typography, Link, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import FAQItem from '../components/FAQItem';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';


function FAQSection2({ searchQuery = '' }) {
  const items = [
    {
      question: 'Come aggiungo un nuovo studente?',
      answer: (
        <>
          <Typography paragraph>
            Prima di inserire le tue lezioni e gli eventuali pacchetti, devi prima aggiungere uno <b>studente</b> (se non è stato già fatto).
          </Typography>
          <Typography paragraph>
            Per farlo, vai alla sezione <Link component={RouterLink} to="/students">Studenti</Link> e clicca sul pulsante <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '130px' }}
              >
                Nuovo Studente
              </Button>.
            Compila il modulo con le informazioni richieste e clicca su "Crea". I campi obbligatori sono <b>nome</b> e <b>cognome</b> (se non li sai, fatteli dire!).
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
          In caso di omonimi, il sistema richiederà di inserire anche la <b>data di nascita</b> per distinguere due studenti.
          Controlla quindi se lo studente che volevi aggiungere non fosse in realtà lo stesso già presente, dopodichè se si tratta davvero di studenti omonimi
          puoi procedere ad aggiungere il nuovo studente. Se non conosci la data di nascita, puoi inserire qualcosa nel nome o cognome per differenziarli.
        </Typography>
      )
    },
    {
      question: 'Posso vedere tutte le lezioni e i pacchetti di uno studente?',
      answer: (
        <>
          <Typography paragraph>
            Certo, per farlo ti basta visualizzare la <b>pagina di dettaglio</b> dello studente cliccando sul suo nome nella <Link component={RouterLink} to="/students">lista degli studenti</Link>.
            C'è una parte relativa alle <b>statistiche totali</b> in alto.
          </Typography>
          <Typography>
            Inoltre, questa pagina include un <b>calendario mensile</b> che per mostra tutte
            le lezioni programmate, un <b>calendario settimanale</b> più dettagliato e una <b>tabella</b> con tutte le lezioni
            che puoi filtrare per tipo (singole/pacchetto) e cliccare per vedere in dettaglio.
          </Typography>
        </>
      )
    },
    {
      question: 'È possibile eliminare uno studente?',
      answer: (
        <>
        <Typography paragraph>
          Sì, puoi eliminare uno studente dalla sua pagina di dettaglio cliccando sul pulsante <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '100px' }}
              >
                Elimina
              </Button> in alto a destra.
        </Typography>
        <Typography paragraph>
          <b>Attenzione</b>: non sarà possibile eliminare uno studente che ha lezioni o pacchetti associati attivi.
          Dovrai prima eliminare tutte le lezioni e i pacchetti associati allo studente.
        </Typography>
        </>
      )
    },
    {
      question: 'Come posso modificare i dati di uno studente?',
      answer: (
        <Typography paragraph>
          Vai alla pagina dettaglio dello studente cliccando sul suo nome nella lista degli studenti,
          quindi clicca sul pulsante <Button
                variant="outlined"
                color="secondary"
                startIcon={<EditIcon />}
                sx={{ fontSize: '0.75rem', py: 0.2, ml: 0.5, mr: 0.5, minWidth: '100px' }}
              >
                Modifica
              </Button> in alto a destra. Potrai aggiornare i suoi dati personali
          come nome, cognome, email, telefono e data di nascita.
        </Typography>
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