// src/components/packages/PackagePayments.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { packageService } from '../../services/api';
import { DatePicker } from '@mui/x-date-pickers';
import { useAuth } from '../../context/AuthContext';

const PackagePayments = ({ packageId, packageData, onPaymentsUpdate }) => {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    payment_date: new Date(),
    notes: ''
  });
  const [success, setSuccess] = useState('');

  // Fetch payments data
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await packageService.getPayments(packageId);
        setPayments(response.data || []);
      } catch (err) {
        console.error('Error fetching payments:', err);
        setError('Impossibile caricare i pagamenti. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    if (packageId) {
      fetchPayments();
    }
  }, [packageId]);

  // Calculate remaining amount to pay
  const calculateRemainingAmount = () => {
    if (!packageData) return 0;
    
    const packageCost = parseFloat(packageData.package_cost) || 0;
    const totalPaid = parseFloat(packageData.total_paid) || 0;
    
    return Math.max(0, packageCost - totalPaid);
  };

  // Handle opening the add payment dialog
  const handleOpenAddDialog = () => {
    const remainingAmount = calculateRemainingAmount();
    
    setNewPayment({
      amount: remainingAmount.toString(),
      payment_date: new Date(),
      notes: ''
    });
    
    setAddDialogOpen(true);
  };

  // Handle adding a new payment
  const handleAddPayment = async () => {
    try {
      setError(null);
      
      // Validate amount
      const amount = parseFloat(newPayment.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Inserisci un importo valido maggiore di zero');
        return;
      }
      
      const response = await packageService.addPayment(packageId, {
        amount,
        payment_date: format(newPayment.payment_date, 'yyyy-MM-dd'),
        notes: newPayment.notes
      });
      
      // Add new payment to list
      setPayments([...payments, response.data]);
      
      // Show success message
      setSuccess('Pagamento aggiunto con successo');
      setTimeout(() => setSuccess(''), 3000);
      
      // Close dialog
      setAddDialogOpen(false);
      
      // Trigger parent update
      if (onPaymentsUpdate) {
        onPaymentsUpdate();
      }
    } catch (err) {
      console.error('Error adding payment:', err);
      setError('Errore durante l\'aggiunta del pagamento. Riprova più tardi.');
    }
  };

  // Handle deleting a payment
  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Sei sicuro di voler eliminare questo pagamento? Questa azione non può essere annullata.')) {
      return;
    }
    
    try {
      await packageService.deletePayment(paymentId);
      
      // Remove payment from list
      setPayments(payments.filter(payment => payment.id !== paymentId));
      
      // Show success message
      setSuccess('Pagamento eliminato con successo');
      setTimeout(() => setSuccess(''), 3000);
      
      // Trigger parent update
      if (onPaymentsUpdate) {
        onPaymentsUpdate();
      }
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Errore durante l\'eliminazione del pagamento. Riprova più tardi.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={30} />
        </CardContent>
      </Card>
    );
  }

  // Calculate total amount paid
  const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
  
  // Calculate remaining amount
  const remainingAmount = calculateRemainingAmount();
  
  // Check if package is fully paid
  const isFullyPaid = remainingAmount <= 0;

  return (
    <Card>
      <CardHeader 
        title={<Typography variant="h6" color="primary">Pagamenti pacchetto</Typography>}
        action={
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            disabled={isFullyPaid}
          >
            Aggiungi pagamento
          </Button>
        }
      />
      <CardContent>
        {/* Status messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        {/* Payment summary */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Totale pacchetto
            </Typography>
            <Typography variant="h6">
              €{(parseFloat(packageData?.package_cost) || 0).toFixed(2)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Totale versato
            </Typography>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              €{totalPaid.toFixed(2)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Ancora da versare
            </Typography>
            <Typography 
              variant="h6" 
              color={isFullyPaid ? "success.main" : "error.main"}
              fontWeight="bold"
            >
              €{remainingAmount.toFixed(2)}
              {isFullyPaid && (
                <Chip 
                  label="Saldato" 
                  color="success" 
                  size="small" 
                  sx={{ ml: 1, height: 24, fontSize: '0.7rem' }} 
                />
              )}
            </Typography>
          </Grid>
        </Grid>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* Payments list */}
        {payments.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell align="right">Importo</TableCell>
                  <TableCell>Note</TableCell>
                  {isAdmin() && <TableCell align="right">Azioni</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {payments
                  .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
                  .map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: it })}
                      </TableCell>
                      <TableCell align="right">
                        €{parseFloat(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {payment.notes || '-'}
                      </TableCell>
                      {isAdmin() && (
                        <TableCell align="right">
                          <Tooltip title="Elimina pagamento">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center"
            sx={{ py: 3 }}
          >
            Nessun pagamento registrato per questo pacchetto
          </Typography>
        )}
      </CardContent>
      
      {/* Add payment dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Aggiungi un pagamento</DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 0 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Importo"
                type="number"
                fullWidth
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>€</span>
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <DatePicker
                label="Data pagamento"
                value={newPayment.payment_date}
                onChange={(date) => setNewPayment({ ...newPayment, payment_date: date })}
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
                label="Note (opzionali)"
                fullWidth
                multiline
                rows={2}
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialogOpen(false)}>Annulla</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAddPayment}
          >
            Aggiungi pagamento
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PackagePayments;