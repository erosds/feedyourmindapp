// src/components/dashboard/LessonDetailsDialog.jsx
import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

function LessonDetailsDialog({ open, onClose, onViewDetails, selectedLesson, studentsMap }) {
  if (!selectedLesson) return null;
  
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Dettagli Lezione #{selectedLesson.id}
      </DialogTitle>
      <DialogContent>
        <List dense>
          <ListItem>
            <ListItemText primary="Data" secondary={format(parseISO(selectedLesson.lesson_date), "EEEE d MMMM yyyy", { locale: it })} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Studente" secondary={studentsMap[selectedLesson.student_id] || `Studente #${selectedLesson.student_id}`} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Durata" secondary={`${selectedLesson.duration} ore`} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Tipo" secondary={selectedLesson.is_package ? `Pacchetto #${selectedLesson.package_id}` : 'Lezione singola'} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Tariffa oraria" secondary={`€${parseFloat(selectedLesson.hourly_rate).toFixed(2)}`} />
          </ListItem>
          <ListItem>
            <ListItemText primary="Totale" secondary={`€${parseFloat(selectedLesson.total_payment).toFixed(2)}`} />
          </ListItem>
          {!selectedLesson.is_package && (
            <ListItem>
              <ListItemText primary="Stato pagamento" secondary={selectedLesson.is_paid ? "Pagata" : "Non pagata"} />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
        <Button onClick={onViewDetails} color="primary">
          Vedi tutti i dettagli
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LessonDetailsDialog;