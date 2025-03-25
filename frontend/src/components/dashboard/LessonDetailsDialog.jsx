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
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { lessonService } from '../../services/api';

function LessonDetailsDialog({ open, onClose, selectedLesson, studentsMap }) {
  const navigate = useNavigate();

  if (!selectedLesson) return null;

  // Funzione per navigare alla pagina dei dettagli
  const handleViewDetails = () => {
    navigate(`/lessons/${selectedLesson.id}`);
    onClose(); // Chiudi il dialogo dopo la navigazione
  };
  
  // Funzione per modificare la lezione
  const handleEditLesson = () => {
    navigate(`/lessons/edit/${selectedLesson.id}`);
    onClose(); // Chiudi il dialogo dopo la navigazione
  };
  
  // Funzione per eliminare la lezione
  const handleDeleteLesson = async () => {
    if (window.confirm(`Sei sicuro di voler eliminare la lezione #${selectedLesson.id}? Questa azione non può essere annullata.`)) {
      try {
        // Chiama l'API per eliminare la lezione
        await lessonService.delete(selectedLesson.id);
        alert('La lezione è stata eliminata con successo.');
        onClose();
        // Rimaniamo sulla dashboard invece di navigare altrove
        window.location.reload(); // Ricarica la pagina per aggiornare i dati
      } catch (err) {
        console.error('Error deleting lesson:', err);
        alert('Errore durante l\'eliminazione della lezione. Riprova più tardi.');
      }
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Dettagli Lezione #{selectedLesson.id}</Typography>
          <Box>
            <Tooltip title="Modifica lezione">
              <IconButton color="primary" onClick={handleEditLesson} size="small" sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Elimina lezione">
              <IconButton color="error" onClick={handleDeleteLesson} size="small">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
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
        <Button onClick={handleViewDetails}>Vedi tutti i dettagli</Button>
        <Button onClick={onClose} color="primary" variant="contained">
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default LessonDetailsDialog;