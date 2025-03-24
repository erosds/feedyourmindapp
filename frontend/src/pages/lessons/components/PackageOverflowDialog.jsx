// src/pages/lessons/components/PackageOverflowDialog.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Box,
  Radio,
  RadioGroup,
  FormControlLabel,
  CircularProgress
} from '@mui/material';

/**
 * Dialog per gestire il caso in cui le ore della lezione superano le ore rimanenti del pacchetto
 */
function PackageOverflowDialog({ 
  open, 
  onClose, 
  onAction, 
  details,
  loading = false
}) {
  const [action, setAction] = useState('use_package');

  const handleActionChange = (event) => {
    setAction(event.target.value);
  };

  const handleProceed = () => {
    onAction(action);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="overflow-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="overflow-dialog-title">
        Durata della lezione supera le ore disponibili
      </DialogTitle>
      <DialogContent>
        <DialogContentText gutterBottom>
          La durata della lezione ({details.totalHours} ore)
          supera le ore disponibili nel pacchetto ({details.remainingHours} ore).
          Come vuoi gestire le {details.overflowHours} ore in eccesso?
        </DialogContentText>

        <Box sx={{ mt: 3 }}>
          <RadioGroup
            aria-label="overflow-action"
            name="overflow-action"
            value={action}
            onChange={handleActionChange}
          >
            <FormControlLabel
              value="use_package"
              control={<Radio />}
              label="Crea una lezione singola per le ore eccedenti"
            />
            <FormControlLabel
              value="create_new_package"
              control={<Radio />}
              label="Crea un nuovo pacchetto per le ore eccedenti"
            />
          </RadioGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Annulla
        </Button>
        <Button onClick={handleProceed} color="primary" variant="contained">
          {loading ? <CircularProgress size={24} /> : 'Procedi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PackageOverflowDialog;