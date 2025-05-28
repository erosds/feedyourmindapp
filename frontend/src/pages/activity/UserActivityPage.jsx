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
  Chip,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { activityService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import ActivitySummaryCard from '../../components/activity/ActivitySummaryCard';

function UserActivityPage() {
  const { professorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  // Stati
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allActivities, setAllActivities] = useState([]); // Tutte le attività caricate
  const [activities, setActivities] = useState([]); // Attività filtrate
  const [professor, setProfessor] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [loadingMore, setLoadingMore] = useState(false);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 200; // Carica più attività per gestire meglio i filtri
  
  // Estrai i parametri di ricerca dall'URL
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('search') || '';
  const actionFilter = searchParams.get('action') || 'all';
  const entityFilter = searchParams.get('entity') || 'all';
  const urlTimeRange = searchParams.get('days');
  
  // Se c'è un timeRange nell'URL, usalo
  useEffect(() => {
    if (urlTimeRange) {
      setTimeRange(parseInt(urlTimeRange));
    }
  }, [urlTimeRange]);
  
  // Determina se ci sono filtri attivi
  const hasActiveFilters = searchTerm || actionFilter !== 'all' || entityFilter !== 'all';
  
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
  
  // Funzione per filtrare le attività in base ai parametri URL
  const filterActivities = (activities) => {
    if (!hasActiveFilters) return activities;
    
    return activities.filter(activity => {
      // Filtro per tipo di azione
      if (actionFilter !== 'all' && activity.action_type !== actionFilter) {
        return false;
      }
      
      // Filtro per tipo di entità
      if (entityFilter !== 'all' && activity.entity_type !== entityFilter) {
        return false;
      }
      
      // Filtro per termine di ricerca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          activity.description.toLowerCase().includes(searchLower) ||
          activity.entity_type.toLowerCase().includes(searchLower) ||
          activity.action_type.toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  };
  
  // Applica i filtri ogni volta che cambiano i parametri o le attività
  useEffect(() => {
    if (allActivities.length > 0) {
      const filteredActivities = filterActivities(allActivities);
      setActivities(filteredActivities);
    }
  }, [allActivities, searchTerm, actionFilter, entityFilter]);
  
  // Carica le attività dell'utente
  useEffect(() => {
    const fetchUserActivities = async () => {
      try {
        setLoading(true);
        setCanLoadMore(true);
        setPage(0);
        
        // Carica TUTTE le attività del periodo per poter applicare correttamente i filtri
        const response = await activityService.getUserActivity(professorId, {
          skip: 0,
          limit: 1000, // Carica molte più attività
          days: timeRange,
        });
        
        const loadedActivities = response.data || [];
        setAllActivities(loadedActivities);
        
        // I filtri verranno applicati nell'useEffect successivo
        setCanLoadMore(false); // Disabilita il caricamento progressivo per ora
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
  
  // Funzione per caricare più attività (disabilitata per ora)
  const loadMoreActivities = async () => {
    // Disabilitato per ora per evitare problemi con i filtri
    return;
  };
  
  // Handler per il cambio di periodo
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };
  
  // Handler per tornare indietro
  const handleBack = () => {
    navigate('/activities');
  };
  
  // Handler per pulire i filtri
  const handleClearFilters = () => {
    navigate(`/activities/user/${professorId}`);
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
              {hasActiveFilters && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  (filtrata - {activities.length} di {allActivities.length} attività)
                </Typography>
              )}
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
          
          {/* Mostra i filtri attivi */}
          {hasActiveFilters && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Filtri attivi:
              </Typography>
              
              {searchTerm && (
                <Chip
                  icon={<FilterListIcon />}
                  label={`Ricerca: "${searchTerm}"`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
              
              {actionFilter !== 'all' && (
                <Chip
                  icon={<FilterListIcon />}
                  label={`Azione: ${actionFilter}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
              
              {entityFilter !== 'all' && (
                <Chip
                  icon={<FilterListIcon />}
                  label={`Entità: ${entityFilter}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
              
              <Button
                size="small"
                onClick={handleClearFilters}
                sx={{ ml: 1 }}
              >
                Rimuovi filtri
              </Button>
            </Box>
          )}
          
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
                      {format(dayDate, 'EEEE d MMMM yyyy', { locale: it })} ({dayActivities.length} attività)
                    </Typography>
                    
                    <ActivitySummaryCard 
                      activityData={dayActivityData}
                      showViewAll={false}
                      maxItems={100} // Mostra tutte le attività del giorno
                      title="" // Nessun titolo necessario
                    />
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box py={4} textAlign="center">
              <Typography variant="body1" color="text.secondary">
                {hasActiveFilters 
                  ? 'Nessuna attività trovata che corrisponde ai filtri selezionati'
                  : 'Nessuna attività trovata nel periodo selezionato'
                }
              </Typography>
              {hasActiveFilters && (
                <Button
                  variant="outlined"
                  onClick={handleClearFilters}
                  sx={{ mt: 2 }}
                >
                  Rimuovi filtri
                </Button>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default UserActivityPage;