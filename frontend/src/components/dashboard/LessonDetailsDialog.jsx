// src/components/dashboard/LessonDetailsDialog.jsx
import React, { useState } from 'react';
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
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { lessonService } from '../../services/api';
import { DatePicker } from '@mui/x-date-pickers';
import { useAuth } from '../../context/AuthContext';

function LessonDetailsDialog({ open, onClose, selectedLesson, studentsMap }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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

  // Nuova funzione per gestire il toggle del pagamento
  const handleTogglePayment = () => {
    // Solo per lezioni singole (non da pacchetto)
    if (selectedLesson.is_package) return;

    // Se è già pagata, cambia direttamente stato
    if (selectedLesson.is_paid) {
      handleUpdatePaymentStatus(false, null);
    } else {
      // Imposta i valori iniziali per il dialogo di pagamento
      setPriceValue(parseFloat(selectedLesson.price || selectedLesson.duration * 20));
      setPaymentDate(new Date());
      setPaymentDialogOpen(true);
    }
  };

  // Funzione per aggiornare lo stato di pagamento
  const handleUpdatePaymentStatus = async (isPaid, paymentDate, updatedPrice) => {
    try {
      setUpdating(true);

      // Prepara i dati da aggiornare
      const updateData = {
        is_paid: isPaid,
        payment_date: paymentDate ? format(paymentDate, 'yyyy-MM-dd') : null,
        price: updatedPrice !== undefined ? updatedPrice : selectedLesson.price
      };

      // Chiama il servizio per aggiornare la lezione
      await lessonService.update(selectedLesson.id, updateData);

      // Chiudi il dialogo e ricarica la pagina per riflettere le modifiche
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Error updating payment status:', err);
      alert('Errore durante l\'aggiornamento dello stato di pagamento. Riprova più tardi.');
    } finally {
      setUpdating(false);
    }
  };

  // Gestione della conferma del pagamento
  const handleConfirmPayment = () => {
    // Se non è admin, usa il prezzo di default (prezzo attuale o durata * 20)
    const finalPrice = isAdmin() 
      ? priceValue 
      : (selectedLesson.price || selectedLesson.duration * 20);
    
    handleUpdatePaymentStatus(true, paymentDate, finalPrice);
    setPaymentDialogOpen(false);
  };

  // Chiusura del dialogo di pagamento
  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Dettagli lezione #{selectedLesson.id}</Typography>
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
              <Typography variant="subtitle2" color="text.secondary">Modalità</Typography>
              <Box>
                <Chip
                  label={selectedLesson.is_online ? "Online" : "In presenza"}
                  color={selectedLesson.is_online ? "secondary" : "default"}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="text.secondary">Compenso Orario</Typography>
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

            {/* Stato pagamento per lezioni singole */}
            {!selectedLesson.is_package && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">Stato pagamento</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={selectedLesson.is_paid ? "Pagata" : "Non pagata"}
                      color={selectedLesson.is_paid ? "success" : "error"}
                      onClick={handleTogglePayment}
                      variant="outlined"
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                    <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                      Clicca sul badge per {selectedLesson.is_paid ? "annullare il pagamento" : "segnare come pagata"}
                    </Typography>
                  </Box>
                </Grid>

                {isAdmin() && (
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">Prezzo studente</Typography>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      color={!selectedLesson.is_paid || parseFloat(selectedLesson.price || 0) === 0 ? "error.main" : "inherit"}
                    >
                      €{parseFloat(selectedLesson.price || 0).toFixed(2)}
                      {parseFloat(selectedLesson.price || 0) === 0 && (
                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                          Prezzo da impostare
                        </Typography>
                      )}
                    </Typography>
                  </Grid>
                )}

                {selectedLesson.is_paid && selectedLesson.payment_date && (
                  <Grid item xs={12} md={4}>
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

      {/* Dialogo per la data di pagamento */}
      <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog}>
        <DialogTitle>Conferma Pagamento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Mostra il campo prezzo solo agli admin */}
            {isAdmin() && (
              <TextField
                fullWidth
                label="Prezzo Lezione"
                type="number"
                value={priceValue}
                onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
              />
            )}
            <DatePicker
              label="Data pagamento"
              value={paymentDate}
              onChange={(date) => setPaymentDate(date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: "outlined"
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Annulla</Button>
          <Button
            onClick={handleConfirmPayment}
            variant="contained"
            color="primary"
          >
            Conferma Pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default LessonDetailsDialog;