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
                        mt: hasPayments ? 0 : 1.5 // mantieni il margine se non ci sono pagamenti
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

                      {/* Mostra sempre le informazioni sui pacchetti scaduti, in grassetto solo se viewMode === 'unpaid' */}
                      {expiredCount > 0 && (
                        <>
                          {(hasPayments || unpaidCount > 0) && " - "}
                          <span style={{ fontWeight: viewMode === 'unpaid' ? 'bold' : 'normal' }}>
                            {expiredCount} pacchett{expiredCount === 1 ? 'o scaduto' : 'i scaduti'} non pagat{expiredCount === 1 ? 'o' : 'i'}
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
                            backgroundColor: student.type === 'package' || student.type === 'package-payment'
                              ? 'darkviolet'
                              : student.type === 'expired-package'
                                ? 'warning.main'
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