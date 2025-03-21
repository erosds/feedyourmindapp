// src/components/lessons/PackageOverflowDialog.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { lessonService } from '../../services/api';

/**
 * Dialogo per gestire il caso in cui le ore della lezione superano le ore rimanenti del pacchetto
 */
function PackageOverflowDialog({ open, onClose, overflowData, onSuccess }) {
  const [action, setAction] = useState('use_package');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug: visualizza i dati ricevuti
  console.log('Dati di overflow ricevuti:', overflowData);

  // Estraiamo i dati dall'errore ricevuto dal backend
  // Handling sia il formato originale che quello restituito dal backend
  const {
    package_id,
    remaining_hours,
    lesson_duration,
    lesson_hours_in_package,
    overflow_hours,
    lesson_data
  } = overflowData || {};
  
  // Per sicurezza estraiamo anche dal campo detail se disponibile
  const detail = overflowData?.detail || {};

  const handleActionChange = (event) => {
    setAction(event.target.value);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepariamo i dati da inviare all'endpoint dedicato
      // Utilizziamo detail se disponibile, altrimenti i dati diretti
      const requestData = {
        action,
        package_id: package_id || detail.package_id,
        lesson_data: lesson_data || {},
        lesson_hours_in_package: lesson_hours_in_package || detail.lesson_hours_in_package,
        overflow_hours: overflow_hours || detail.overflow_hours
      };

      console.log('Dati inviati per gestione overflow:', requestData);

      // Chiamiamo l'endpoint specifico per gestire l'overflow
      const response = await lessonService.handleOverflow(requestData);
      
      console.log('Risposta ricevuta:', response.data);
      
      // Notifichiamo il componente padre del successo
      onSuccess(response.data);
      onClose();
    } catch (err) {
      console.error('Errore nella gestione dell\'overflow:', err);
      // Mostriamo un errore più dettagliato
      setError(err.response?.data?.detail || 
              'Si è verificato un errore durante la gestione delle ore eccedenti. ' + 
              (err.message ? `Dettaglio: ${err.message}` : 'Riprova più tardi.'));
    } finally {
      setLoading(false);
    }
  };

  if (!overflowData) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Ore eccedenti il pacchetto
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body1" gutterBottom>
          La lezione che stai inserendo ha una durata di <strong>{lesson_duration || detail.lesson_duration || '?'} ore</strong>, ma il pacchetto 
          ha solo <strong>{remaining_hours || detail.remaining_hours || '?'} ore</strong> rimanenti.
        </Typography>

        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
          Come vuoi gestire le <strong>{overflow_hours || detail.overflow_hours || '?'} ore</strong> eccedenti?
        </Typography>

        <Divider sx={{ my: 2 }} />

        <RadioGroup
          value={action}
          onChange={handleActionChange}
        >
          <Box p={2} border={1} borderColor={action === 'use_package' ? 'primary.main' : 'divider'} 
               borderRadius={1} mb={2} bgcolor={action === 'use_package' ? 'primary.light' : 'background.paper'}>
            <FormControlLabel 
              value="use_package" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Utilizza ore rimanenti + crea lezione singola
                  </Typography>
                  <Typography variant="body2">
                    Verranno create due lezioni: una di {lesson_hours_in_package} ore sul pacchetto e 
                    una lezione singola di {overflow_hours} ore per la parte eccedente.
                  </Typography>
                </Box>
              } 
            />
          </Box>

          <Box p={2} border={1} borderColor={action === 'create_new_package' ? 'primary.main' : 'divider'} 
               borderRadius={1} bgcolor={action === 'create_new_package' ? 'primary.light' : 'background.paper'}>
            <FormControlLabel 
              value="create_new_package" 
              control={<Radio />} 
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Crea nuovo pacchetto per le ore eccedenti
                  </Typography>
                  <Typography variant="body2">
                    Le {overflow_hours} ore eccedenti saranno inserite in un nuovo pacchetto 
                    (che dovrai configurare con il prezzo dopo).
                  </Typography>
                </Box>
              } 
            />
          </Box>
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annulla
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Conferma'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PackageOverflowDialog;