// Modifiche a ProfessorWeeklyTable.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Button,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers';
import { professorWeeklyPaymentService } from '../../services/api';
import { useTheme } from '@mui/material/styles';

function ProfessorWeeklyTable({
  currentWeekStart,
  endOfWeek,
  navigateToManageProfessors,
  professorWeeklyData,
  totalProfessorPayments,
  handleProfessorClick
}) {
  const [weeklyPayments, setWeeklyPayments] = useState({});
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  // Stati per il dialog di selezione data
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(new Date());

  // Determina se siamo in vista mensile
  const isMonthView = currentWeekStart && endOfWeek &&
    (endOfWeek.getMonth() === currentWeekStart.getMonth() &&
      endOfWeek.getDate() > 28);

  // Titolo dinamico in base alla vista
  const tableTitle = isMonthView ? "Riepilogo Mese Selezionato" : "Riepilogo Settimana Selezionata";

  // Carica lo stato dei pagamenti settimanali solo per la vista settimanale
  useEffect(() => {
    const loadWeeklyPayments = async () => {
      if (isMonthView || !currentWeekStart) return; // Non caricare per la vista mensile

      try {
        setLoading(true);
        const response = await professorWeeklyPaymentService.getWeeklyPaymentsStatus(currentWeekStart);
        setWeeklyPayments(response.data || {});
      } catch (err) {
        console.error('Error loading weekly payment status:', err);
        setWeeklyPayments({});
      } finally {
        setLoading(false);
      }
    };

    loadWeeklyPayments();
  }, [currentWeekStart, isMonthView]);

  // Gestisce il click sulla checkbox
  const handlePaymentCheckboxClick = (professor, currentlyPaid, event) => {
    event.stopPropagation(); // Previene il click sulla riga
    event.preventDefault(); // Previene comportamenti di default

    if (currentlyPaid) {
      // Se già pagato, togli il pagamento direttamente
      handlePaymentToggle(professor.id);
    } else {
      // Se non pagato, apri il dialog per selezionare la data
      setSelectedProfessor(professor);
      setSelectedPaymentDate(new Date()); // Data odierna come default
      setPaymentDialogOpen(true);
    }
  };

  // Gestisce il toggle del pagamento (chiamata API)
  const handlePaymentToggle = async (professorId, customDate = null) => {
    try {
      console.log('Toggling payment for professor:', professorId, 'week:', currentWeekStart, 'date:', customDate);

      // Se è fornita una data personalizzata, passa quella nel body della richiesta
      const requestBody = {
        professor_id: professorId,
        week_start_date: format(currentWeekStart, 'yyyy-MM-dd')
      };

      // Se abbiamo una data personalizzata, aggiungiamo il campo payment_date
      if (customDate) {
        requestBody.payment_date = format(customDate, 'yyyy-MM-dd');
      }

      const response = await professorWeeklyPaymentService.togglePaymentStatus(professorId, currentWeekStart, customDate);
      console.log('Toggle response:', response.data);

      // Aggiorna lo stato locale
      setWeeklyPayments(prev => ({
        ...prev,
        [professorId]: response.data
      }));
    } catch (err) {
      console.error('Error toggling payment status:', err);
      alert('Errore nel salvataggio dello stato di pagamento: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Conferma la selezione della data di pagamento
  const handleConfirmPaymentDate = () => {
    if (selectedProfessor && selectedPaymentDate) {
      handlePaymentToggle(selectedProfessor.id, selectedPaymentDate);
    }
    setPaymentDialogOpen(false);
    setSelectedProfessor(null);
  };

  // Chiude il dialog senza salvare
  const handleCancelPaymentDate = () => {
    setPaymentDialogOpen(false);
    setSelectedProfessor(null);
  };

  // Ordina i professori alfabeticamente per nome e poi per cognome
  const sortedProfessors = [...professorWeeklyData].sort((a, b) => {
    // Prima confronta per nome
    const firstNameComparison = a.first_name.localeCompare(b.first_name);
    // Se i nomi sono uguali, confronta per cognome
    return firstNameComparison !== 0 ? firstNameComparison : a.last_name.localeCompare(b.last_name);
  });

  // Calcola il totale delle ore
  const totalHours = professorWeeklyData.reduce((total, prof) => {
    // Prendi le ore dalle lezioni del periodo del professore
    const professorsHours = prof.weeklyLessons.reduce((sum, lesson) =>
      sum + parseFloat(lesson.duration), 0);
    return total + professorsHours;
  }, 0);

  return (
    <>
      <Paper sx={{ p: 2, height: '100%', mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" color='primary'>
            {tableTitle}
          </Typography>
          <Box display="flex" alignItems="center">
          </Box>
        </Box>

        {sortedProfessors.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
            Nessun professore attivo in {isMonthView ? "questo mese" : "questa settimana"}
          </Typography>
        ) : (
          // Sostituisci la sezione TableContainer in ProfessorWeeklyTable.jsx con questo:

          // Sostituisci la sezione TableContainer in ProfessorWeeklyTable.jsx con questo:

          <TableContainer sx={{
            mb: 2,
            // Stili per colonna fissa sempre attivi quando serve scroll orizzontale
            '& .MuiTable-root': {
              '& .fixed-column': {
                position: 'sticky',
                left: 0,
                backgroundColor: 'background.paper',
                zIndex: 1,
                minWidth: '140px', // Aumentato per contenere avatar + nome
                maxWidth: '140px',
                // Rimossa la riga separatrice
                '& .MuiBox-root': {
                  width: '100%'
                }
              }
            }
          }}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell className="fixed-column">Professore</TableCell>
                  <TableCell align="center" sx={{ minWidth: '60px' }}>Ore</TableCell>
                  <TableCell align="right" sx={{ minWidth: '100px' }}>Ultimo giorno</TableCell>
                  <TableCell align="right" sx={{ minWidth: '80px' }}>Pagamento</TableCell>
                  {/* Aggiungi la colonna checkbox solo per la vista settimanale */}
                  {!isMonthView && (
                    <TableCell align="center" sx={{ width: '50px', minWidth: '50px' }}>
                      <Tooltip title="Segna come pagato">
                        <Typography variant="caption">Pagato</Typography>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedProfessors.map((prof) => {
                  // Calcola il totale delle ore per questo professore
                  const professorHours = prof.weeklyLessons.reduce((sum, lesson) =>
                    sum + parseFloat(lesson.duration), 0);

                  // Ottieni lo stato del pagamento per questo professore
                  const paymentStatus = weeklyPayments[prof.id];
                  const isPaid = paymentStatus?.is_paid || false;

                  return (
                    <TableRow
                      key={prof.id}
                      hover
                      onClick={() => handleProfessorClick(prof.id)}
                      sx={{ cursor: 'pointer', height: 20 }}
                    >
                      <TableCell className="fixed-column">
                        <Box display="flex" alignItems="center">
                          <Avatar
                            sx={{
                              width: 16,
                              height: 16,
                              mr: 1,
                              ml: -1,
                              bgcolor: isPaid && !isMonthView ? 'success.main' : 'primary.main',
                              fontSize: '0.6rem'
                            }}
                          >
                            {prof.first_name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap'
                            }}>
                              {prof.first_name}
                            </Typography>
                            <Typography variant="body1" sx={{
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap'
                            }}>
                              {prof.last_name}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1">
                          {professorHours.toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1">
                          {prof.lastLessonDate ? format(prof.lastLessonDate, "EEEE dd/MM", { locale: it }) : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1">
                          €{prof.totalPayment.toFixed(2)}
                        </Typography>
                      </TableCell>
                      {/* Checkbox solo per vista settimanale */}
                      {!isMonthView && (
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title={isPaid ? "Segna come non pagato" : "Segna come pagato"}>
                            <Checkbox
                              checked={isPaid}
                              onChange={(e) => handlePaymentToggle(prof.id, e)}
                              disabled={loading}
                              size="small"
                              color="success"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="fixed-column" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="subtitle1" fontWeight="medium">Totale</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {totalHours.toFixed(1)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      €{totalProfessorPayments.toFixed(2)}
                    </Typography>
                  </TableCell>
                  {!isMonthView && <TableCell></TableCell>}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog per la selezione della data di pagamento */}
      <Dialog
        open={paymentDialogOpen}
        onClose={handleCancelPaymentDate}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Seleziona Data Pagamento
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {selectedProfessor && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                Seleziona la data di pagamento per <strong>{selectedProfessor.first_name} {selectedProfessor.last_name}</strong>
              </Typography>
            )}
            <DatePicker
              label="Data pagamento"
              value={selectedPaymentDate}
              onChange={(date) => setSelectedPaymentDate(date)}
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
          <Button onClick={handleCancelPaymentDate}>
            Annulla
          </Button>
          <Button
            onClick={handleConfirmPaymentDate}
            variant="contained"
            color="primary"
            disabled={!selectedPaymentDate}
          >
            Conferma
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ProfessorWeeklyTable;