// src/components/common/DateRangePickerDialog.jsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * A dialog that allows the user to select either a single date or a date range
 * using mutually exclusive radio buttons instead of a toggle switch
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

  // Handle radio button change for single day vs range
  const handleModeChange = (event) => {
    const newValue = event.target.value === 'range';
    setIsRange(newValue);
    
    // If switching to single day mode, set endDate same as startDate
    if (!newValue) {
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
        <Box sx={{ mb: 2, mt: 1 }}>
          <FormControl>
            <FormLabel id="date-selection-mode">Modalità di selezione</FormLabel>
            <RadioGroup
              row
              aria-labelledby="date-selection-mode"
              name="date-selection-mode"
              value={isRange ? 'range' : 'single'}
              onChange={handleModeChange}
            >
              <FormControlLabel value="single" control={<Radio />} label="Giorno singolo" />
              <FormControlLabel value="range" control={<Radio />} label="Intervallo di date" />
            </RadioGroup>
          </FormControl>
          
          {isRange && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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