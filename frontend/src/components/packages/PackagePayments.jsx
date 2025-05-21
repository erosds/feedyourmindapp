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
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon
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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [finalizeLoading, setFinalizeLoading] = useState(false);

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
    
    // Se il costo è 0 (pacchetto aperto), restituisci un valore positivo di default
    if (packageCost === 0) return 999999;
    
    return Math.max(0, packageCost - totalPaid);
  };

  // Check if package has an open cost
  const isPackageOpen = () => {
    return packageData && parseFloat(packageData.package_cost) === 0;
  };

  // Calculate total paid amount
  const getTotalPaid = () => {
    return payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
  };

  // Handle opening the add payment dialog
  const handleOpenAddDialog = () => {
    let suggestedAmount = calculateRemainingAmount();
    
    // Se il pacchetto è aperto, suggeriamo un importo vuoto
    if (isPackageOpen()) {
      suggestedAmount = '';
    } else {
      // Altrimenti suggeriamo l'importo rimanente
      suggestedAmount = suggestedAmount.toString();
    }
    
    setNewPayment({
      amount: suggestedAmount,
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
      
      // Se non è un pacchetto aperto, verifica che l'importo non superi il rimanente
      if (!isPackageOpen()) {
        const remainingAmount = calculateRemainingAmount();
        if (amount > remainingAmount) {
          setError(`L'importo non può superare il rimanente da pagare (€${remainingAmount.toFixed(2)})`);
          return;
        }
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

  // Stato per il dialog di conferma eliminazione
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Handle confirmation dialog open
  const handleOpenDeleteDialog = (paymentId) => {
    setPaymentToDelete(paymentId);
    setDeleteDialogOpen(true);
  };

  // Handle opening confirm finalize dialog
  const handleOpenFinalizeDialog = () => {
    setConfirmDialogOpen(true);
  };

  // Handle finalizing an open package
  const handleFinalizePackage = async () => {
    try {
      setFinalizeLoading(true);
      const totalPaid = getTotalPaid();
      
      if (totalPaid <= 0) {
        setError('Non ci sono pagamenti da registrare');
        setConfirmDialogOpen(false);
        return;
      }
      
      // Recupera i dati completi del pacchetto
      const packageResponse = await packageService.getById(packageId);
      const currentPackageData = packageResponse.data;
      
      // Data dell'ultimo pagamento
      const lastPayment = payments.sort((a, b) => 
        new Date(b.payment_date) - new Date(a.payment_date)
      )[0];
      
      // Aggiorna il costo del pacchetto alla somma degli acconti e imposta come pagato
      const updateData = {
        ...currentPackageData,
        package_cost: totalPaid,
        is_paid: true,
        payment_date: lastPayment ? lastPayment.payment_date : format(new Date(), 'yyyy-MM-dd')
      };
      
      await packageService.update(packageId, updateData);
      
      // Chiudi dialog e mostra messaggio di successo
      setConfirmDialogOpen(false);
      setSuccess('Pacchetto finalizzato con successo');
      setTimeout(() => setSuccess(''), 3000);
      
      // Aggiorna i dati del pacchetto
      if (onPaymentsUpdate) {
        onPaymentsUpdate();
      }
    } catch (err) {
      console.error('Error finalizing package:', err);
      setError('Errore durante la finalizzazione del pacchetto. Riprova più tardi.');
    } finally {
      setFinalizeLoading(false);
    }
  };

  // Handle deleting a payment
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    try {
      // Prima di eliminare, verifica che non si stia eliminando un pagamento che renderebbe il totale
      // inferiore al costo del pacchetto già impostato
      const paymentAmount = payments.find(p => p.id === paymentToDelete)?.amount || 0;
      const newTotalPaid = getTotalPaid() - parseFloat(paymentAmount);
      const packageCost = parseFloat(packageData?.package_cost) || 0;
      
      // Se il pacchetto non è aperto e il nuovo totale sarebbe inferiore al costo, mostra errore
      if (!isPackageOpen() && newTotalPaid < packageCost) {
        setError(`Impossibile eliminare questo pagamento. Il totale pagato diventerebbe inferiore al costo del pacchetto (€${packageCost.toFixed(2)}). Modifica prima il costo del pacchetto.`);
        setDeleteDialogOpen(false);
        setPaymentToDelete(null);
        return;
      }
      
      await packageService.deletePayment(paymentToDelete);
      
      // Remove payment from list
      setPayments(payments.filter(payment => payment.id !== paymentToDelete));
      
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
    
    // Close dialog and reset state
    setDeleteDialogOpen(false);
    setPaymentToDelete(null);
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
  const totalPaid = getTotalPaid();
  
  // Calculate remaining amount
  const remainingAmount = calculateRemainingAmount();
  
  // Check if package is fully paid
  const isFullyPaid = !isPackageOpen() && remainingAmount <= 0;

  // Check if package can be finalized (open package with payments)
  const canFinalizePackage = isPackageOpen() && totalPaid > 0;

  return (
    <Card>
      <CardHeader 
        title={<Typography variant="h6" color="primary">Pagamenti pacchetto</Typography>}
        action={
          <Box sx={{ display: 'flex' }}>
            {/* Bottone per finalizzare pacchetto aperto */}
            {canFinalizePackage && (
              <Button
                variant="outlined"
                size="small"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={handleOpenFinalizeDialog}
                sx={{ mr: 1 }}
              >
                Finalizza pacchetto
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              disabled={isFullyPaid}
            >
              Aggiungi pagamento
            </Button>
          </Box>
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
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              Prezzo pacchetto
            </Typography>
            <Typography variant="h6">
              {isPackageOpen() ? (
                <Chip 
                  label="da concordare" 
                  color="secondary" 
                  size="small" 
                  sx={{ fontSize: '0.75rem', height: 24, fontWeight: 'bold' }} 
                />
              ) : (
                `€${(parseFloat(packageData?.package_cost) || 0).toFixed(2)}`
              )}
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
              color={isFullyPaid ? "success.main" : isPackageOpen() ? "secondary.main" : "error.main"}
              fontWeight="bold"
            >
              {isPackageOpen() ? (
                "-"
              ) : (
                `€${remainingAmount.toFixed(2)}`
              )}
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
                              onClick={() => handleOpenDeleteDialog(payment.id)}
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
            <Grid item xs={12} sx={{ mt: 1 }}>
              <TextField
                label="Importo"
                type="number"
                fullWidth
                value={newPayment.amount}
                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                InputProps={{
                  startAdornment: <span style={{ marginRight: 8 }}>€</span>
                }}
                helperText={isPackageOpen() ? "Questo è un pacchetto aperto, l'importo è libero" : ""}
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
      
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Conferma eliminazione</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler eliminare questo pagamento? Questa azione non può essere annullata.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annulla</Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleDeletePayment}
          >
            Elimina
          </Button>
        </DialogActions>
      </Dialog>

      {/* Finalize package confirmation dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Finalizza pacchetto</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Stai per finalizzare questo pacchetto, impostando il prezzo totale pari alla somma degli acconti versati (€{totalPaid.toFixed(2)}).
          </Typography>
          <Typography>
            Il pacchetto risulterà completamente pagato e non sarà più considerato "aperto". Confermi?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Annulla</Button>
          <Button 
            variant="contained" 
            color="success"
            onClick={handleFinalizePackage}
            disabled={finalizeLoading}
          >
            {finalizeLoading ? <CircularProgress size={24} /> : 'Finalizza pacchetto'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default PackagePayments;