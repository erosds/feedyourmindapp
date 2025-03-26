// src/components/lessons/LessonOverlapDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Dialog component to show warning when a lesson overlaps with another lesson
 * for the same student.
 */
function LessonOverlapDialog({ open, onClose, overlappingLesson }) {
  if (!overlappingLesson) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="overlap-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="overlap-dialog-title">
        Sovrapposizione di orario rilevata
      </DialogTitle>
      <DialogContent>
        <DialogContentText gutterBottom>
          Lo studente ha già una lezione programmata in questo orario. Non è possibile creare lezioni sovrapposte per lo stesso studente.
        </DialogContentText>
        
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
          <Typography variant="subtitle1" gutterBottom>
            Dettagli della lezione in conflitto:
          </Typography>
          <Typography variant="body2">
            <strong>Data:</strong> {format(parseISO(overlappingLesson.lesson_date), 'dd/MM/yyyy', { locale: it })}
          </Typography>
          <Typography variant="body2">
            <strong>Orario:</strong> {overlappingLesson.start_time?.substring(0, 5) || '00:00'}
          </Typography>
          <Typography variant="body2">
            <strong>Durata:</strong> {overlappingLesson.duration} ore
          </Typography>
          <Typography variant="body2">
            <strong>ID lezione:</strong> #{overlappingLesson.id}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="primary"
          variant="contained"
        >
          Modifica orario
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LessonOverlapDialog;