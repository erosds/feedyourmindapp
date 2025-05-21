// frontend/src/components/payments/MonthlyStatsDisplay.jsx
import React from 'react';
import {
  Grid,
  Typography,
  ButtonGroup,
  Button
} from '@mui/material';

function MonthlyStatsDisplay({ 
  viewMode, 
  setViewMode, 
  monthStats, 
  unpaidLessons, 
  expiredPackages 
}) {
  return (
    <Grid container spacing={2}>
      {viewMode === 'payments' ? (
        /* Statistiche per i pagamenti effettuati */
        <>
          <Grid item xs={12} sm={2.5}>
            <Typography variant="body2" color="text.secondary">
              Incasso
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              €{monthStats.totalAmount.toFixed(2)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={1.5}>
            <Typography variant="body2" color="text.secondary">
              Pacchetti
            </Typography>
            <Typography variant="h5">
              {monthStats.packagePaymentsCount}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Typography variant="body2" color="text.secondary">
              Totale da pacchetti
            </Typography>
            <Typography variant="h5" color="darkviolet" fontWeight="bold">
              €{monthStats.packagePaymentsTotal.toFixed(2)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Typography variant="body2" color="text.secondary">
              Lezioni singole
            </Typography>
            <Typography variant="h5">
              {monthStats.lessonHours.toFixed(1)} ore
            </Typography>
          </Grid>

          <Grid item xs={12} sm={2}>
            <Typography variant="body2" color="text.secondary">
              Totale da lezioni
            </Typography>
            <Typography variant="h5" color="primary" fontWeight="bold">
              €{monthStats.lessonTotal.toFixed(2)}
            </Typography>
          </Grid>
        </>
      ) : (
        /* Statistiche per i pagamenti da ricevere */
        <>
          {/* Calcoli per statistiche "da pagare" */}
          {(() => {
            // Calcola totale da lezioni non pagate
            const unpaidTotal = unpaidLessons.reduce((sum, lesson) => sum + lesson.amount, 0);
            const unpaidHours = unpaidLessons.reduce((sum, lesson) => sum + lesson.hours, 0);

            // Calcola totale da pacchetti scaduti
            const expiredPackagesCount = expiredPackages.length;
            const expiredPackagesTotal = expiredPackages.reduce((sum, pkg) => sum + pkg.amount, 0);

            // Totale complessivo da ricevere
            const totalToBePaid = unpaidTotal + expiredPackagesTotal;

            return (
              <>
                <Grid item xs={12} sm={2.5}>
                  <Typography variant="body2" color="text.secondary">
                    Da incassare
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="error.main">
                    €{totalToBePaid.toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Pacchetti
                  </Typography>
                  <Typography variant="h5">
                    {expiredPackagesCount}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={2}>
                  <Typography variant="body2" color="text.secondary">
                    Totale da pacchetti
                  </Typography>
                  <Typography variant="h5" color="warning.main" fontWeight="bold">
                    €{expiredPackagesTotal.toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={2}>
                  <Typography variant="body2" color="text.secondary">
                    Lezioni singole
                  </Typography>
                  <Typography variant="h5">
                    {unpaidHours.toFixed(1)} ore
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={2}>
                  <Typography variant="body2" color="text.secondary">
                    Totale da lezioni
                  </Typography>
                  <Typography variant="h5" color="secondary" fontWeight="bold">
                    €{unpaidTotal.toFixed(2)}
                  </Typography>
                </Grid>
              </>
            );
          })()}
        </>
      )}
      {/* Colonna del bottone di switch - posizionarlo in alto a destra */}
      <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: { xs: 2, sm: 0 } }}>
        <ButtonGroup size="small">
          <Button
            variant={viewMode === 'payments' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('payments')}
          >
            Pagato
          </Button>
          <Button
            variant={viewMode === 'unpaid' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('unpaid')}
          >
            Non pagato
          </Button>
        </ButtonGroup>
      </Grid>
    </Grid>
  );
}

export default MonthlyStatsDisplay;