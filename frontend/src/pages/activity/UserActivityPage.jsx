// src/pages/activity/UserActivityPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { activityService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ActivitySummaryCard from '../../components/activity/ActivitySummaryCard';

function UserActivityPage() {
  const { professorId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  // Stati
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [professor, setProfessor] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // Default: 30 giorni
  const [loadingMore, setLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 10; // Numero di attività per pagina
  
  // Check admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);
  
  // Carica i dati del professore
  useEffect(() => {
    const fetchProfessorData = async () => {
      try {
        const response = await professorService.getById(professorId);
        setProfessor(response.data);
      } catch (err) {
        console.error('Errore nel caricamento dei dati del professore:', err);
        setError('Impossibile caricare i dati del professore. Riprova più tardi.');
      }
    };
    
    fetchProfessorData();
  }, [professorId]);
  
  // Carica le attività dell'utente
  useEffect(() => {
    const fetchUserActivities = async () => {
      try {
        setLoading(true);
        setCanLoadMore(true);
        setPage(0);
        
        const response = await activityService.getUserActivity(professorId, {
          skip: 0,
          limit: limit,
          days: timeRange,
        });
        
        setActivities(response.data || []);
        
        // Controlla se ci sono altre attività da caricare
        if (!response.data || response.data.length < limit) {
          setCanLoadMore(false);
        }
      } catch (err) {
        console.error('Errore nel caricamento delle attività dell\'utente:', err);
        setError('Impossibile caricare le attività. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };
    
    if (professorId) {
      fetchUserActivities();
    }
  }, [professorId, timeRange]);
  
  // Funzione per caricare più attività
  const loadMoreActivities = async () => {
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      
      const response = await activityService.getUserActivity(professorId, {
        skip: nextPage * limit,
        limit: limit,
        days: timeRange,
      });
      
      if (response.data && response.data.length > 0) {
        setActivities(prev => [...prev, ...response.data]);
        setPage(nextPage);
      }
      
      // Controlla se ci sono altre attività da caricare
      if (!response.data || response.data.length < limit) {
        setCanLoadMore(false);
      }
    } catch (err) {
      console.error('Errore nel caricamento di altre attività:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Handler per il cambio di periodo
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Handler per tornare indietro
  const handleBack = () => {
    navigate('/activities');
  };
  
  // Raggruppa attività per giorno
  const groupActivitiesByDay = () => {
    const groupedActivities = {};
    
    activities.forEach(activity => {
      const date = parseISO(activity.timestamp);
      const dayKey = format(date, 'yyyy-MM-dd');
      
      if (!groupedActivities[dayKey]) {
        groupedActivities[dayKey] = [];
      }
      
      groupedActivities[dayKey].push(activity);
    });
    
    return groupedActivities;
  };
  
  const groupedActivities = groupActivitiesByDay();
  const sortedDays = Object.keys(groupedActivities).sort().reverse();
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // Crea un oggetto activityData singolo per il professore
  const createProfessorActivityData = () => {
    return {
      professor_id: parseInt(professorId),
      professor_name: professor ? `${professor.first_name} ${professor.last_name}` : `Utente #${professorId}`,
      last_activity_time: activities.length > 0 ? activities[0].timestamp : null,
      activities_count: activities.length,
      recent_activities: activities
    };
  };

  return (
    <Box>
      <Box display="flex" flexDirection="row" alignItems="center" mb={3}>
        <IconButton onClick={handleBack} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h4">
          Attività di {professor ? `${professor.first_name} ${professor.last_name}` : `Utente #${professorId}`}
        </Typography>
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ p: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: 2
            }}
          >
            <Typography variant="h6">
              Cronologia Attività
            </Typography>
            
            <FormControl sx={{ minWidth: 200, mt: { xs: 2, sm: 0 } }}>
              <InputLabel id="time-range-label">Intervallo temporale</InputLabel>
              <Select
                labelId="time-range-label"
                value={timeRange}
                label="Intervallo temporale"
                onChange={handleTimeRangeChange}
                size="small"
              >
                <MenuItem value={7}>Ultimi 7 giorni</MenuItem>
                <MenuItem value={30}>Ultimi 30 giorni</MenuItem>
                <MenuItem value={90}>Ultimi 3 mesi</MenuItem>
                <MenuItem value={365}>Ultimo anno</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {activities.length > 0 ? (
            <Box>
              {sortedDays.map(dayKey => {
                const dayActivities = groupedActivities[dayKey];
                const dayDate = parseISO(dayKey);
                
                // Crea un activityData specifico per questo giorno
                const dayActivityData = {
                  professor_id: parseInt(professorId),
                  professor_name: professor ? `${professor.first_name} ${professor.last_name}` : `Utente #${professorId}`,
                  last_activity_time: dayActivities[0].timestamp,
                  activities_count: dayActivities.length,
                  recent_activities: dayActivities
                };
                
                return (
                  <Box key={dayKey} mb={4}>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        mb: 1, 
                        py: 0.5, 
                        px: 1, 
                        bgcolor: 'background.default', 
                        borderRadius: 1,
                        color: 'text.secondary',
                        fontWeight: 'medium'
                      }}
                    >
                      {format(dayDate, 'EEEE d MMMM yyyy', { locale: it })}
                    </Typography>
                    
                    <ActivitySummaryCard 
                      activityData={dayActivityData}
                      showViewAll={false}
                      maxItems={100} // Mostra tutte le attività del giorno
                      title="" // Nessun titolo necessario poiché abbiamo già l'intestazione del giorno
                    />
                  </Box>
                );
              })}
              
              {canLoadMore && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button 
                    variant="outlined" 
                    onClick={loadMoreActivities}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Caricamento...' : 'Carica altre attività'}
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Box py={4} textAlign="center">
              <Typography variant="body1" color="text.secondary">
                Nessuna attività trovata nel periodo selezionato
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default UserActivityPage;