// src/components/dashboard/DashboardCalendar.jsx
import React from 'react';
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
} from 'date-fns';
import AddIcon from '@mui/icons-material/Add';
import WifiIcon from '@mui/icons-material/Wifi';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';

import {
  startOfMonth,
  endOfMonth,
  getDay,
} from 'date-fns';

function DashboardCalendar({
  currentWeekStart,
  getLessonsForDay,
  studentsMap,
  handleLessonClick,
  handleDayClick,
  handleAddLessonClick,
  viewMode = 'week', // Aggiungi questa prop con default
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Genera i giorni della settimana corrente (da lunedì a domenica)
  // Determina se visualizzare la vista mensile o settimanale
  const isMonthView = viewMode === 'month';

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

  const daysOfWeek = getDaysToDisplay();

  // Funzione per ordinare le lezioni per orario di inizio
  const sortLessonsByTime = (lessons) => {
    if (!Array.isArray(lessons)) return [];

    return [...lessons].sort((a, b) => {
      // Estrae l'ora dall'attributo start_time (formato "HH:MM:SS")
      const timeA = a && a.start_time ? a.start_time.substring(0, 5) : '00:00';
      const timeB = b && b.start_time ? b.start_time.substring(0, 5) : '00:00';

      // Confronta le stringhe di orario
      return timeA.localeCompare(timeB);
    });
  };

  // Get weekday names
  const weekdays = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

  // Componente per visualizzare un singolo giorno - riutilizzabile sia per mobile che desktop
  // Componente per visualizzare un singolo giorno - riutilizzabile sia per mobile che desktop
  const DayComponent = ({ day, index, isMobile }) => {
    const dayLessons = getLessonsForDay(day);
    const hasLessons = dayLessons.length > 0;
    // Ordina le lezioni per orario di inizio
    const sortedLessons = sortLessonsByTime(dayLessons);
    const isCurrentDay = isToday(day);

    return (
      <Paper
        sx={{
          p: 1,
          height: isMobile ? 'auto' : '100%',
          minHeight: isMobile ? 120 : isMonthView ? 150 : 'auto',
          border: '1px solid',
          borderColor: isCurrentDay ? 'primary.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: 0,
          display: 'flex',
          flexDirection: 'column',
          mb: isMobile ? 2 : 0,
        }}
      >
        {/* Intestazione del giorno - IDENTICA ad AdminDashboardCalendar */}
        {isMobile ? (
          // Mobile: sempre mostra intestazione con formato "lun 15"
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
              {["lun", "mar", "mer", "gio", "ven", "sab", "dom"][(day.getDay() === 0 ? 6 : day.getDay() - 1)]} {format(day, 'd')}
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
        ) : isMonthView ? (
          // Desktop Vista Mensile: solo numero in alto a destra
          <Box sx={{
            fontWeight: isCurrentDay ? 'bold' : 'normal',
            textAlign: 'right',
            color: isCurrentDay ? 'primary.main' : 'text.primary',
            position: 'absolute',
            top: 2,
            right: 4,
            fontSize: '0.9rem'
          }}>
            {format(day, 'd')}
          </Box>
        ) : null}

        {/* Contenuto del giorno */}
        {/* Contenuto del giorno */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Box sx={{ overflowY: 'auto', height: '100%' }}>
            {/* Titolo numero lezioni solo per desktop settimanale */}
            {!isMobile && !isMonthView && (
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ fontSize: '0.75rem', mb: 0.5 }}
              >
                {hasLessons ? `${dayLessons.length} lezion${dayLessons.length === 1 ? 'e' : 'i'}` : 'Nessuna lezione'}
              </Typography>
            )}

            {/* Lezioni esistenti */}
            {sortedLessons.map((lesson, idx) => (
              <Box
                key={`lesson-${lesson.id}-${idx}`}
                sx={{
                  mb: 0.5,
                  py: 0.5,
                  minHeight: isMonthView ? '28px' : '28px',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  color: 'text.primary',
                  opacity: 0.85,
                  position: 'relative',
                  px: 1,
                  cursor: 'pointer',
                  mx: 'auto',
                  display: 'flex',
                  alignItems: isMonthView ? 'center' : 'flex-start',
                  justifyContent: 'flex-start',
                  flexDirection: isMonthView ? 'row' : 'column',
                  '&:hover': {
                    opacity: 1,
                    boxShadow: 1
                  }
                }}
                onClick={(e) => {
                  handleLessonClick(lesson);
                }}
              >
                {isMonthView ? (
                  // Vista mensile: formato compatto "orario - nome"
                  <>
                    <Typography variant="body2" sx={{
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      fontWeight: 'medium',
                      mr: 1
                    }}>
                      {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                    </Typography>
                    <Typography variant="body2" sx={{
                      color: 'text.primary',
                      fontSize: '0.75rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }}>
                      - {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                    </Typography>
                  </>
                ) : (
                  // Vista settimanale: formato originale su più righe
                  <>
                    <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontSize: '0.8rem', fontWeight: 'medium' }}>
                      {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontSize: '0.75rem' }}>
                      {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                      {parseFloat(lesson.duration) === 1 ? '1 ora' : `${lesson.duration} ore`}
                    </Typography>
                  </>
                )}

                {/* Chip per lezione in pacchetto */}
                {lesson.is_package && (
                  <Chip
                    label="P"
                    size="small"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: isMonthView ? 2 : 3,
                      right: isMonthView ? 2 : 3,
                      borderRadius: 1,
                      width: 'auto',
                      minWidth: '22px',
                      height: isMonthView ? 14 : 16,
                      fontSize: isMonthView ? '0.6rem' : '0.650rem',
                    }}
                  />
                )}

                {/* Chip per lezione online */}
                {lesson.is_online && (
                  <Chip
                    label=""
                    icon={<WifiIcon style={{ fontSize: isMonthView ? '0.6rem' : '0.7rem' }} />}
                    size="small"
                    color="secondary"
                    sx={{
                      position: 'absolute',
                      bottom: isMonthView ? 2 : 3,
                      right: isMonthView ? 2 : 3,
                      borderRadius: 1,
                      width: 'auto',
                      minWidth: '22px',
                      height: isMonthView ? 14 : 16,
                      fontSize: isMonthView ? '0.6rem' : '0.650rem',
                      '& .MuiChip-icon': {
                        margin: 0,
                      },
                      '& .MuiChip-label': {
                        display: 'none',
                      }
                    }}
                  />
                )}
              </Box>
            ))}

            {/* Pulsante "Nuova lezione" - SEMPRE presente nella vista settimanale, subito dopo le lezioni */}
            {!isMonthView && (
              <Box
                sx={{
                  mb: 0.5,
                  py: 0.5,
                  minHeight: '56px',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  color: 'text.primary',
                  opacity: 0.85,
                  position: 'relative',
                  px: 1,
                  cursor: 'pointer',
                  mx: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&:hover': {
                    opacity: 1,
                    boxShadow: 1
                  }
                }}
                onClick={(e) => {
                  handleAddLessonClick(day);
                }}
              >
                <AddIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.9rem' }} />
                <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.75rem', fontWeight: 'medium' }}>
                  Nuova lezione
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Pulsanti in fondo */}
        <Box sx={{ mt: 'auto' }}>
          {/* Pulsante Aggiungi Lezione - solo vista mensile */}
          {isMonthView && (
            <Button
              fullWidth
              startIcon={<AddIcon fontSize="small" />}
              variant="text"
              size="small"
              onClick={(e) => {
                handleAddLessonClick(day);
              }}
              sx={{
                mb: 0.5,
                py: 0.3,
                minHeight: '28px',
                fontSize: '0.7rem',
                bgcolor: 'action.hover',
                justifyContent: 'center',
                color: 'text.primary',
                opacity: 0.85,
                '&:hover': {
                  backgroundColor: 'action.hover',
                  boxShadow: 1,
                  opacity: 1,
                }
              }}
            >
              Nuova lezione
            </Button>
          )}

          <Button
            fullWidth
            startIcon={<ViewTimelineIcon fontSize="small" />}
            variant="text"
            size="small"
            onClick={(e) => {
              handleDayClick(day);
            }}
            sx={{
              mt: 0.5,
              py: 0.3,
              minHeight: '28px',
              fontSize: '0.7rem',
              bgcolor: 'action.hover',
              justifyContent: 'center',
              color: 'text.primary',
              opacity: 0.85,
              '&:hover': {
                backgroundColor: 'action.hover',
                boxShadow: 1,
                opacity: 1,
              }
            }}
          >
            Timeline
          </Button>
        </Box>
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
    const allDaysWithEmpty = [...emptyDays, ...daysOfWeek];

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
              <Paper
                sx={{
                  height: '100%',
                  minHeight: isMonthView ? 150 : 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  boxShadow: 0,
                  backgroundColor: 'inherit'
                }}
              />
            )}
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      {/* Layout Desktop */}
      {!isMobile && (
        <>
          {isMonthView ? (
            // Vista mensile desktop
            renderMonthGrid()
          ) : (
            // Vista settimanale desktop (mantieni il codice esistente)
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
                        borderRadius: 1,
                      }}
                    >
                      {day} {daysOfWeek[index] && format(daysOfWeek[index], 'd')}
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Days of the week - Layout desktop */}
              <Grid container spacing={1}>
                {daysOfWeek.map((day, index) => (
                  <Grid item xs={12 / 7} key={`day-${index}`}>
                    <DayComponent day={day} index={index} isMobile={false} />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      )}

      {/* Layout Mobile - giorni in verticale (mantieni il codice esistente) */}
      {isMobile && (
        <Box>
          {daysOfWeek.map((day, index) => (
            <Box key={`day-mobile-${index}`} sx={{ mb: 2 }}>
              <DayComponent day={day} index={index} isMobile={true} />
            </Box>
          ))}
        </Box>
      )}
    </Card>
  );
}

export default DashboardCalendar;