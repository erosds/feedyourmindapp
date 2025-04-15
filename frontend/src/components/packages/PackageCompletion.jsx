import React from 'react';

// Un componente per visualizzare un anello aperto che mostra il progresso
const ProgressArc = ({ value, max, color, label, index, isExtra = false }) => {
  // Calcola la percentuale di completamento (limitata al 100%)
  const percentage = Math.min(100, (value / max) * 100);
  
  // Raggio dell'anello
  const radius = 40;
  // Spessore dell'anello
  const strokeWidth = 8;
  // Circonferenza del cerchio
  const circumference = 2 * Math.PI * radius;
  // Angolo di apertura (in radianti) - lasciamo un'apertura di 60 gradi
  const openingAngle = (Math.PI / 3);
  // Angolo iniziale (in radianti) - varia in base all'indice per posizionare l'anello
  const startAngle = (-Math.PI * 4/3);
  
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
      <div
        style={{ 
          position: 'absolute',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.7rem'
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
  
  return (
    <div 
      className="open-package-ring"
      title={`Pacchetto aperto: ${usedHours.toFixed(1)} di ${totalHours.toFixed(1)} ore - ${percentage.toFixed(0)}% utilizzato`}
      style={{
        position: 'relative',
        width: 160,
        height: 160,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg width="160" height="160" viewBox="0 0 100 100">
        {/* Cerchio grigio di sfondo */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="8"
        />
        {/* Cerchio colorato che rappresenta il progresso */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#3f51b5"
          strokeWidth="8"
          strokeDasharray={`${2 * Math.PI * 45 * (percentage / 100)} ${2 * Math.PI * 45}`}
          strokeDashoffset="0"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div 
        style={{ 
          position: 'absolute',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '0.875rem'
        }}
      >
        {usedHours.toFixed(1)}/{totalHours.toFixed(1)} ore
      </div>
    </div>
  );
};

const PackageCompletion = ({ totalHours, weeklyLessons = [0, 0, 0, 0], extraHours = 0 }) => {
  // Valore teorico di ore per settimana
  const theoreticalHoursPerWeek = totalHours <= 24 ? totalHours / 4 : 0;
  
  // Per i pacchetti aperti (> 24 ore)
  const isOpenPackage = totalHours > 24;
  
  // Calcola le ore totali utilizzate
  const usedHours = weeklyLessons.reduce((total, hours) => total + hours, 0) + extraHours;
  
  // Colori per le settimane
  const weekColors = ['#3f51b5', '#5c6bc0', '#7986cb', '#9fa8da'];
  // Colore per le ore extra
  const extraColor = '#e91e63';
  
  if (isOpenPackage) {
    return (
      <div style={{ marginTop: '1px' }}>
        <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '8px' }}>
          Utilizzo ore pacchetto
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <OpenPackageRing totalHours={totalHours} usedHours={usedHours} />
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ marginTop: '1px' }}>
      <div style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', marginBottom: '8px' }}>
        Utilizzo ore pacchetto
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'center' 
      }}>
        {/* Anelli per le 4 settimane */}
        {weeklyLessons.map((hours, index) => (
          <ProgressArc 
            key={`week-${index}`}
            value={hours}
            max={theoreticalHoursPerWeek}
            color={weekColors[index]}
            label={`Sett. ${index + 1}`}
            index={index}
          />
        ))}
        
        {/* Anello per le ore extra (se presenti) */}
        {extraHours > 0 && (
          <ProgressArc 
            value={extraHours}
            max={theoreticalHoursPerWeek} // Usiamo lo stesso riferimento delle altre settimane
            color={extraColor}
            label="Extra"
            index={4}
            isExtra={true}
          />
        )}
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginTop: '8px',
        paddingLeft: '16px',
        paddingRight: '16px',
        fontSize: '0.75rem',
        color: 'rgba(0, 0, 0, 0.6)'
      }}>
        <div>
          Ore settimanali ideali: {theoreticalHoursPerWeek.toFixed(1)}h
        </div>
        <div>
          Totale utilizzato: {usedHours.toFixed(1)}/{totalHours.toFixed(1)}h
        </div>
      </div>
    </div>
  );
};

export default PackageCompletion;