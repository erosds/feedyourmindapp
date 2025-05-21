import React from 'react';
import { useMediaQuery, useTheme, Box, Typography, Grid } from '@mui/material';

// Un componente per visualizzare un anello aperto che mostra il progresso
const ProgressArc = ({ value, max, label, index, isExtra = false }) => {
  // Calcola la percentuale di completamento (limitata al 100%)
  const percentage = Math.min(100, (value / max) * 100);

  // Determina il colore in base al completamento
  let color;
  if (value > max) {
    // Se ha fatto più ore di quelle previste, usa il colore secondary
    color = '#f50057'; // Secondary color
  } else if (percentage >= 100) {
    // Se ha completato tutte le ore, usa un colore più scuro
    color = '#303f9f'; // Primary dark
  } else {
    // Altrimenti usa un colore tenue
    color = '#7986cb'; // Primary light
  }

  // Raggio dell'anello
  const radius = 40;
  // Spessore dell'anello
  const strokeWidth = 8;
  // Circonferenza del cerchio
  const circumference = 2 * Math.PI * radius;
  // Angolo di apertura (in radianti) - lasciamo un'apertura di 60 gradi
  const openingAngle = (Math.PI / 2);
  // Angolo iniziale (in radianti) - varia in base all'indice per posizionare l'anello
  const startAngle = (-Math.PI * 5 / 4);

  // Calcola l'arco da disegnare (tenendo conto dell'apertura)
  const arcAngle = (2 * Math.PI) - openingAngle;
  // Lunghezza dell'arco
  const arcLength = circumference * (arcAngle / (2 * Math.PI));
  // Quanto dell'arco è colorato in base al progresso
  const strokeDasharray = `${arcLength * (percentage / 100)} ${arcLength}`;

  // Calcola punti di inizio e fine dell'arco
  const startX = 50 + radius * Math.cos(startAngle);
  const startY = 50 + radius * Math.sin(startAngle);
  const endX = 50 + radius * Math.cos(startAngle + arcAngle);
  const endY = 50 + radius * Math.sin(startAngle + arcAngle);

  // Flag per determinare se l'arco è grande o piccolo
  const largeArcFlag = arcAngle > Math.PI ? 1 : 0;

  // Percorso SVG per l'arco
  const path = `
    M ${startX},${startY}
    A ${radius},${radius} 0 ${largeArcFlag},1 ${endX},${endY}
  `;

  return (
    <div
      className="progress-arc-wrapper"
      title={`${isExtra ? "Ore extra: " : `Settimana ${index + 1}: `} ${value.toFixed(1)} di ${max.toFixed(1)} ore - ${percentage.toFixed(0)}% completato`}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}
    >
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Sfondo grigio dell'arco */}
        <path
          d={path}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Arco colorato che rappresenta il progresso */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset="0"
        />
      </svg>
      {/* Ore svolte/ore teoriche al centro */}
      <div
        style={{
          position: 'absolute',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.7rem'
        }}
      >
        {value.toFixed(1)}/{max.toFixed(1)} h
      </div>
      {/* Numero della settimana in basso, nell'apertura dell'anello */}
      <div
        style={{
          position: 'absolute',
          textAlign: 'center',
          fontWeight: 'normal',
          fontSize: '0.65rem',
          bottom: '5px',
          color: '#555'
        }}
      >
        {label}
      </div>
    </div>
  );
};

// Un anello che rappresenta un pacchetto aperto
const OpenPackageRing = ({ totalHours, usedHours }) => {
  // Percentuale di utilizzo
  const percentage = Math.min(100, (usedHours / totalHours) * 100);

  // Determina il colore in base al completamento
  const color = '#7986cb'; // Usa un colore consistente per i pacchetti aperti

  // Raggio dell'anello
  const radius = 40;
  // Spessore dell'anello
  const strokeWidth = 8;
  // Circonferenza del cerchio
  const circumference = 2 * Math.PI * radius;
  // Angolo di apertura (in radianti)
  const openingAngle = (Math.PI / 2);
  // Angolo iniziale (in radianti)
  const startAngle = (-Math.PI * 5 / 4);

  // Calcola l'arco da disegnare (tenendo conto dell'apertura)
  const arcAngle = (2 * Math.PI) - openingAngle;
  // Lunghezza dell'arco
  const arcLength = circumference * (arcAngle / (2 * Math.PI));
  // Quanto dell'arco è colorato in base al progresso
  const strokeDasharray = `${arcLength * (percentage / 100)} ${arcLength}`;

  // Calcola punti di inizio e fine dell'arco
  const startX = 50 + radius * Math.cos(startAngle);
  const startY = 50 + radius * Math.sin(startAngle);
  const endX = 50 + radius * Math.cos(startAngle + arcAngle);
  const endY = 50 + radius * Math.sin(startAngle + arcAngle);

  // Flag per determinare se l'arco è grande o piccolo
  const largeArcFlag = arcAngle > Math.PI ? 1 : 0;

  // Percorso SVG per l'arco
  const path = `
    M ${startX},${startY}
    A ${radius},${radius} 0 ${largeArcFlag},1 ${endX},${endY}
  `;

  return (
    <div
      className="progress-arc-wrapper"
      title={`Pacchetto aperto: ${usedHours.toFixed(1)} di ${totalHours.toFixed(1)} ore - ${percentage.toFixed(0)}% utilizzato`}
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}
    >
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Sfondo grigio dell'arco */}
        <path
          d={path}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Arco colorato che rappresenta il progresso */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset="0"
        />
      </svg>
      {/* Ore svolte/ore teoriche al centro */}
      <div
        style={{
          position: 'absolute',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.7rem'
        }}
      >
        {usedHours.toFixed(1)}/{totalHours.toFixed(1)} h
      </div>
      {/* Etichetta pacchetto aperto nell'apertura dell'anello */}
      <div
        style={{
          position: 'absolute',
          textAlign: 'center',
          fontWeight: 'normal',
          fontSize: '0.65rem',
          bottom: '5px',
          color: '#555'
        }}
      >
        Pacchetto aperto
      </div>
    </div>
  );
};

const PackageCompletion = ({ totalHours, weeklyLessons = [0, 0, 0, 0], extraHours = 0, hoursBeforeStart = 0 }) => {
  // Usa il tema e i media query di Material-UI per rendere il componente responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Calcola le ore totali utilizzate
  const totalUsedHours = weeklyLessons.reduce((total, hours) => total + hours, 0) + extraHours + hoursBeforeStart;
  // Calcola le ore rimanenti
  const remainingHours = Math.max(0, totalHours - totalUsedHours);
  // Calcola la percentuale di completamento
  const completionPercentage = Math.min(100, (totalUsedHours / totalHours) * 100);

  // Determina il numero di colonne in base alla dimensione dello schermo
  const getGridColumns = () => {
    if (isMobile) {
      return 'repeat(2, 1fr)'; // 2 colonne su mobile
    } else if (isTablet) {
      return 'repeat(3, 1fr)'; // 3 colonne su tablet 
    } else {
      return showExtraHours ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)'; // 4-5 colonne su desktop
    }
  };

  // Valore teorico di ore per settimana
  const theoreticalHoursPerWeek = totalHours <= 30 ? totalHours / 4 : 0;

  // Per i pacchetti aperti (> 24 ore)
  const isOpenPackage = totalHours >= 30;

  // Calcola le ore totali utilizzate nelle 4 settimane (senza extra)
  const usedHoursInFourWeeks = weeklyLessons.reduce((total, hours) => total + hours, 0);

  // Calcola le ore teoriche disponibili per ore extra
  // Sono le ore totali meno quelle già svolte nelle 4 settimane
  const availableExtraHours = Math.max(0, totalHours - usedHoursInFourWeeks);

  // Determina se mostrare l'anello delle ore extra
  // Lo mostriamo solo se ci sono ore extra e se non abbiamo già utilizzato tutte le ore nelle 4 settimane
  const showExtraHours = extraHours > 0 && availableExtraHours > 0;

  if (isOpenPackage) {
    return (
      <Box sx={{ mb: 1 }}>
        {/* Barra con sfumatura per pacchetto aperto */}
        <Box sx={{ position: 'relative', width: '100%'}}>
          {/* Barra base grigia sfumata */}
          <Box sx={{
            position: 'absolute',
            width: '100%',
            height: '16px',
            borderRadius: '8px',
            top: '22px',
            background: 'linear-gradient(90deg, rgba(240,240,240,1) 0%, rgba(240,240,240,1) 70%, rgba(240,240,240,0.2) 100%)'
          }} />

          {/* Barra colorata solida che avanza */}
          <Box sx={{
            position: 'absolute',
            width: totalUsedHours > 0 ? `${Math.min(75, totalUsedHours * 4)}%` : '10%', // Limita a 75% della larghezza
            height: '16px',
            borderRadius: '8px',
            top: '22px',
            bgcolor: 'primary.main',
            transition: 'width 0.5s ease-in-out'
          }} />

          {/* Testo esplicativo sopra la barra */}
          <Typography
            variant="caption"
            color="primary.main"
            sx={{
              position: 'absolute',
              fontWeight: 'medium'
            }}
          >
            Pacchetto aperto
          </Typography>

          {/* Indicatore di ore utilizzate sulla barra, ora senza il trattino */}
          <Box sx={{
            position: 'absolute',
            left: totalUsedHours > 0 ? `${Math.min(73, totalUsedHours * 4.1)}%` : '8%',
            top: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Typography
              variant="caption"
              fontWeight="bold"
              sx={{ color: 'primary.main' }}
            >
              {totalUsedHours.toFixed(1)}h
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: -5 }}>
      {/* Aggiungi indicatori testuali delle ore */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 1 }}>
        <Grid item xs={5}>
          <Typography variant="subtitle2" color="text.secondary">
            Ore totali
          </Typography>
          <Typography variant="h6">
            {totalHours.toFixed(1)}
          </Typography>
        </Grid>
        <Grid item xs={3}>
          <Typography variant="subtitle2" color="text.secondary">
            Ore utilizzate
          </Typography>
          <Typography variant="h6" color={totalUsedHours === totalHours ? "success.main" : ""}>
            {totalUsedHours.toFixed(1)}
          </Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="subtitle2" color="text.secondary">
            Ore rimanenti
          </Typography>
          <Typography variant="h6">
            {remainingHours.toFixed(1)}
          </Typography>
        </Grid>
      </Grid>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: getGridColumns(),
        gap: '2px',
        overflowX: 'auto',
        py: 1,
      }}>
        {/* Anelli per le 4 settimane */}
        {weeklyLessons.map((hours, index) => (
          <Box sx={{ display: 'flex', justifyContent: 'center' }} key={`week-container-${index}`}>
            <ProgressArc
              key={`week-${index}`}
              value={hours}
              max={theoreticalHoursPerWeek}
              label={`Sett. ${index + 1}`}
              index={index}
            />
          </Box>
        ))}

        {/* Anello per le ore extra (se presenti e se ci sono ore disponibili) */}
        {showExtraHours && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ProgressArc
              value={extraHours}
              max={availableExtraHours}
              label="Extra"
              index={4}
              isExtra={true}
            />
          </Box>
        )}
      </Box>

      {/* Avviso per ore svolte prima dell'inizio del pacchetto */}
      {hoursBeforeStart > 0 && (
        <Typography
          variant="caption"
          color="warning.main"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 1,
            mb: 3,
            fontWeight: 'medium'
          }}
        >
          Ci sono {hoursBeforeStart.toFixed(1)} ore svolte prima della data di inizio del pacchetto.
        </Typography>
      )}
    </Box>
  );
};

export default PackageCompletion;