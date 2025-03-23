// src/components/dashboard/DashboardCalendar.jsx
import React from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isEqual
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

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6">
          Calendario Settimanale
        </Typography>
        <ButtonGroup size="small">
          <Button onClick={() => handleChangeWeek('prev')}>Precedente</Button>
          <Button onClick={() => handleChangeWeek('reset')}>
            Corrente
          </Button>
          <Button onClick={() => handleChangeWeek('next')}>Successiva</Button>
        </ButtonGroup>
      </Box>

      <Typography variant="subtitle1" align="center" gutterBottom
        sx={{ fontWeight: 'bold', fontSize: '1.2rem', my: 2 }}>
        {format(currentWeekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
      </Typography>

      <Grid container spacing={1} sx={{ flexGrow: 1, mt: 0 }}>
        {daysOfWeek.map(day => {
          const dayLessons = getLessonsForDay(day);
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

                {dayLessons.length === 0 ? (
                  <Box textAlign="center" py={2} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                      Nessuna lezione
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding sx={{ flexGrow: 1 }}>
                    {dayLessons.map(lesson => (
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
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          color: 'text.primary',
                          '&:hover': {
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemText
                          primary={studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                          secondary={`${lesson.duration} ore`}
                          primaryTypographyProps={{ variant: 'body2', noWrap: true, color: 'text.primary' }}
                          secondaryTypographyProps={{ variant: 'caption', noWrap: true, color: 'text.secondary' }}
                        />
                        {lesson.is_package && (
                          <Chip
                            label="P"
                            size="small"
                            color="primary"
                            sx={{
                              position: 'absolute',
                              bottom: 12,
                              right: 12,
                              borderRadius: 1,
                              width: 'auto',
                              height: 16,
                              fontSize: '0.650rem',
                              opacity: 0.8
                            }}
                          />
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* Pulsante di aggiunta rapida */}
                <IconButton
                  size="medium"
                  color="primary"
                  sx={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'primary.light' },
                    width: 42,
                    height: 42,
                    boxShadow: 1
                  }}
                  onClick={(e) => handleAddLessonClick(day, e)}
                >
                  <AddIcon />
                </IconButton>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

export default DashboardCalendar;