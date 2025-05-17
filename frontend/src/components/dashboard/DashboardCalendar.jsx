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

function DashboardCalendar({
  currentWeekStart,
  getLessonsForDay,
  studentsMap,
  handleLessonClick,
  handleDayClick,
  handleAddLessonClick
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Genera i giorni della settimana corrente (da lunedì a domenica)
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  });

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
  const DayComponent = ({ day, index, isMobile }) => {
    const dayLessons = getLessonsForDay(day);
    const hasLessons = dayLessons.length > 0;
    // Ordina le lezioni per orario di inizio
    const sortedLessons = sortLessonsByTime(dayLessons);
    const isCurrentDay = isToday(day);

    return (
      <Paper
        elevation={isCurrentDay ? 3 : 1}
        sx={{
          p: 1,
          height: 'auto',  // Altezza flessibile su mobile
          minHeight: isMobile ? 120 : 180, // Altezza minima per garantire consistenza
          border: '1px solid',
          borderColor: isCurrentDay ? 'primary.main' : 'divider',
          borderRadius: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 0,
          mb: isMobile ? 2 : 0, // Aggiungi un margine bottom su mobile
        }}
      >
        {/* Intestazione del giorno su mobile */}
        {isMobile && (
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
                color: isCurrentDay ? 'primary.main' : 'inherit'
              }}
            >
              {weekdays[index]} {format(day, 'd')}
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

        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          <Box sx={{ overflowY: 'auto', height: '100%'}}>
            {sortedLessons.map((lesson, idx) => (
              <Box
                key={`lesson-${lesson.id}-${idx}`}
                sx={{
                  mb: 0.5,
                  py: 0.5,
                  minHeight: '28px',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  color: 'text.primary',
                  opacity: 0.85,
                  position: 'relative',
                  px: 1, // Padding uniforme
                  cursor: 'pointer',
                  mx: 'auto', // Centra orizzontalmente
                  '&:hover': {
                    opacity: 1,
                    boxShadow: 1
                  }
                }}
                onClick={(e) => {
                  handleLessonClick(lesson);
                }}
              >
                <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontSize: '0.8rem', fontWeight: 'medium' }}>
                  {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                </Typography>
                <Typography variant="body2" noWrap sx={{ color: 'text.primary', fontSize: '0.75rem' }}>
                  {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                </Typography>
                <Typography variant="body2" noWrap sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                  {lesson.duration} {lesson.duration === 1 || lesson.duration === 1.00 ? 'ora' : 'ore'}
                </Typography>

                {/* Chip per lezione in pacchetto */}
                {lesson.is_package && (
                  <Chip
                    label="P"
                    size="small"
                    color="primary"
                    sx={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      borderRadius: 1,
                      width: 'auto',
                      height: 16,
                      fontSize: '0.650rem',
                    }}
                  />
                )}

                {/* Chip per lezione online */}
                {lesson.is_online && (
                  <Chip
                    icon={<WifiIcon style={{ fontSize: '0.7rem' }} />}
                    size="small"
                    color="secondary"
                    sx={{
                      position: 'absolute',
                      bottom: 3,
                      right: 3,
                      borderRadius: 1,
                      width: 'auto',
                      height: 16,
                      fontSize: '0.650rem',
                      '& .MuiChip-icon': {
                        marginLeft: '5px',
                        marginRight: '-10px'
                      }
                    }}
                  />
                )}
              </Box>
            ))}
            
            {/* Pulsante "Nuova lezione" all'interno del contenitore delle lezioni */}
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
              <AddIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.9rem' }}/>
              <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.75rem', fontWeight: 'medium' }}>
                Nuova lezione
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Solo il pulsante Dettaglio giorno rimane in fondo */}
        <Box sx={{ mt: 'auto' }}>
          <Button
            fullWidth
            startIcon={<ViewTimelineIcon fontSize="small" />}
            variant="text"
            size="small"
            onClick={(e) => {
              handleDayClick(day);
            }}
            sx={{
              mt: 1.5,
              py: 0.3,
              minHeight: '28px',
              fontSize: '0.7rem',
              bgcolor: 'action.hover',
              justifyContent: 'center',
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            Timeline
          </Button>
        </Box>
      </Paper>
    );
  };

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      {/* Layout Desktop */}
      {!isMobile && (
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

      {/* Layout Mobile - giorni in verticale */}
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