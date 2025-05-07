import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

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
  let color;
  if (percentage >= 100) {
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
      title={`Pacchetto aperto: ${usedHours.toFixed(1)} di ${totalHours.toFixed(1)} ore - ${percentage.toFixed(0)}% utilizzato`}
      style={{
        position: 'relative',
        width: 150,
        height: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}
    >
      <svg width="150" height="150" viewBox="0 0 100 100">
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
          bottom: '10px',
          color: '#555'
        }}
      >
        Pacc. aperto
      </div>
    </div>
  );
};

const PackageCompletion = ({ totalHours, weeklyLessons = [0, 0, 0, 0], extraHours = 0, hoursBeforeStart = 0 }) => {
  // Usa il tema e i media query di Material-UI per rendere il componente responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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

  // Calcola le ore totali utilizzate
  const totalUsedHours = usedHoursInFourWeeks + extraHours;

  // Calcola le ore teoriche disponibili per ore extra
  // Sono le ore totali meno quelle già svolte nelle 4 settimane
  const availableExtraHours = Math.max(0, totalHours - usedHoursInFourWeeks);

  // Determina se mostrare l'anello delle ore extra
  // Lo mostriamo solo se ci sono ore extra e se non abbiamo già utilizzato tutte le ore nelle 4 settimane
  const showExtraHours = extraHours > 0 && availableExtraHours > 0;

  if (isOpenPackage) {
    return (
      <div style={{ marginTop: '1px' }}>
        <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '26px' }}>
          Utilizzo ore pacchetto
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <OpenPackageRing totalHours={totalHours} usedHours={totalUsedHours} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1px' }}>
      <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '26px' }}>
        Utilizzo Pacchetto
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: getGridColumns(),
        gap: '4px',
        width: '100%',
        overflowX: 'auto'
      }}>
        {/* Anelli per le 4 settimane */}
        {weeklyLessons.map((hours, index) => (
          <div style={{ display: 'flex', justifyContent: 'center' }} key={`week-container-${index}`}>
            <ProgressArc
              key={`week-${index}`}
              value={hours}
              max={theoreticalHoursPerWeek}
              label={`Sett. ${index + 1}`}
              index={index}
            />
          </div>
        ))}

        {/* Anello per le ore extra (se presenti e se ci sono ore disponibili) */}
        {showExtraHours && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ProgressArc
              value={extraHours}
              max={availableExtraHours}
              label="Extra"
              index={4}
              isExtra={true}
            />
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '8px',
        paddingLeft: '16px',
        paddingRight: '8px',
        fontSize: '0.65rem',
        color: 'rgba(0, 0, 0, 0.6)'
      }}>
        <div></div>
        {hoursBeforeStart > 0 && (
          <div>
            ⚠️ Attenzione: ci sono {hoursBeforeStart.toFixed(1)} ore svolte prima della data di inizio del pacchetto.
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageCompletion;