// src/components/common/DateRangePickerDialog.jsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * A dialog that allows the user to select either a single date or a date range
 */
function DateRangePickerDialog({ 
  open, 
  onClose, 
  onApply, 
  initialDateRange = { 
    startDate: new Date(), 
    endDate: new Date(),
    isRange: false 
  }
}) {
  // State for the dialog
  const [isRange, setIsRange] = useState(initialDateRange.isRange);
  const [startDate, setStartDate] = useState(initialDateRange.startDate);
  const [endDate, setEndDate] = useState(initialDateRange.endDate);

  // Handle switch change for single day vs range
  const handleSwitchChange = (event) => {
    setIsRange(event.target.checked);
    
    // If switching to single day mode, set endDate same as startDate
    if (!event.target.checked) {
      setEndDate(startDate);
    }
  };

  // Handle apply button click
  const handleApply = () => {
    onApply({
      startDate,
      endDate: isRange ? endDate : startDate, // If not range, use startDate for both
      isRange
    });
    onClose();
  };

  // Reset dialog state when closed
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Seleziona periodo</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isRange}
                onChange={handleSwitchChange}
                color="primary"
              />
            }
            label={isRange ? "Intervallo di date" : "Giorno singolo"}
          />
          
          {isRange && (
            <Typography variant="body2" color="text.secondary">
              {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
            </Typography>
          )}
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', flexDirection: isRange ? 'row' : 'column', gap: 2, justifyContent: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {isRange ? "Data inizio" : "Data"}
            </Typography>
            <DatePicker
              value={startDate}
              onChange={(newDate) => {
                setStartDate(newDate);
                // If not in range mode, update endDate to match startDate
                if (!isRange) {
                  setEndDate(newDate);
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small"
                }
              }}
            />
          </Box>
          
          {isRange && (
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Data fine
              </Typography>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                minDate={startDate} // Cannot select a date before startDate
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small"
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annulla</Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          Applica
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DateRangePickerDialog;