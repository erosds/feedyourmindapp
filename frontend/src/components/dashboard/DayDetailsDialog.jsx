// src/components/dashboard/DayDetailsDialog.jsx
import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  List,
  ListItem,
  Typography
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';

function DayDetailsDialog({ open, onClose, onAddLesson, selectedDay, dayLessons, studentsMap }) {
  if (!selectedDay) return null;
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        Lezioni per {format(selectedDay, "EEEE d MMMM yyyy", { locale: it })}
      </DialogTitle>
      <DialogContent>
        {dayLessons.length > 0 ? (
          <List>
            {dayLessons.map((lesson) => (
              <ListItem key={lesson.id} divider>
                <Box sx={{ width: '100%' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="medium">
                      {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                    </Typography>
                    {lesson.is_package && (
                      <Chip
                        label="Pacchetto"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Durata</Typography>
                      <Typography variant="body1">{lesson.duration} ore</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Tariffa</Typography>
                      <Typography variant="body1">€{parseFloat(lesson.hourly_rate).toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">Totale</Typography>
                      <Typography variant="body1" fontWeight="bold">€{parseFloat(lesson.total_payment).toFixed(2)}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
            Nessuna lezione in questo giorno
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
        <Button
          onClick={onAddLesson}
          color="primary"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Aggiungi Lezione
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DayDetailsDialog;