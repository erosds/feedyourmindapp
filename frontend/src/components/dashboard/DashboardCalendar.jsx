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
  Chip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  Search as SearchIcon
} from '@mui/icons-material';
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
import WifiIcon from '@mui/icons-material/Wifi';

function DashboardCalendar({
  currentWeekStart,
  handleChangeWeek,
  getLessonsForDay,
  studentsMap,
  handleLessonClick,
  handleDayClick,
  handleAddLessonClick
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' }, // Colonna su mobile, riga su tablet/desktop
          alignItems: { xs: 'stretch', sm: 'center' }, // Stretch su mobile per larghezza piena
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="h6" sx={{ mb: { xs: 1, sm: 0 } }}>
          Calendario Settimanale
        </Typography>
      </Box>

      {/* Contenitore con overflow per lo scroll orizzontale su mobile */}
      <Box
        sx={{
          overflowX: 'visible',  // Cambia da 'auto' a 'visible'
          flexGrow: 1,
          // Rimuovi gli stili che nascondono la scrollbar
        }}
      >
        <Grid
          container
          spacing={1}
          sx={{
            flexGrow: 1,
            mt: 0,
            width: '100%',  // Sempre 100% della larghezza disponibile
            flexWrap: 'wrap'  // Sempre wrap per adattarsi alla larghezza dello schermo
          }}
        >
          {daysOfWeek.map(day => {
            const dayLessons = getLessonsForDay(day) || [];
            // Ordina le lezioni per orario di inizio
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
                    {format(day, "EE d", { locale: it })}
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
                              }}
                            />
                          )}
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
                        mb: 5,
                        py: 1.7,
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
                      <AddIcon fontSize="small" sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', mr: 0.3 }} />
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body1" noWrap sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', fontSize: '0.7rem' }}>
                          Nuova
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ color: isCurrentDay ? 'secondary.contrastText' : 'text.secondary', fontSize: '0.7rem' }}>
                          lezione
                        </Typography>
                      </Box>
                    </ListItem>
                  </List>
                  {/* Icona di ricerca in basso a centro */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 7,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: 'text.secondary',
                      opacity: 0.5
                    }}
                  >
                    <SearchIcon fontSize="small" />
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Paper>
  );
}

export default DashboardCalendar;