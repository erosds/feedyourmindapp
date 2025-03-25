// src/components/dashboard/LessonDetailsDialog.jsx
import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Typography,
  Chip,
  Box,
  Divider
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

function LessonDetailsDialog({ open, onClose, selectedLesson, studentsMap }) {
  const navigate = useNavigate();

  if (!selectedLesson) return null;

  // Funzione per navigare alla pagina dei dettagli
  const handleViewDetails = () => {
    navigate(`/lessons/${selectedLesson.id}`);
    onClose(); // Chiudi il dialogo dopo la navigazione
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Dettagli Lezione #{selectedLesson.id}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Prima riga di informazioni */}
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Data</Typography>
            <Typography variant="body1" fontWeight="medium">
              {format(parseISO(selectedLesson.lesson_date), "EEEE d MMMM yyyy", { locale: it })}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Orario</Typography>
            <Typography variant="body1" fontWeight="medium">
              {selectedLesson.start_time ? selectedLesson.start_time.substring(0, 5) : '00:00'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Studente</Typography>
            <Typography variant="body1" fontWeight="medium">
              {studentsMap[selectedLesson.student_id] || `Studente #${selectedLesson.student_id}`}
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Durata</Typography>
            <Typography variant="body1" fontWeight="medium">
              {selectedLesson.duration} ore
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
          </Grid>

          {/* Seconda riga di informazioni */}
          
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Tipo</Typography>
            <Box>
              {selectedLesson.is_package ? (
                <Chip 
                  label={`Pacchetto #${selectedLesson.package_id}`} 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                />
              ) : (
                <Chip 
                  label="Lezione singola" 
                  variant="outlined" 
                  size="small"
                />
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Tariffa oraria</Typography>
            <Typography variant="body1" fontWeight="medium">
              €{parseFloat(selectedLesson.hourly_rate).toFixed(2)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Typography variant="subtitle2" color="text.secondary">Totale</Typography>
            <Typography variant="body1" fontWeight="bold" color="primary">
              €{parseFloat(selectedLesson.total_payment).toFixed(2)}
            </Typography>
          </Grid>

          {/* Informazioni di pagamento per lezioni singole */}
          {!selectedLesson.is_package && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" color="text.secondary">Stato pagamento</Typography>
                <Box>
                  <Chip 
                    label={selectedLesson.is_paid ? "Pagata" : "Non pagata"} 
                    color={selectedLesson.is_paid ? "success" : "error"} 
                    variant="outlined"
                    size="small"
                  />
                </Box>
              </Grid>
              
              {selectedLesson.is_paid && selectedLesson.payment_date && (
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2" color="text.secondary">Data pagamento</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {format(parseISO(selectedLesson.payment_date), "dd/MM/yyyy", { locale: it })}
                  </Typography>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
        <Button onClick={handleViewDetails} color="primary" variant="contained">
          Vedi tutti i dettagli
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LessonDetailsDialog;