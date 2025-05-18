// src/components/lessons/PackageAlertsComponent.jsx
import React from 'react';
import { Alert, Box, Button, Chip, Typography } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link as RouterLink } from 'react-router-dom';

/**
 * Componente che gestisce tutti gli avvisi relativi ai pacchetti
 * nel dialogo di aggiunta lezioni
 */
function PackageAlertsComponent({
  error,
  context,
  fixedPackageId,
  lessonForm,
  localPackages,
  expiredPackages,
  recentlyEndedPackages,
  students
}) {
  return (
    <>
      {/* Errore generico */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Alert per pacchetti terminati recentemente */}
      {recentlyEndedPackages.length > 0 && localPackages.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {recentlyEndedPackages.length === 1
              ? "È stato rilevato un pacchetto terminato recentemente."
              : `Sono stati rilevati ${recentlyEndedPackages.length} pacchetti terminati recentemente.`}
            {" "}
            Se lo studente intende proseguire con un nuovo pacchetto, crealo prima gi aggiungere la lezione.
          </Typography>

          {recentlyEndedPackages.map((pkg, idx) => (
            <Box component="div" key={pkg.id} sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
              <Chip
                component={RouterLink}
                to={`/packages/${pkg.id}`}
                label={`Pacchetto #${pkg.id}`}
                color="default"
                variant="outlined"
                clickable
                sx={{
                  mr: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                  }
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {`${pkg.status === 'completed' ? 'Completato' : 'Scaduto (senza ore residue)'} il ${format(parseISO(pkg.expiry_date), 'dd/MM/yyyy')}`}
              </Typography>
            </Box>
          ))}

          <Box sx={{ mt: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              component={RouterLink}
              to={`/packages/new?student=${encodeURIComponent(students[lessonForm.student_id] || '')}`}
              variant="contained"
              color="primary"
              size="small"
              sx={{ fontSize: '0.8rem' }}
            >
              Crea nuovo pacchetto
            </Button>
          </Box>
        </Alert>
      )}

      {/* Alert per pacchetti scaduti con ore residue */}
      {expiredPackages.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Attenzione: lo studente ha {expiredPackages.length} pacchett{expiredPackages.length === 1 ? 'o' : 'i'} scadut{expiredPackages.length === 1 ? 'o' : 'i'} con ore residue.
            Prima di usare nuovi pacchetti, valuta di estendere quell{expiredPackages.length === 1 ? 'o' : 'i'} scadut{expiredPackages.length === 1 ? 'o' : 'i'} cliccando qui sotto.
          </Typography>
          
          {expiredPackages.map((pkg, idx) => (
            <Box component="div" key={pkg.id} sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
              <Chip
                component={RouterLink}
                to={`/packages/${pkg.id}`}
                label={`Pacchetto #${pkg.id}`}
                color="primary"
                variant="outlined"
                clickable
                sx={{
                  mr: 1.5,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                  }
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {`iniziato il ${format(parseISO(pkg.start_date), 'dd/MM/yyyy')} e scaduto il ${format(parseISO(pkg.expiry_date), 'dd/MM/yyyy')} - ${parseFloat(pkg.remaining_hours).toFixed(1)} ore rimanenti.`}
              </Typography>
            </Box>
          ))}
        </Alert>
      )}

      {/* Messaggio specifico per il contesto "packageDetail" */}
      {context === 'packageDetail' && fixedPackageId ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ display: 'inline' }}>
              Stai aggiungendo una nuova lezione direttamente al
            </Typography>
            <Chip
              component={RouterLink}
              to={`/packages/${fixedPackageId}`}
              label={`Pacchetto #${fixedPackageId}`}
              color="primary"
              variant="outlined"
              clickable
              size="small"
              sx={{
                mx: 0.5,
                my: 0.25,
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                }
              }}
            />
            <Typography variant="body2" sx={{ display: 'inline' }}>
              La lezione verrà automaticamente registrata come parte di questo pacchetto.
            </Typography>
          </Box>
        </Alert>
      ) : (
        /* Avviso per più pacchetti disponibili - solo nel contesto normale */
        lessonForm.student_id && localPackages.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              {localPackages.length > 1 ? (
                <>
                  Sono stati trovati {localPackages.length} pacchetti attivi per questo studente.
                  Assicurati di spuntare l'opzione sotto che indica che la lezione fa parte di un pacchetto.
                  Solitamente andrebbero esaurite prima le ore del pacchetto più vecchio.
                </>
              ) : (
                <>
                  È stato trovato un pacchetto attivo per questo studente.
                  Assicurati di spuntare l'opzione sotto che indica che la lezione fa parte di un pacchetto.
                </>
              )}
            </Typography>
          </Alert>
        )
      )}
    </>
  );
}

export default PackageAlertsComponent;