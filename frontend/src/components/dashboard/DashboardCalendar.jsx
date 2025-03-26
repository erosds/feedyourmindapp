// src/components/dashboard/DashboardCalendar.jsx
import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  List,
  ListItem,
  Paper,
  Typography,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  format,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  addWeeks,
  subWeeks,
  startOfWeek
} from 'date-fns';
import { it } from 'date-fns/locale';

function DashboardCalendar({
  currentWeekStart,
  handleChangeWeek,
  getLessonsForDay,
  studentsMap,
  handleLessonClick,
  handleDayClick,
  handleAddLessonClick
}) {
  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  // Funzione per gestire il cambio settimana
  const handleWeekChange = (action) => {
    if (action === 'prev') {
      // Settimana precedente
      handleChangeWeek(subWeeks(currentWeekStart, 1));
    } else if (action === 'next') {
      // Settimana successiva
      handleChangeWeek(addWeeks(currentWeekStart, 1));
    } else if (action === 'reset') {
      // Settimana corrente
      handleChangeWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
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
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6">
          Calendario Settimanale
        </Typography>
        <ButtonGroup size="small">
          <Button onClick={() => handleWeekChange('prev')}>Precedente</Button>
          <Button onClick={() => handleWeekChange('reset')}>
            Corrente
          </Button>
          <Button onClick={() => handleWeekChange('next')}>Successiva</Button>
        </ButtonGroup>
      </Box>

      <Typography variant="subtitle1" align="center" gutterBottom
        sx={{
          fontWeight: 'bold', fontSize: '1.2rem', mb: 2,
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          py: 1,
          borderRadius: 1
        }}>
        {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
      </Typography>

      <Grid container spacing={1} sx={{ flexGrow: 1, mt: 0 }}>
        {daysOfWeek.map(day => {
          const dayLessons = getLessonsForDay(day) || [];
          // Ordina le lezioni per orario di inizio
          const sortedLessons = sortLessonsByTime(dayLessons);
          const isCurrentDay = isToday(day);
          return (
            <Grid item xs sx={{ width: 'calc(100% / 7)' }} key={day.toString()}>
              <Paper
                elevation={isCurrentDay ? 3 : 1}
                sx={{
                  p: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: isCurrentDay ? 'primary.light' : 'background.paper',
                  color: isCurrentDay ? 'primary.contrastText' : 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxSizing: 'border-box',
                  position: 'relative',
                  '&:hover': {
                    borderColor: 'primary.main',
                    cursor: 'pointer'
                  }
                }}
                onClick={() => handleDayClick(day)}
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
                  {format(day, "EEEE d", { locale: it })}
                </Typography>

                <List dense disablePadding sx={{ flexGrow: 1 }}>
                  {sortedLessons.length === 0 ? (
                    ''
                  ) : (
                    sortedLessons.map(lesson => (
                      <ListItem
                        key={`lesson-${lesson.id}`}
                        divider
                        button
                        onClick={(e) => {
                          e.stopPropagation(); // Impedisce al calendario di aprire il dialogo
                          handleLessonClick(lesson);
                        }}
                        sx={{
                          mb: 0.5,
                          py: 0.5, // Rimuove il padding verticale
                          minHeight: '28px', // Imposta un'altezza minima più compatta
                          bgcolor: isCurrentDay ? 'primary.dark' : 'background.paper',
                          borderRadius: 1,
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                          position: 'relative', // Necessario per posizionare il chip
                          pl: 1, // Riduce il padding a sinistra
                          pr: 2, // Spazio per il chip a destra
                        }}
                      >
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'primary.contrastText' : 'text.primary', fontSize: '0.8rem', fontWeight: 'medium' }}>
                            {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                          </Typography>
                          <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'primary.contrastText' : 'text.primary', fontSize: '0.75rem' }}>
                            {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                          </Typography>
                          <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', fontSize: '0.7rem' }}>
                            {lesson.duration} {lesson.duration === 1 || lesson.duration === 1.00 ? 'ora' : 'ore'}
                          </Typography>
                        </Box>
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
                              opacity: 0.8
                            }}
                          />
                        )}
                      </ListItem>
                    ))
                  )}

                  {/* Add Lesson button at the top of each day */}
                  
                  <ListItem
                  divider
                    button
                    onClick={(e) => {
                      e.stopPropagation(); // Impedisce di aprire il dialogo del giorno
                      handleAddLessonClick(day);
                    }}
                    sx={{
                      mb: 1,
                      py: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '28px',
                      bgcolor: isCurrentDay ? 'primary.main' : 'background.paper',
                      borderRadius: 1,
                      transition: 'all 0.2s ease',
                      color: 'text.primary',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'scale(1.05)',
                      }
                    }}
                  >
                    <AddIcon fontSize="small" sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', mr: 0.5 }} />
                    <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', fontSize: '0.7rem' }}>
                      Nuova Lezione
                    </Typography>

                  </ListItem>
                </List>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

export default DashboardCalendar;