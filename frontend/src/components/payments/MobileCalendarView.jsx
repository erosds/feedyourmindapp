// frontend/src/components/payments/MobileCalendarView.jsx
import React from 'react';
import {
  Box,
  Chip,
  Typography
} from '@mui/material';
import { format, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import ScrollableChipsContainer from './ScrollableChipsContainer';

function MobileCalendarView({
  daysInMonth,
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
    <Box>
      {daysInMonth.map((day, index) => {
        const dayPayments = getPaymentsForDay(day);
        const hasPayments = dayPayments.length > 0;
        const dayTotal = getTotalForDay(day);
        const isCurrentDay = isToday(day);
        const studentChips = getStudentNamesForDay(day);
        const unpaidCount = getUnpaidCountForDay(day);
        const expiredCount = getExpiredPackagesCountForDay(day);
        const hasAnyData = hasPayments || unpaidCount > 0 || expiredCount > 0;
        const dayOfWeek = day.getDay() || 7; // 0 for Sunday, transformed to 7

        return (
          <Box
            key={`day-mobile-${index}`}
            sx={{
              mb: 2,
              border: '1px solid',
              borderColor: isCurrentDay ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 1,
              cursor: hasAnyData ? 'pointer' : 'default',
              '&:hover': hasAnyData ? {
                backgroundColor: 'action.hover',
                transform: 'scale(1.02)',
                transition: 'transform 0.2s'
              } : {},
              minHeight: '80px'  // Altezza minima per garantire consistenza visiva
            }}
            onClick={hasAnyData ? () => handleDayClick(day) : undefined}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
                pb: 1,
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: isCurrentDay ? 'bold' : 'normal', color: isCurrentDay ? 'primary.main' : 'inherit' }}>
                {["lun", "mar", "mer", "gio", "ven", "sab", "dom"][(dayOfWeek - 1) % 7]} {format(day, 'd')}
              </Typography>
              {isCurrentDay && (
                <Chip
                  label="Oggi"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
            </Box>

            {hasAnyData ? (
              <Box>
                {/* Amount in bold at the top - cambia in base alla modalità */}
                {(() => {
                  if (viewMode === 'payments' && hasPayments) {
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
                    const unpaidAmount = getUnpaidLessonsForDay(day).reduce((sum, lesson) => sum + lesson.amount, 0);
                    const expiredAmount = getExpiredPackagesForDay(day).reduce((sum, pkg) => sum + pkg.amount, 0);
                    const totalToBePaid = unpaidAmount + expiredAmount;

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
                    mt: hasPayments ? 0 : 1
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

                {/* Student chips with auto-scroll component */}
                <ScrollableChipsContainer>
                  {studentChips.map((student) => (
                    <Chip
                      key={student.id}
                      label={student.name}
                      size="small"
                      sx={{
                        height: 16,
                        margin: '1px',
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
            ) : (
              // Per i giorni senza dati, mostriamo uno spazio vuoto con un'altezza minima
              <Box sx={{ minHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Nessun dato
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

export default MobileCalendarView;