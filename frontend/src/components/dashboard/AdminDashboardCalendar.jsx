// Modifiche necessarie per AdminDashboardCalendar.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Grid,
  Paper,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  format,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isEqual,
  parseISO,
  startOfMonth,
  endOfMonth,
  getDay,
  getDaysInMonth,
} from 'date-fns';
import { it } from 'date-fns/locale';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';

// Componente per il contenitore di chip con autoscroll
const ScrollableChipsContainer = ({ children }) => {
  const containerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [needsScroll, setNeedsScroll] = useState(false);

  // Verifica se il contenuto necessita di scroll
  useEffect(() => {
    if (containerRef.current) {
      setNeedsScroll(
        containerRef.current.scrollHeight > containerRef.current.clientHeight
      );
    }
  }, [children]);

  // Gestisce l'effetto di scroll automatico
  useEffect(() => {
    if (!isHovering || !needsScroll || !containerRef.current) return;

    let animationId;
    let scrollTop = 0;
    let pauseTimer = null;
    let isPaused = true; // Inizia in pausa all'inizio
    const scrollSpeed = 0.2; // Velocità di scroll (pixel per frame)
    const pauseDuration = 700; // Pausa di 700 millisecondi sia all'inizio che alla fine
    const maxScrollTop = containerRef.current.scrollHeight - containerRef.current.clientHeight;

    // Funzione ricorsiva per l'animazione
    const scrollAnimation = () => {
      if (!containerRef.current) return;

      if (isPaused) {
        // Quando è in pausa, attendi e poi continua
        return;
      }

      // Aggiorna la posizione di scroll
      scrollTop += scrollSpeed;

      // Quando raggiunge il fondo, metti in pausa
      if (scrollTop >= maxScrollTop) {
        isPaused = true;
        scrollTop = maxScrollTop; // Assicurati di essere esattamente in fondo

        // Dopo la pausa, torna in cima e riprendi
        pauseTimer = setTimeout(() => {
          scrollTop = 0;
          containerRef.current.scrollTop = 0;

          // Rimani fermo per un momento anche all'inizio
          pauseTimer = setTimeout(() => {
            isPaused = false;
            animationId = requestAnimationFrame(scrollAnimation);
          }, pauseDuration);

        }, pauseDuration);

        return;
      }

      // Applica lo scroll
      containerRef.current.scrollTop = scrollTop;

      // Continua l'animazione
      animationId = requestAnimationFrame(scrollAnimation);
    };

    // Inizia con una pausa all'inizio
    pauseTimer = setTimeout(() => {
      isPaused = false;
      animationId = requestAnimationFrame(scrollAnimation);
    }, pauseDuration);

    // Pulizia quando l'hover finisce
    return () => {
      if (pauseTimer) clearTimeout(pauseTimer);
      cancelAnimationFrame(animationId);

      // Torna in cima quando il mouse esce
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    };
  }, [isHovering, needsScroll]);

  return (
    <Box
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px',
        mt: 0,
        mb: 1,
        maxHeight: '80px',
        overflow: 'hidden',
        overflowY: 'auto',
        flexGrow: 1,
        position: 'relative',
        zIndex: 1,
        scrollbarWidth: 'none', // Firefox
        '&::-webkit-scrollbar': { // Chrome/Safari/Edge
          display: 'none'
        },
        msOverflowStyle: 'none', // IE
        // Assicuriamo che lo scroll avvenga solo all'interno del contenitore
        containIntrinsic: 'size layout',
        // Assicuriamo che il contenitore non superi il suo contenitore padre
        overflowX: 'hidden',
        // Fermiamo lo scroll animato quando l'utente interagisce
        '&:hover': {
          animation: 'none'
        }
      }}
    >
      {children}
    </Box>
  );
};

function AdminDashboardCalendar({
  currentWeekStart,
  getProfessorsForDay,
  handleProfessorClick,
  handleDayClick,
  lessons = []
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Determina se visualizzare la vista mensile o settimanale
  const isMonthView = currentWeekStart && currentWeekStart.getDate() === 1;

  // Genera i giorni appropriati in base alla vista corrente
  const getDaysToDisplay = () => {
    if (isMonthView) {
      // Vista mensile: tutti i giorni del mese
      const monthStart = currentWeekStart;
      const monthEnd = endOfMonth(monthStart);
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    } else {
      // Vista settimanale: lunedì a domenica
      return eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
      });
    }
  };

  const daysOfPeriod = getDaysToDisplay();

  // Funzione per formattare i dati dei professori per un determinato giorno
  const getProfessorChipsForDay = (day) => {
    const professors = getProfessorsForDay(day);

    // Ottieni le lezioni di questo giorno
    const dayLessons = lessons.filter(lesson => {
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return isEqual(
          new Date(lessonDate.getFullYear(), lessonDate.getMonth(), lessonDate.getDate()),
          new Date(day.getFullYear(), day.getMonth(), day.getDate())
        );
      } catch (err) {
        return false;
      }
    });

    // Per ogni professore, controlla se TUTTE le lezioni sono online
    const professorsOnlineStatus = {};

    // Prima, inizializza con contatori per ogni professore
    professors.forEach(professor => {
      professorsOnlineStatus[professor.id] = {
        totalLessons: 0,
        onlineLessons: 0
      };
    });

    // Poi conta le lezioni totali e online per ogni professore
    dayLessons.forEach(lesson => {
      if (lesson.professor_id && professorsOnlineStatus[lesson.professor_id]) {
        professorsOnlineStatus[lesson.professor_id].totalLessons++;

        if (lesson.is_online) {
          professorsOnlineStatus[lesson.professor_id].onlineLessons++;
        }
      }
    });

    // Formatta i dati per ogni professore
    return professors.map(professor => {
      const stats = professorsOnlineStatus[professor.id];
      // Un professore è considerato "online" solo se tutte le sue lezioni sono online
      // E se ha almeno una lezione nel giorno
      const isFullyOnline = stats.totalLessons > 0 && stats.totalLessons === stats.onlineLessons;

      return {
        id: professor.id,
        name: `${professor.first_name.charAt(0)}. ${professor.last_name}`,
        isOnline: isFullyOnline
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Get weekday names
  const weekdays = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

  // Componente per visualizzare un singolo giorno - riutilizzabile sia per mobile che desktop
  const DayComponent = ({ day, index, isMobile }) => {
    const isCurrentDay = isToday(day);
    const dayProfessors = getProfessorChipsForDay(day);
    const hasProfessors = dayProfessors.length > 0;

    return (
      <Paper
        sx={{
          p: 1,
          height: isMobile ? 'auto' : '100%',  // Altezza flessibile su mobile
          minHeight: isMobile ? 120 : isMonthView ? 80 : 'auto', // Altezza minima variabile in base alla vista
          border: '1px solid',
          borderColor: isCurrentDay ? 'primary.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 0,
          display: 'flex',
          flexDirection: 'column',
          mb: isMobile ? 2 : 0, // Margine inferiore solo su mobile
        }}
      >
        {/* Intestazione del giorno su mobile o vista mensile */}
        {(isMobile || isMonthView) && (
          <Box
            sx={{
              mb: 1,
              pb: 1,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: isCurrentDay ? 'bold' : 'normal',
                color: isCurrentDay ? 'primary.main' : 'inherit',
                fontSize: isMonthView ? '0.85rem' : 'inherit',
              }}
            >
              {isMonthView ? format(day, 'd') : `${weekdays[index]} ${format(day, 'd')}`}
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
        )}

        {hasProfessors ? (
          <>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ fontSize: '0.75rem', mb: 0.5 }}
            >
              {dayProfessors.length} professor{dayProfessors.length === 1 ? 'e' : 'i'}
            </Typography>

            <ScrollableChipsContainer>
              {dayProfessors.map((professor) => (
                <Chip
                  key={professor.id}
                  label={professor.name}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProfessorClick(professor.id);
                  }}
                  sx={{
                    height: 16,
                    margin: '1px',
                    backgroundColor: professor.isOnline ? 'secondary.main' : 'primary.main',
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

            {/* Pulsante per visualizzare i dettagli del giorno */}
            <Button
              variant="text"
              size="small"
              startIcon={<ViewTimelineIcon fontSize="small" />}
              onClick={(e) => {
                e.stopPropagation();
                handleDayClick(day);
              }}
              sx={{
                mt: 'auto',
                mx: 'auto',  // Aggiungi questo per centrare orizzontalmente
                padding: '3px 8px',
                minHeight: '28px',
                width: 'calc(100% - 4px)',  // Modifica da (100% - 8px) a (100% - 4px)
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: 'text.primary',
                opacity: 0.85,
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  boxShadow: 1,
                  opacity: 1,
                }
              }}
            >
              Timeline
            </Button>
          </>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
              fontStyle: 'italic',
              fontSize: '0.8rem'
            }}
          >
            Nessun professore
          </Box>
        )}
      </Paper>
    );
  };

  // Griglia di giorni per layout desktop nella vista mensile
  const renderMonthGrid = () => {
    // Determina il giorno della settimana del primo giorno del mese (0 = domenica, 1 = lunedì, ..., 6 = sabato)
    const firstDayOfMonth = getDay(currentWeekStart);
    
    // Adatta il valore per iniziare dal lunedì (0 = lunedì, ..., 6 = domenica)
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    // Crea la griglia con celle vuote all'inizio per allineare i giorni correttamente
    const emptyDays = Array(adjustedFirstDay).fill(null);
    const allDaysWithEmpty = [...emptyDays, ...daysOfPeriod];
    
    return (
      <Grid container spacing={1}>
        {/* Intestazione con i giorni della settimana */}
        {weekdays.map((day, index) => (
          <Grid item xs={12 / 7} key={`weekday-${index}`}>
            <Paper
              elevation={0}
              sx={{
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                fontWeight: 'bold',
                textAlign: 'center',
                borderRadius: 1,
              }}
            >
              {day}
            </Paper>
          </Grid>
        ))}
        
        {/* Celle dei giorni */}
        {allDaysWithEmpty.map((day, index) => (
          <Grid item xs={12 / 7} key={`day-${index}`}>
            {day ? (
              <DayComponent day={day} index={index - adjustedFirstDay} isMobile={false} />
            ) : (
              <Box sx={{ height: '80px' }} /> // Cella vuota
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Card sx={{ mt: 0, p: 2, mb: 0 }}>
      {!isMobile && (
        <>
          {isMonthView ? (
            // Vista mensile desktop
            renderMonthGrid()
          ) : (
            // Vista settimanale desktop
            <Grid container spacing={1}>
              {/* Intestazione dei giorni della settimana */}
              {daysOfPeriod.map((day, index) => (
                <Grid item xs={12 / 7} key={`header-${index}`}>
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'primary.contrastText',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      borderRadius: 1,
                    }}
                  >
                    {format(day, 'EEE d', { locale: it })}
                  </Paper>
                </Grid>
              ))}

              {/* Celle dei giorni con professori - Layout desktop */}
              {daysOfPeriod.map((day, index) => (
                <Grid item xs={12 / 7} key={`day-${index}`}>
                  <DayComponent day={day} index={index} isMobile={false} />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Layout Mobile - giorni in verticale */}
      {isMobile && (
        <Box>
          {daysOfPeriod.map((day, index) => (
            <Box key={`day-mobile-${index}`} sx={{ mb: 2 }}>
              <DayComponent day={day} index={index} isMobile={true} />
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}

export default AdminDashboardCalendar;