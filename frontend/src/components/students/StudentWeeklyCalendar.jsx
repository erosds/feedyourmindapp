// StudentWeeklyCalendar.jsx
import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  ButtonGroup,
  Button,
} from '@mui/material';
import {
  format,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns';
import { it } from 'date-fns/locale';
import WifiIcon from '@mui/icons-material/Wifi';
import getProfessorNameById from '../../utils/professorMapping';

const StudentWeeklyCalendar = ({ currentWeekStart, lessons, onChangeWeek }) => {
  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  // Funzione per ottenere le lezioni di un giorno specifico
  const getLessonsForDay = (day) => {
    if (!Array.isArray(lessons)) return [];

    return lessons.filter(lesson => {
      if (!lesson || !lesson.lesson_date) return false;
      try {
        const lessonDate = parseISO(lesson.lesson_date);
        return lessonDate.getFullYear() === day.getFullYear() &&
          lessonDate.getMonth() === day.getMonth() &&
          lessonDate.getDate() === day.getDate();
      } catch (err) {
        console.error('Error filtering lessons by date:', err);
        return false;
      }
    });
  };

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

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' }, // Colonna su mobile, riga su tablet/desktop
          alignItems: { xs: 'stretch', sm: 'center' }, // Stretch su mobile per larghezza piena
          justifyContent: 'space-between',
          mb: 2
        }}
      >
        <Typography variant="h6" sx={{ mb: { xs: 1, sm: 0 } }}>
          Calendario Settimanale
        </Typography>
        <ButtonGroup size="small" sx={{ alignSelf: { xs: 'center', sm: 'auto' } }}>
          <Button onClick={() => onChangeWeek('prev')}>Precedente</Button>
          <Button onClick={() => onChangeWeek('current')}>
            Corrente
          </Button>
          <Button onClick={() => onChangeWeek('next')}>Successiva</Button>
        </ButtonGroup>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          py: 1,
          px: 2,
          borderRadius: 1,
          mb: 1
        }}
      >
        <Typography variant="subtitle1" fontWeight="bold">
          {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
        </Typography>
        <Typography variant="subtitle1" fontWeight="bold">
          Ore totali: {(() => {
            // Filtra le lezioni nella settimana corrente
            const weekLessons = lessons.filter(lesson => {
              if (!lesson.lesson_date) return false;
              const lessonDate = parseISO(lesson.lesson_date);
              return lessonDate >= currentWeekStart &&
                lessonDate <= endOfWeek(currentWeekStart, { weekStartsOn: 1 });
            });
            // Calcola il totale delle ore
            return weekLessons.reduce((total, lesson) =>
              total + parseFloat(lesson.duration), 0).toFixed(1);
          })()}
        </Typography>
      </Box>

      <Grid
        container
        spacing={1}
        sx={{
          flexGrow: 1,
          mt: 0,
          width: '100%',
          flexWrap: 'wrap',
        }}
      >

        {/* Giorni con lezioni */}
        {daysOfWeek.map(day => {
          const dayLessons = getLessonsForDay(day);
          const sortedLessons = sortLessonsByTime(dayLessons);
          const isCurrentDay = isToday(day);

          return (
            <Grid
              item
              xs={12} sm={12 / 7}  // 100% width on xs, 1/7 on larger screens
              sx={{
                width: '100%',  // Rimuovi width fissa
                minWidth: 'auto'  // Rimuovi minWidth
              }}
              key={day.toString()}
            >
              <Paper
                sx={{
                  boxShadow: 'none',
                  p: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: isCurrentDay ? 'primary.light' : 'background.paper',
                  color: isCurrentDay ? 'primary.contrastText' : 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxSizing: 'border-box',
                  position: 'relative'
                }}
              >
                <Typography
                  variant="subtitle2"
                  align="center"
                  sx={{
                    fontWeight: isCurrentDay ? 'bold' : 'normal',
                    mb: 1,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 0.5
                  }}
                >
                  {format(day, "EE d", { locale: it })}
                </Typography>

                <Box sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  maxHeight: 200,
                  '&::-webkit-scrollbar': {
                    width: '4px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                  }
                }}>
                  {sortedLessons.length === 0 ? (
                    <Typography
                      variant="caption"
                      color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}
                      sx={{
                        fontStyle: 'italic',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        minHeight: 80
                      }}
                    >
                      -
                    </Typography>
                  ) : (
                    sortedLessons.map((lesson, index) => (
                      <Box
                        key={`lesson-${lesson.id || index}`}
                        sx={{
                          mb: 0.5,
                          py: 0.5, // Rimuove il padding verticale
                          minHeight: '28px', // Imposta un'altezza minima più compatta
                          bgcolor: isCurrentDay ? 'primary.dark' : 'action.hover',
                          borderRadius: 1,
                          color: 'text.primary',
                          opacity: 0.85,
                          position: 'relative', // Necessario per posizionare il chip
                          pl: 1, // Riduce il padding a sinistra
                          pr: 2, // Spazio per il chip a destra
                        }}
                      >
                        <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'primary.contrastText' : 'text.primary', fontSize: '0.8rem', fontWeight: 'medium' }}>
                          {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'primary.contrastText' : 'text.primary', fontSize: '0.75rem' }}>
                          {getProfessorNameById(lesson.professor_id)}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', fontSize: '0.7rem' }}>
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
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default StudentWeeklyCalendar;