// src/components/dashboard/AdminDashboardCalendar.jsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  List,
  ListItem,
  ButtonGroup,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  AccessTime as TimeIcon
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
  getStudentsForDay,
  handleProfessorClick,
  handleStudentClick,
  handleDayClick,
}) {
  // Stato per la modalità di visualizzazione (professori o studenti)
  const [viewMode, setViewMode] = useState('professors'); // 'professors' o 'students'

  // Genera i giorni della settimana a partire dal lunedì
  const daysOfWeek = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  // Funzione per cambiare modalità di visualizzazione
  const toggleViewMode = () => {
    setViewMode(viewMode === 'professors' ? 'students' : 'professors');
  };

  // Funzione per ordinare i professori alfabeticamente
  const sortProfessors = (professors) => {
    return [...professors].sort((a, b) => {
      // Prima confronta per nome
      const firstNameComp = a.first_name.localeCompare(b.first_name);
      // Se i nomi sono uguali, confronta per cognome
      return firstNameComp !== 0 ? firstNameComp : a.last_name.localeCompare(b.last_name);
    });
  };

  // Funzione per ordinare gli studenti per orario di inizio lezione
  const sortStudentsByTime = (students) => {
    return [...students].sort((a, b) => {
      // Converti l'orario di inizio in minuti dall'inizio della giornata per confronto numerico
      const timeA = a.start_time ? a.start_time.substring(0, 5).split(':') : ['00', '00'];
      const timeB = b.start_time ? b.start_time.substring(0, 5).split(':') : ['00', '00'];
      
      const minutesA = parseInt(timeA[0]) * 60 + parseInt(timeA[1]);
      const minutesB = parseInt(timeB[0]) * 60 + parseInt(timeB[1]);
      
      return minutesA - minutesB; // Ordinamento crescente per orario
    });
  };

  // Funzione per raggruppare gli studenti per professore
  const groupStudentsByProfessor = (students) => {
    const grouped = {};
    
    students.forEach(student => {
      const professorId = student.professor_id;
      if (!grouped[professorId]) {
        grouped[professorId] = {
          professor: student.professor, // Include l'oggetto professore
          students: []
        };
      }
      grouped[professorId].students.push(student);
    });
    
    // Ordina gli studenti all'interno di ciascun gruppo per orario
    Object.values(grouped).forEach(group => {
      group.students = sortStudentsByTime(group.students);
    });
    
    // Converti in array e ordina i gruppi per nome del professore
    return Object.values(grouped).sort((a, b) => {
      const profA = a.professor;
      const profB = b.professor;
      
      // Prima confronta per nome del professore
      const firstNameComp = profA.first_name.localeCompare(profB.first_name);
      // Se i nomi sono uguali, confronta per cognome
      return firstNameComp !== 0 ? firstNameComp : profA.last_name.localeCompare(profB.last_name);
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
          {viewMode === 'professors' ? 'Calendario Professori in Sede' : 'Calendario Studenti'}
        </Typography>
        
        {/* Bottone/Switch per cambiare vista */}
        <Button
          variant="outlined"
          color="primary"
          onClick={toggleViewMode}
          startIcon={viewMode === 'professors' ? <SchoolIcon /> : <PersonIcon />}
        >
          {viewMode === 'professors' ? 'Vista Studenti' : 'Vista Professori'}
        </Button>
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
        const isCurrentDay = isToday(day);
        
        // Determina quali dati mostrare in base alla modalità di visualizzazione
        let dayData = viewMode === 'professors' 
          ? getProfessorsForDay(day) 
          : getStudentsForDay(day);
        
        // Applica l'ordinamento appropriato
        if (viewMode === 'professors') {
          dayData = sortProfessors(dayData);
        }
        
        // Per la vista studenti, raggruppa gli studenti per professore e ordina
        const groupedData = viewMode === 'students' 
          ? groupStudentsByProfessor(dayData) 
          : dayData;
        
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

              {viewMode === 'professors' ? (
                // Vista Professori
                groupedData.length === 0 ? (
                  <Box textAlign="center" mb={6} mt={2} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                      Nessun professore in sede
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding sx={{ flexGrow: 1, mb: 5 }}>
                    {groupedData.map(professor => (
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
                )
              ) : (
                // Vista Studenti raggruppati per professore
                groupedData.length === 0 ? (
                  <Box textAlign="center" mb={6} mt={2} sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color={isCurrentDay ? 'primary.contrastText' : 'text.secondary'}>
                      Nessuno studente oggi
                    </Typography>
                  </Box>
                ) : (
                  <List dense disablePadding sx={{ flexGrow: 1, mb: 5 }}>
                    {groupedData.map((group, groupIndex) => (
                      <Box key={`group-${group.professor.id}-${groupIndex}`} sx={{ mb: 1.5 }}>
                        {/* Intestazione professore */}
                        <Box
                          sx={{
                            width: '100%',
                            bgcolor: 'primary.main',
                            color: 'white',
                            py: 0.5,
                            px: 1,
                            borderRadius: '4px 4px 0 0',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.9 }
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProfessorClick(group.professor.id);
                          }}
                        >
                          {group.professor.first_name} {group.professor.last_name?.charAt(0)}.
                        </Box>
                        
                        {/* Lista studenti di questo professore */}
                        <List disablePadding sx={{ 
                          mt: 0, 
                          bgcolor: 'rgba(0, 0, 0, 0.02)',
                          borderRadius: '0 0 4px 4px',
                          border: '1px solid',
                          borderTop: 'none',
                          borderColor: 'divider',
                        }}>
                          {group.students.map((student, index) => (
                            <ListItem
                              key={`student-${student.id}-${index}`}
                              sx={{
                                py: 0.5,
                                px: 1,
                                borderBottom: index < group.students.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (handleStudentClick) handleStudentClick(student);
                              }}
                            >
                              <Box sx={{ width: '100%', fontSize: '0.75rem' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>
                                    {student.first_name} {student.last_name}
                                  </Typography>
                                  {student.is_online && (
                                    <Chip 
                                      label="online" 
                                      size="small" 
                                      color="secondary"
                                      sx={{ 
                                        height: '16px', 
                                        fontSize: '0.6rem',
                                        '& .MuiChip-label': { px: 0.5 }
                                      }} 
                                    />
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, color: 'text.secondary' }}>
                                  <TimeIcon sx={{ fontSize: '0.75rem', mr: 0.5 }} />
                                  <Typography variant="caption">
                                    {student.start_time?.substring(0, 5)} • {parseFloat(student.duration).toFixed(1)}h
                                  </Typography>
                                </Box>
                              </Box>
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ))}
                  </List>
                )
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