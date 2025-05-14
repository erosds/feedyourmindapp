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
  getProfessorsForDay,
  handleProfessorClick,
  handleDayClick,

}) {
  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

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
          Calendario Professori in Sede
        </Typography>
      </Box>

      <Grid
        container
        spacing={1}
        sx={{
          flexGrow: 1,
          mt: 0,
          width: '100%',  // Sempre 100% della larghezza disponibile
          flexWrap: 'wrap'  // Sempre wrap per adattarsi alla larghezza dello schermo
        }}
      >        {daysOfWeek.map(day => {
        // Ottieni i professori per questo giorno
        const dayProfessors = getProfessorsForDay(day);
        
        // Ordina i professori alfabeticamente per nome e poi per cognome
        const sortedProfessors = [...dayProfessors].sort((a, b) => {
          // Prima confronta per nome
          const firstNameComparison = a.first_name.localeCompare(b.first_name);
          // Se i nomi sono uguali, confronta per cognome
          return firstNameComparison !== 0 ? firstNameComparison : a.last_name.localeCompare(b.last_name);
        });
        
        const isCurrentDay = isToday(day);
        return (
          <Grid
            item
            xs={12} sm={12 / 7}  // 100% width on xs, 1/7 on larger screens
            sx={{
              width: '100%',  // Larghezza piena
              minWidth: 'auto'  // Nessuna larghezza minima
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
                {format(day, "EE d", { locale: it })}
              </Typography>

              {sortedProfessors.length === 0 ? (
                <Box textAlign="center" mb={6} mt={2} sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                    Nessun professore in sede
                  </Typography>
                </Box>
              ) : (
                <List dense disablePadding sx={{ flexGrow: 1, mb: 5 }}>
                  {sortedProfessors.map(professor => (
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