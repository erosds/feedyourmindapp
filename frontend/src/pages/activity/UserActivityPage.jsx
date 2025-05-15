// src/pages/activity/UserActivityPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
  Link
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { activityService, professorService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format, formatDistance, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Add as CreateIcon,
  Edit as UpdateIcon,
  Delete as DeleteIcon,
  AccountCircle as AccountIcon,
  School as SchoolIcon,
  MenuBook as LessonIcon,
  Book as PackageIcon
} from '@mui/icons-material';

function getActionIcon(actionType) {
  switch (actionType) {
    case 'create':
      return <CreateIcon fontSize="small" sx={{ color: 'success.main' }} />;
    case 'update':
      return <UpdateIcon fontSize="small" sx={{ color: 'primary.main' }} />;
    case 'delete':
      return <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />;
    default:
      return null;
  }
}

function getEntityIcon(entityType) {
  switch (entityType) {
    case 'professor':
      return <AccountIcon fontSize="small" />;
    case 'student':
      return <SchoolIcon fontSize="small" />;
    case 'lesson':
      return <LessonIcon fontSize="small" />;
    case 'package':
      return <PackageIcon fontSize="small" />;
    default:
      return null;
  }
}

function getActionLabel(actionType) {
  switch (actionType) {
    case 'create':
      return 'ha creato';
    case 'update':
      return 'ha modificato';
    case 'delete':
      return 'ha cancellato';
    default:
      return 'ha interagito con';
  }
}

function getEntityLabel(entityType) {
  switch (entityType) {
    case 'professor':
      return 'il professore';
    case 'student':
      return 'lo studente';
    case 'lesson':
      return 'la lezione';
    case 'package':
      return 'il pacchetto';
    default:
      return "l'elemento";
  }
}

function getActionColor(actionType) {
  switch (actionType) {
    case 'create':
      return 'success';
    case 'update':
      return 'primary';
    case 'delete':
      return 'error';
    default:
      return 'default';
  }
}

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
  const limit = 50; // Numero di attività per pagina
  
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
                    
                    <List>
                      {dayActivities.map((activity) => {
                        const timestamp = parseISO(activity.timestamp);
                        const time = format(timestamp, 'HH:mm');
                        const entityUrl = `/${activity.entity_type}s/${activity.entity_id}`;
                        
                        return (
                          <ListItem 
                            key={activity.id}
                            sx={{ 
                              py: 1, 
                              borderLeft: '4px solid',
                              borderColor: `${getActionColor(activity.action_type)}.main`,
                              pl: 2,
                              mb: 1,
                              bgcolor: 'background.paper',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <Box display="flex" alignItems="flex-start" width="100%">
                              <Box sx={{ minWidth: 40, mr: 2, color: 'text.secondary' }}>
                                <Typography variant="body2">{time}</Typography>
                              </Box>
                              
                              <Box flexGrow={1}>
                                <Box display="flex" alignItems="center" flexWrap="wrap" mb={0.5}>
                                  <Box sx={{ mr: 1 }}>
                                    {getActionIcon(activity.action_type)}
                                  </Box>
                                  
                                  <Typography variant="body2" component="span">
                                    {getActionLabel(activity.action_type)}
                                  </Typography>
                                  
                                  <Box display="inline-flex" alignItems="center" mx={0.5}>
                                    {getEntityIcon(activity.entity_type)}
                                    <Typography variant="body2" component="span" sx={{ mx: 0.5 }}>
                                      {getEntityLabel(activity.entity_type)}
                                    </Typography>
                                    <Link 
                                      component="button" 
                                      variant="body2" 
                                      color="primary" 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigate(entityUrl);
                                      }}
                                    >
                                      #{activity.entity_id}
                                    </Link>
                                  </Box>
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary">
                                  {activity.description}
                                </Typography>
                              </Box>
                            </Box>
                          </ListItem>
                        );
                      })}
                    </List>
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