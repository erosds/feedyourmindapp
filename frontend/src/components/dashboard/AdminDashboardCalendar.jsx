import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ButtonGroup,
  Button
} from '@mui/material';
import { 
  Search as SearchIcon 
} from '@mui/icons-material';
import {
  format,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  startOfWeek
} from 'date-fns';
import { it } from 'date-fns/locale';

function AdminDashboardCalendar({
  currentWeekStart,
  handleChangeWeek,
  getProfessorsForDay,
  handleProfessorClick,
  handleDayClick,
  
}) {
  const [weekStart, setWeekStart] = useState(currentWeekStart);

  const handleWeekChange = (action) => {
    if (action === 'prev') {
      setWeekStart(prev => startOfWeek(new Date(prev.setDate(prev.getDate() - 7)), { weekStartsOn: 1 }));
    } else if (action === 'next') {
      setWeekStart(prev => startOfWeek(new Date(prev.setDate(prev.getDate() + 7)), { weekStartsOn: 1 }));
    } else if (action === 'reset') {
      setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  };

  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });

  return (
    <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">
          Calendario Professori in Sede
        </Typography>
        <ButtonGroup size="small">
          <Button onClick={() => handleWeekChange('prev')}>Precedente</Button>
          <Button onClick={() => handleWeekChange('reset')}>
            Corrente
          </Button>
          <Button onClick={() => handleWeekChange('next')}>Successiva</Button>
        </ButtonGroup>
      </Box>

      <Typography
        variant="subtitle1"
        align="center"
        sx={{
          fontWeight: 'bold',
          fontSize: '1.2rem',
          mb: 2,
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          py: 1,
          borderRadius: 1
        }}
      >
        {format(weekStart, "d MMMM yyyy", { locale: it })} - {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d MMMM yyyy", { locale: it })}
      </Typography>

      <Grid container spacing={1} sx={{ flexGrow: 1, mt: 0 }}>
        {daysOfWeek.map(day => {
          const dayProfessors = getProfessorsForDay(day);
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
                  position: 'relative', // Aggiunto per posizionare l'icona
                  bgcolor: isCurrentDay ? 'primary.light' : 'background.paper',
                  color: isCurrentDay ? 'primary.contrastText' : 'text.primary',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxSizing: 'border-box',
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

                {dayProfessors.length === 0 ? (
                  <Box textAlign="center" py={2} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                      Nessun professore in sede
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding sx={{ flexGrow: 1 , mb: 5}}>
                    {dayProfessors.map(professor => (
                      <ListItem
                        key={professor.id}
                        button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent day click when clicking on professor
                          handleProfessorClick(professor.id);
                        }}
                        sx={{
                          mb: 0.5,
                          p: 0, // Remove default padding
                          borderRadius: 1,
                          '&:hover': {
                            // Avoid duplicate hover background
                            bgcolor: 'transparent',
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            bgcolor: 'primary.main',
                            color: 'white',
                            py: 0.7,
                            px: 1,
                            borderRadius: 1,
                            textAlign: 'center',
                            '&:hover': {
                              opacity: 0.9, // Subtle hover effect on colored box
                            }
                          }}
                        >
                          {professor.first_name} {professor.last_name ? professor.last_name.charAt(0) + '.' : ''}
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}

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
    </Paper>
  );
}

export default AdminDashboardCalendar;