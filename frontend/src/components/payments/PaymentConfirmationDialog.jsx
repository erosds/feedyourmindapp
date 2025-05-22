// frontend/src/components/payments/PaymentConfirmationDialog.jsx
import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  InputAdornment
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';

function PaymentConfirmationDialog({
  open,
  onClose,
  selectedPaymentItem,
  paymentDate,
  setPaymentDate,
  priceValue,
  setPriceValue,
  onConfirm
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        {selectedPaymentItem?.isOpenPackage ? 'Imposta prezzo e pagamento' : 'Conferma Pagamento'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label={selectedPaymentItem?.isOpenPackage ? "Prezzo del pacchetto" : (selectedPaymentItem?.type === 'unpaid' ? "Prezzo Lezione" : "Pagamento pacchetto")}
            type="number"
            value={priceValue}
            onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
            InputProps={{
              startAdornment: <InputAdornment position="start">€</InputAdornment>,
            }}
            helperText={selectedPaymentItem?.isOpenPackage ? "Questo è un pacchetto aperto: imposta il prezzo finale" : ""}
          />
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
        <Button onClick={onClose}>Annulla</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
        >
          {selectedPaymentItem?.isOpenPackage ? 'Imposta prezzo e paga' : 'Conferma Pagamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PaymentConfirmationDialog;