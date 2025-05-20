// src/components/packages/PackagePayments.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { packageService } from '../../services/api';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const PackagePayments = ({ packageId, packageCost, onPaymentChange }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    payment_date: new Date(),
    payment_method: '',
    notes: ''
  });
  const [totalPaid, setTotalPaid] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  // Carica i pagamenti all'avvio e quando cambiano
  useEffect(() => {
    fetchPayments();
  }, [packageId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await packageService.getPayments(packageId);
      setPayments(response.data || []);
      
      // Calcola totale pagato e rimanente
      const paid = response.data.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
      setTotalPaid(paid);
      setRemainingAmount(Math.max(0, parseFloat(packageCost) - paid));
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Impossibile caricare i pagamenti. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    setFormData({
      amount: remainingAmount.toString(),
      payment_date: new Date(),
      payment_method: '',
      notes: ''
    });
    setEditingPayment(null);
    setOpenDialog(true);
  };

  const handleEditPayment = (payment) => {
    setFormData({
      amount: payment.amount.toString(),
      payment_date: parseISO(payment.payment_date),
      payment_method: payment.payment_method || '',
      notes: payment.notes || ''
    });
    setEditingPayment(payment);
    setOpenDialog(true);
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo pagamento?')) {
      return;
    }
    
    try {
      await packageService.deletePayment(packageId, paymentId);
      await fetchPayments();
      
      // Notifica il componente genitore che i pagamenti sono cambiati
      if (onPaymentChange) {
        onPaymentChange();
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Impossibile eliminare il pagamento. Riprova più tardi.');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = async () => {
    try {
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
        payment_date: format(formData.payment_date, 'yyyy-MM-dd')
      };
      
      if (editingPayment) {
        await packageService.updatePayment(packageId, editingPayment.id, paymentData);
      } else {
        await packageService.createPayment(packageId, paymentData);
      }
      
      setOpenDialog(false);
      await fetchPayments();
      
      // Notifica il componente genitore che i pagamenti sono cambiati
      if (onPaymentChange) {
        onPaymentChange();
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      setError('Impossibile salvare il pagamento. Riprova più tardi.');
    }
  };

  // Calcola le percentuali di pagamento
  const paymentPercentage = Math.min(100, (totalPaid / packageCost) * 100);
  
  return (
    <Card>
      <CardHeader
        title={<Typography variant="h6" color="primary">Pagamenti e acconti</Typography>}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddPayment}
            disabled={parseFloat(packageCost) <= 0}
          >
            Nuovo acconto
          </Button>
        }
      />
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        {/* Riepilogo pagamenti */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Prezzo pacchetto</Typography>
              <Typography variant="h5">€{parseFloat(packageCost).toFixed(2)}</Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Totale pagato</Typography>
              <Typography variant="h5" color={paymentPercentage >= 100 ? 'success.main' : 'primary.main'}>
                €{totalPaid.toFixed(2)}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">Da pagare</Typography>
              <Typography variant="h5" color={remainingAmount > 0 ? 'error.main' : 'success.main'}>
                €{remainingAmount.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
          
          {/* Barra di progresso pagamento */}
          <Box sx={{ mt: 2, position: 'relative', height: 10, bgcolor: 'grey.200', borderRadius: 5 }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${paymentPercentage}%`,
                bgcolor: paymentPercentage >= 100 ? 'success.main' : 'primary.main',
                borderRadius: 5,
                transition: 'width 0.5s ease-in-out'
              }}
            />
          </Box>
          
          <Typography variant="body2" align="right" sx={{ mt: 0.5 }}>
            {paymentPercentage.toFixed(1)}% pagato
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Tabella pagamenti */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : payments.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Importo</TableCell>
                  <TableCell>Metodo</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>€{parseFloat(payment.amount).toFixed(2)}</TableCell>
                    <TableCell>{payment.payment_method || '-'}</TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditPayment(payment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePayment(payment.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box textAlign="center" py={3}>
            <PaymentIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography color="text.secondary">
              Nessun pagamento registrato per questo pacchetto
            </Typography>
          </Box>
        )}
      </CardContent>
      
      {/* Dialog per aggiungere/modificare pagamenti */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPayment ? 'Modifica pagamento' : 'Nuovo pagamento'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Importo"
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                helperText={remainingAmount > 0 ? `Rimanente: €${remainingAmount.toFixed(2)}` : 'Pacchetto saldato'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data pagamento"
                value={formData.payment_date}
                onChange={(date) => handleInputChange('payment_date', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: "outlined"
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Metodo di pagamento"
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                placeholder="Es. Contanti, Bonifico, PayPal..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Note"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                multiline
                rows={2}
                placeholder="Aggiungi eventuali note sul pagamento"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={!formData.amount || parseFloat(formData.amount) <= 0}
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PackagePayments;