// src/components/packages/PackageStatusCard.jsx
import React from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Event as EventIcon,
  AccessTime as AccessTimeIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Euro as EuroIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';


/**
 * Componente che mostra lo stato di un pacchetto, inclusi i dettagli di scadenza per pacchetti a durata fissa
 * e le ore accumulate per pacchetti aperti
 */
function PackageStatusCard({ packageData, usedHours }) {
  if (!packageData) return null;

  const remainingHours = parseFloat(packageData.remaining_hours);
  const totalHours = parseFloat(packageData.total_hours);
  
  // Calcola percentuale di completamento in modo diverso in base al tipo di pacchetto
  let completionPercentage;
  let statusText;
  let progressVariant = "determinate";
  let progressColor = "primary";
  
  if (packageData.package_type === 'fixed') {
    // Per pacchetti fissi, la percentuale è data dalle ore utilizzate rispetto al totale
    completionPercentage = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;
    statusText = `${remainingHours.toFixed(1)} ore rimanenti`;
    
    // Se il pacchetto è completato, cambia colore
    if (packageData.status === 'completed') {
      progressColor = "success";
    }
  } else {
    // Per pacchetti aperti
    if (packageData.is_paid) {
      // Se pagato, mostra percentuale utilizzata rispetto al totale fissato
      completionPercentage = 100; // Sempre 100% perché il pacchetto è pagato
      statusText = `${totalHours.toFixed(1)} ore fissate`;
      progressColor = "success";
    } else {
      // Se non pagato, è in accumulazione - usa barra indeterminata
      progressVariant = "indeterminate";
      statusText = `${usedHours.toFixed(1)} ore accumulate`;
    }
  }
  
  // Calcola se il pacchetto è scaduto (solo per pacchetti a durata fissa)
  const isExpired = packageData.package_type === 'fixed' && 
                   packageData.expiry_date && 
                   isAfter(new Date(), parseISO(packageData.expiry_date));
  
  // Calcola i giorni rimanenti alla scadenza
  let daysUntilExpiry = null;
  if (packageData.package_type === 'fixed' && packageData.expiry_date) {
    const expiryDate = parseISO(packageData.expiry_date);
    daysUntilExpiry = differenceInDays(expiryDate, new Date());
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Stato Pacchetto
        </Typography>
        
        <Box display="flex" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Chip
            label={packageData.status === 'in_progress' ? 'In corso' : 'Completato'}
            color={packageData.status === 'in_progress' ? 'primary' : 'default'}
          />
          
          <Chip
            icon={packageData.is_paid ? <CheckIcon /> : <CancelIcon />}
            label={packageData.is_paid ? 'Pagato' : 'Non pagato'}
            color={packageData.is_paid ? 'success' : 'error'}
            variant="outlined"
          />
          
          <Chip
            label={packageData.package_type === 'fixed' ? 'Pacchetto 4 settimane' : 'Pacchetto aperto'}
            color={packageData.package_type === 'fixed' ? 'primary' : 'info'}
            variant="outlined"
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" alignItems="center" mb={2}>
          <EventIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Data inizio:
          </Typography>
          <Typography variant="body1" sx={{ ml: 1 }}>
            {format(parseISO(packageData.start_date), "dd MMMM yyyy", { locale: it })}
          </Typography>
        </Box>
        
        {packageData.is_paid && packageData.payment_date && (
          <Box display="flex" alignItems="center" mb={2}>
            <EuroIcon sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Data pagamento:
            </Typography>
            <Typography variant="body1" sx={{ ml: 1 }}>
              {format(parseISO(packageData.payment_date), "dd MMMM yyyy", { locale: it })}
            </Typography>
          </Box>
        )}
        
        {/* Mostra data di scadenza solo per pacchetti fissi */}
        {packageData.package_type === 'fixed' && packageData.expiry_date && (
          <Box display="flex" alignItems="center" mb={2}>
            <TimerIcon sx={{ mr: 1, color: isExpired ? 'error.main' : 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Data scadenza:
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                ml: 1, 
                color: isExpired ? 'error.main' : 'inherit',
                fontWeight: isExpired ? 'bold' : 'normal'
              }}
            >
              {format(parseISO(packageData.expiry_date), "dd MMMM yyyy", { locale: it })}
            </Typography>
            {daysUntilExpiry !== null && (
              <Chip
                label={isExpired 
                  ? `Scaduto da ${Math.abs(daysUntilExpiry)} giorni` 
                  : `${daysUntilExpiry} giorni rimanenti`}
                color={isExpired ? "error" : (daysUntilExpiry <= 7 ? "warning" : "success")}
                size="small"
                sx={{ ml: 2 }}
              />
            )}
          </Box>
        )}
        
        {/* Visualizzazione ore diverse per tipo di pacchetto */}
        <Box display="flex" alignItems="center" mb={2}>
          <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {packageData.package_type === 'fixed' ? 'Ore utilizzate/totali:' : 
             (packageData.is_paid ? 'Ore utilizzate/fissate:' : 'Ore accumulate:')}
          </Typography>
          <Typography variant="body1" sx={{ ml: 1 }}>
            {packageData.package_type === 'fixed' ? 
              `${usedHours.toFixed(1)} / ${totalHours.toFixed(1)} (${completionPercentage.toFixed(0)}%)` :
              (packageData.is_paid ? 
                `${usedHours.toFixed(1)} / ${totalHours.toFixed(1)}` :
                `${usedHours.toFixed(1)}`)}
          </Typography>
        </Box>
        
        {/* Mostra costo solo se il pacchetto è pagato o è fisso */}
        {(packageData.is_paid || packageData.package_type === 'fixed') && (
          <Box display="flex" alignItems="center" mb={2}>
            <EuroIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Costo pacchetto:
            </Typography>
            <Typography variant="body1" fontWeight="bold" sx={{ ml: 1 }}>
              €{parseFloat(packageData.package_cost).toFixed(2)}
            </Typography>
          </Box>
        )}
        
        {/* Barra di progresso per pacchetti aperti e fissi */}
        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2">
              {packageData.package_type === 'fixed' ?
                "Completamento pacchetto:" :
                (packageData.is_paid ? "Stato pagamento:" : "Accumulo ore:")}
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {packageData.package_type === 'fixed' ?
                `${completionPercentage.toFixed(0)}%` :
                (packageData.is_paid ? "Completato" : "In corso")}
            </Typography>
          </Box>
          
          <LinearProgress
            variant={progressVariant}
            value={Math.min(completionPercentage, 100)}
            color={progressColor}
            sx={{ 
              height: 10, 
              borderRadius: 1, 
              mb: 1,
              backgroundImage: packageData.package_type === 'fixed' ?
                `repeating-linear-gradient(
                  to right,
                  transparent,
                  transparent 24.5%,
                  rgba(255,255,255,0.3) 24.5%,
                  rgba(255,255,255,0.3) 25%,
                  transparent 25%,
                  transparent 49.5%,
                  rgba(255,255,255,0.3) 49.5%,
                  rgba(255,255,255,0.3) 50%,
                  transparent 50%,
                  transparent 74.5%,
                  rgba(255,255,255,0.3) 74.5%,
                  rgba(255,255,255,0.3) 75%,
                  transparent 75%
                )` : 'none'
            }}
          />
        </Box>
        
        {/* Messaggio informativo basato sul tipo di pacchetto e stato */}
        {packageData.package_type === 'open' && !packageData.is_paid && (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              Pacchetto aperto in corso di registrazione. Il totale ore e il costo verranno confermati al pagamento.
            </Typography>
          </Alert>
        )}
        
        {packageData.package_type === 'fixed' && isExpired && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              Questo pacchetto è scaduto. Si consiglia di creare un nuovo pacchetto se necessario.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default PackageStatusCard;