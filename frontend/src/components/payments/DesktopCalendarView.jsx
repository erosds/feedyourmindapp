// frontend/src/components/payments/DesktopCalendarView.jsx
import React from 'react';
import {
  Box,
  Chip,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import { format, isToday } from 'date-fns';
import ScrollableChipsContainer from './ScrollableChipsContainer';

function DesktopCalendarView({
  daysInMonth,
  weekdays,
  getFirstDayOffset,
  getPaymentsForDay,
  getTotalForDay,
  getUnpaidLessonsForDay,
  getUnpaidCountForDay,
  getExpiredPackagesForDay,
  getExpiredPackagesCountForDay,
  getStudentNamesForDay,
  viewMode,
  handleDayClick
}) {
  return (
    <>
      {/* Calendar header with weekdays */}
      <Grid container spacing={1} sx={{ mb: 1 }}>
        {weekdays.map((day, index) => (
          <Grid item xs={12 / 7} key={`weekday-${index}`}>
            <Box
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                borderRadius: 1
              }}
            >
              {day}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Calendar grid with days */}
      <Grid container spacing={1}>
        {/* Empty cells for days before the start of the month */}
        {Array.from({ length: getFirstDayOffset() }).map((_, index) => (
          <Grid item xs={12 / 7} key={`empty-${index}`}>
            <Box sx={{
              height: 120,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1
            }}></Box>
          </Grid>
        ))}

        {/* Days of the month */}
        {daysInMonth.map((day, index) => {
          const dayPayments = getPaymentsForDay(day);
          const hasPayments = dayPayments.length > 0;
          const dayTotal = getTotalForDay(day);
          const isCurrentDay = isToday(day);
          const studentChips = getStudentNamesForDay(day);

          // Add these calculations
          const unpaidCount = getUnpaidCountForDay(day);
          const expiredCount = getExpiredPackagesCountForDay(day);
          const hasAnyData = hasPayments || unpaidCount > 0 || expiredCount > 0;

          return (
            <Grid item xs={12 / 7} key={`day-${index}`}>
              <Box
                sx={{
                  height: 120,
                  border: '1px solid',
                  borderColor: isCurrentDay ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  position: 'relative',
                  p: 1,
                  pb: 0.5,
                  // Use hasAnyData instead of hasPayments
                  cursor: hasAnyData ? 'pointer' : 'default',
                  '&:hover': hasAnyData ? {
                    backgroundColor: 'action.hover',
                    transform: 'scale(1.02)',
                    transition: 'transform 0.2s'
                  } : {},
                  boxShadow: 0,
                  backgroundColor: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
                // Use hasAnyData instead of hasPayments
                onClick={hasAnyData ? () => handleDayClick(day) : undefined}
              >
                {/* Day number in corner */}
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: isCurrentDay ? 'bold' : 'normal',
                    textAlign: 'right',
                    color: isCurrentDay ? 'primary.main' : 'text.primary',
                    position: 'absolute',
                    top: 2,
                    right: 4,
                    fontSize: '0.9rem'
                  }}
                >
                  {format(day, 'd')}
                </Typography>

                {/* Change the condition from hasPayments to hasAnyData */}
                {hasAnyData && (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      width: '100%'
                    }}
                  >
                    {/* Amount in bold at the top - cambia in base alla modalità */}
                    {(() => {
                      if (viewMode === 'payments' && hasPayments) {
                        // Se in modalità "pagato" e ci sono pagamenti, mostra il totale pagato
                        return (
                          <Typography
                            variant="body1"
                            color="success.main"
                            fontWeight="bold"
                            sx={{
                              mt: 0.5,
                              mb: 0.5,
                              fontSize: '1rem',
                              lineHeight: 1
                            }}
                          >
                            €{dayTotal.toFixed(2)}
                          </Typography>
                        );
                      } else if (viewMode === 'unpaid') {
                        // Se in modalità "da pagare", calcola e mostra il totale da pagare
                        const unpaidAmount = getUnpaidLessonsForDay(day).reduce((sum, lesson) => sum + lesson.amount, 0);
                        const expiredAmount = getExpiredPackagesForDay(day).reduce((sum, pkg) => sum + pkg.amount, 0);
                        const totalToBePaid = unpaidAmount + expiredAmount;

                        // Mostra solo se c'è un importo da pagare
                        if (totalToBePaid > 0) {
                          return (
                            <Typography
                              variant="body1"
                              color="error.main"
                              fontWeight="bold"
                              sx={{
                                mt: 0.5,
                                mb: 0.5,
                                fontSize: '1rem',
                                lineHeight: 1
                              }}
                            >
                              €{totalToBePaid.toFixed(2)}
                            </Typography>
                          );
                        }
                      }

                      // Se non ci sono pagamenti nella modalità selezionata, non mostrare nulla
                      return null;
                    })()}

                    {/* Riepilogo numero di elementi */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.7rem',
                        mb: 1,
                        lineHeight: 1,
                        // Cambia questa logica: se c'è un ammontare mostrato, mt: 0, altrimenti mt: 1.5
                        mt: (() => {
                          if (viewMode === 'payments' && hasPayments) {
                            return 0; // C'è una cifra pagata mostrata
                          } else if (viewMode === 'unpaid') {
                            const unpaidAmount = getUnpaidLessonsForDay(day).reduce((sum, lesson) => sum + lesson.amount, 0);
                            const expiredAmount = getExpiredPackagesForDay(day).reduce((sum, pkg) => sum + pkg.amount, 0);
                            const totalToBePaid = unpaidAmount + expiredAmount;

                            return totalToBePaid > 0 ? 0 : 1.5; // Se c'è una cifra da pagare mostrata: 0, altrimenti: 1.5
                          }
                          return 1.5; // Nessuna cifra mostrata, metti margine
                        })()
                      }}
                    >
                      {/* Mostra sempre le informazioni sui pagamenti, in grassetto solo se viewMode === 'payments' */}
                      {hasPayments && (
                        <span style={{ fontWeight: viewMode === 'payments' ? 'bold' : 'normal' }}>
                          {dayPayments.length} pagament{dayPayments.length === 1 ? 'o' : 'i'}
                        </span>
                      )}

                      {/* Mostra sempre le informazioni sulle lezioni non pagate, in grassetto solo se viewMode === 'unpaid' */}
                      {unpaidCount > 0 && (
                        <>
                          {hasPayments && " - "}
                          <span style={{ fontWeight: viewMode === 'unpaid' ? 'bold' : 'normal' }}>
                            {unpaidCount} lezion{unpaidCount === 1 ? 'e' : 'i'} non pagat{unpaidCount === 1 ? 'a' : 'e'}
                          </span>
                        </>
                      )}

                      {/* Modifica qui per distinguere tra pacchetti scaduti e in scadenza */}
                      {expiredCount > 0 && (
                        <>
                          {(hasPayments || unpaidCount > 0) && " - "}
                          <span style={{ fontWeight: viewMode === 'unpaid' ? 'bold' : 'normal' }}>
                            {/* Conta separatamente i pacchetti scaduti e in scadenza */}
                            {(() => {
                              // Usa le funzioni specifiche per contare i diversi tipi di pacchetti
                              const expiredPackages = getExpiredPackagesForDay(day)
                                .filter(pkg => pkg.type === 'expired-package').length;
                              const expiringPackages = getExpiredPackagesForDay(day)
                                .filter(pkg => pkg.type === 'expiring-package').length;

                              let text = '';
                              if (expiredPackages > 0) {
                                text += `${expiredPackages} pacchett${expiredPackages === 1 ? 'o scaduto' : 'i scaduti'} non saldat${expiredPackages === 1 ? 'o' : 'i'}`;
                              }

                              if (expiringPackages > 0) {
                                if (expiredPackages > 0) text += ' - ';
                                text += `${expiringPackages} pacchett${expiringPackages === 1 ? 'o in scadenza' : 'i in scadenza'} non saldat${expiringPackages === 1 ? 'o' : 'i'}`;
                              }

                              return text;
                            })()}
                          </span>
                        </>
                      )}
                    </Typography>

                    {/* Student chips with auto-scroll component - always show */}
                    <ScrollableChipsContainer>
                      {studentChips.map((student) => (
                        <Chip
                          key={student.id}
                          label={student.name}
                          size="small"
                          sx={{
                            height: 16,
                            margin: '1px',
                            // Aggiungi questa logica quando definisci il colore del chip:
                            backgroundColor: student.type === 'package'
                              ? 'darkviolet'  // Pacchetto (non dovrebbe accadere spesso)
                              : student.type === 'package-payment'
                                ? (student.isFinalPayment
                                  ? 'darkviolet'    // Saldo pacchetto 
                                  : 'mediumpurple') // Acconto pacchetto
                                : student.type === 'expired-package' || student.type === 'expiring-package'
                                  ? (student.isOpenPackage ? 'darkorange' : 'warning.main') // MODIFICA QUI
                                  : student.type === 'unpaid'
                                    ? 'secondary.main'
                                    : 'primary.main',
                            color: 'white',
                            '& .MuiChip-label': {
                              px: 0.6,
                              fontSize: '0.65rem',
                              fontWeight: 'medium',
                              whiteSpace: 'nowrap'
                            }
                          }}
                        />
                      ))}
                    </ScrollableChipsContainer>
                  </Box>
                )}
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </>
  );
}

export default DesktopCalendarView;