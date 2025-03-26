// src/components/packages/PackageStatusCard.jsx
import React from 'react';
import {
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
  Cancel as CancelIcon
} from '@mui/icons-material';
import { format, parseISO, differenceInDays, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Componente che mostra lo stato di un pacchetto, inclusi i dettagli di scadenza per pacchetti a durata fissa
 */
function PackageStatusCard({ packageData, usedHours }) {
  if (!packageData) return null;

  const remainingHours = parseFloat(packageData.remaining_hours);
  const totalHours = parseFloat(packageData.total_hours);
  const completionPercentage = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;
  
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
        
        <Box display="flex" alignItems="center" mb={2}>
          <Chip
            label={packageData.status === 'in_progress' ? 'In corso' : 'Completato'}
            color={packageData.status === 'in_progress' ? 'primary' : 'default'}
            sx={{ mr: 1 }}
          />
          
          <Chip
            icon={packageData.is_paid ? <CheckIcon /> : <CancelIcon />}
            label={packageData.is_paid ? 'Pagato' : 'Non pagato'}
            color={packageData.is_paid ? 'success' : 'error'}
            variant="outlined"
          />
          
          {packageData.package_type === 'fixed' && (
            <Chip
              label="Pacchetto 4 settimane"
              color="secondary"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
          
          {packageData.package_type === 'open' && (
            <Chip
              label="Pacchetto aperto"
              color="info"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
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
        
        <Box display="flex" alignItems="center" mb={2}>
          <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            Ore utilizzate/totali:
          </Typography>
          <Typography variant="body1" sx={{ ml: 1 }}>
            {usedHours.toFixed(1)} / {totalHours.toFixed(1)} ({completionPercentage.toFixed(0)}%)
          </Typography>
        </Box>
        
        <LinearProgress
          variant="determinate"
          value={Math.min(completionPercentage, 100)}
          color={packageData.status === 'completed' ? 'success' : 'primary'}
          sx={{ height: 10, borderRadius: 1, mb: 1 }}
        />
        
        {packageData.package_type === 'open' && packageData.status === 'in_progress' && !packageData.is_paid && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
            Pacchetto aperto in corso di registrazione. Il totale ore e il costo verranno confermati al pagamento.
          </Typography>
        )}
        
        {packageData.is_paid && packageData.payment_date && (
          <Box display="flex" alignItems="center" mt={2}>
            <EventIcon sx={{ mr: 1, color: 'success.main' }} />
            <Typography variant="body2" color="text.secondary">
              Data pagamento:
            </Typography>
            <Typography variant="body1" sx={{ ml: 1 }}>
              {format(parseISO(packageData.payment_date), "dd MMMM yyyy", { locale: it })}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default PackageStatusCard;