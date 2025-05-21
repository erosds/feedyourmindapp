// frontend/src/components/payments/DayDetailsDialog.jsx (modificato)
import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function DayDetailsDialog({
  open,
  onClose,
  selectedDay,
  dayPayments,
  dayUnpaidLessons,
  dayExpiredPackages,
  viewMode,
  setViewMode,
  handlePaymentClick,
  handleOpenPaymentDialog
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {selectedDay && format(selectedDay, 'EEEE d MMMM yyyy', { locale: it })}
        </Typography>
        <ButtonGroup size="small">
          <Button
            variant={viewMode === 'payments' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('payments')}
          >
            Pagato
          </Button>
          <Button
            variant={viewMode === 'unpaid' ? 'contained' : 'outlined'}
            color='primary'
            onClick={() => setViewMode('unpaid')}
          >
            Non pagato
          </Button>
        </ButtonGroup>
      </DialogTitle>
      <DialogContent>
        {viewMode === 'payments' ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Totale giornaliero
                </Typography>
                <Typography variant="h5" gutterBottom>
                  €{dayPayments.reduce((sum, payment) => sum + payment.amount, 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 1 }} />

            {/* Prima sezione: Pacchetti */}
            {/* Sezione aggiuntiva: Pagamenti dei pacchetti */}
            {dayPayments.filter(payment => payment.type === 'package-payment').length > 0 && (
              <>
                <List dense>
                  {dayPayments
                    .filter(payment => payment.type === 'package-payment')
                    .sort((a, b) => a.studentName.localeCompare(b.studentName))
                    .map((payment) => (
                      <ListItem
                        key={payment.id}
                        alignItems="flex-start"
                        button
                        onClick={() => handlePaymentClick(payment)}
                        sx={{
                          mb: 1,
                          py: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ mb: -0.5 }}>
                              <b>{payment.studentName}</b> ha pagato <b>€{payment.amount.toFixed(2)}</b>
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                              <Typography
                                variant="caption"
                                component="span"
                                color="darkviolet"
                                sx={{ fontWeight: 500 }}
                              >
                                {/* Modifica qui: Distingui tra acconto e saldo */}
                                {payment.isFinalPayment ? 'Saldo pacchetto' : 'Acconto pacchetto'}
                              </Typography>{' '}
                              di {payment.hours} ore
                              {payment.packageCost > 0 && (
                                <span> (€{payment.packageCost.toFixed(2)})</span>
                              )}
                            </Typography>
                          }
                          sx={{ my: 0 }}
                        />
                      </ListItem>
                    ))}
                </List>
              </>
            )}


            {/* Seconda sezione: Lezioni singole */}
            {dayPayments.filter(payment => payment.type === 'lesson').length > 0 && (
              <>
                <List dense>
                  {dayPayments
                    .filter(payment => payment.type === 'lesson')
                    .sort((a, b) => a.studentName.localeCompare(b.studentName))
                    .map((payment) => (
                      <ListItem
                        key={payment.id}
                        alignItems="flex-start"
                        button
                        onClick={() => handlePaymentClick(payment)}
                        sx={{
                          mb: 1,
                          py: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ mb: -0.5 }}>
                              <b>{payment.studentName}</b> ha pagato <b>€{payment.amount.toFixed(2)}</b>
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                              <Typography
                                variant="caption"
                                component="span"
                                color="primary"
                                sx={{ fontWeight: 500 }}
                              >
                                Lezione singola
                              </Typography>{' '}
                              di {payment.hours} ore
                            </Typography>
                          }
                          sx={{ my: 0 }}
                        />
                      </ListItem>
                    ))}
                </List>
              </>
            )}

            {/* Messaggio se non ci sono pagamenti */}
            {dayPayments.length === 0 && (
              <Typography align="center" color="text.secondary" sx={{ py: 2 }}>
                Nessun pagamento registrato per questa data
              </Typography>
            )}
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Totale da saldare
                </Typography>
                <Typography variant="h5" gutterBottom>
                  €{(dayUnpaidLessons.reduce((sum, lesson) => sum + lesson.amount, 0) +
                    dayExpiredPackages.reduce((sum, pkg) => sum + pkg.amount, 0)).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 1 }} />
            {dayExpiredPackages.length > 0 && (
              <>
                <List dense>
                  {dayExpiredPackages
                    .sort((a, b) => a.studentName.localeCompare(b.studentName))
                    .map((pkg) => (
                      <ListItem
                        key={pkg.id}
                        alignItems="flex-start"
                        button
                        onClick={() => handlePaymentClick(pkg)}
                        sx={{
                          mb: 1,
                          py: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ mb: -0.5 }}>
                              <b>{pkg.studentName}</b> deve pagare <b>€{pkg.amount.toFixed(2)}</b>
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                              <Typography
                                variant="caption"
                                component="span"
                                color={pkg.type === 'expired-package' ? 'warning.main' : 'warning.main'} // Colore differente
                                sx={{ fontWeight: 500 }}
                              >
                                {pkg.type === 'expired-package' ? 'Pacchetto scaduto' : 'Pacchetto in scadenza'} {/* Testo differente */}
                              </Typography>{' '}
                              di {pkg.hours} ore
                            </Typography>
                          }
                          sx={{ my: 0 }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={(e) => handleOpenPaymentDialog(pkg, e)}
                          sx={{
                            minWidth: '40px',
                            height: '30px',
                            ml: 1,
                            bgcolor: pkg.type === 'expired-package' ? 'warning.main' : 'warning.main', // Colore differente
                            alignSelf: 'center',
                            fontSize: { xs: '0.65rem', sm: '0.8125rem' },
                            px: { xs: 0.5, sm: 1 }
                          }}
                        >
                          Segna come pagato
                        </Button>
                      </ListItem>
                    ))}
                </List>
              </>
            )}
            <List dense>
              {dayUnpaidLessons
                .sort((a, b) => a.studentName.localeCompare(b.studentName))
                .map((lesson) => (
                  <ListItem
                    key={lesson.id}
                    alignItems="flex-start"
                    button
                    onClick={() => handlePaymentClick(lesson)}
                    sx={{
                      mb: 1,
                      py: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ mb: -0.5 }}>
                          <b>{lesson.studentName}</b> deve pagare <b>€{lesson.amount.toFixed(2)}</b>
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" component="span" sx={{ display: 'inline' }}>
                          <Typography
                            variant="caption"
                            component="span"
                            color="secondary"
                            sx={{ fontWeight: 500 }}
                          >
                            Lezione singola
                          </Typography>{' '}
                          di {lesson.hours} ore
                          {lesson.professorName && <> con <b>{lesson.professorName}</b></>}
                        </Typography>
                      }
                      sx={{ my: 0 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={(e) => handleOpenPaymentDialog(lesson, e)}
                      sx={{
                        minWidth: '40px',
                        height: '30px',
                        ml: 1,
                        bgcolor: 'secondary.main',
                        alignSelf: 'center',
                        fontSize: { xs: '0.65rem', sm: '0.8125rem' }, // Testo più piccolo su mobile
                        px: { xs: 0.5, sm: 1 }  // Padding ridotto su mobile
                      }}
                    >
                      Segna come pagata
                    </Button>
                  </ListItem>
                ))}
            </List>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Chiudi
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DayDetailsDialog;