// src/pages/activity/ActivityLogPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { activityService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ActivitySummaryCard from '../../components/activity/ActivitySummaryCard';

function ActivityLogPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Stati base
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersActivity, setUsersActivity] = useState([]);
  const [timeRange, setTimeRange] = useState(30);
  const [sortOrder, setSortOrder] = useState('recent');
  
  // Stati per la ricerca
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('all'); // 'all', 'professor', 'description', 'entity'
  const [actionTypeFilter, setActionTypeFilter] = useState('all'); // 'all', 'create', 'update', 'delete'
  const [entityTypeFilter, setEntityTypeFilter] = useState('all'); // 'all', 'lesson', 'package', 'student', 'professor'

  // Check admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Carica dati attività
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setLoading(true);

        // Carica i dati aggregati per utente
        const response = await activityService.getUsersActivity({
          limit_per_user: 10, // Aumentiamo per permettere ricerche più ampie
          days: timeRange,
        });

        setUsersActivity(response.data || []);
      } catch (err) {
        console.error('Errore nel caricamento dei dati di attività:', err);
        setError('Impossibile caricare le attività. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, [timeRange]);

  // Funzione per filtrare e cercare nelle attività
  const filteredAndSearchedUsers = useMemo(() => {
    let filtered = [...usersActivity];

    // Applica la ricerca se c'è un termine
    if (searchTerm.trim() !== '') {
      const lowercaseSearch = searchTerm.toLowerCase();
      
      filtered = filtered.map(user => {
        // Filtra le attività del singolo utente
        const filteredActivities = user.recent_activities.filter(activity => {
          // Ricerca per tipo di entità
          if (entityTypeFilter !== 'all' && activity.entity_type !== entityTypeFilter) {
            return false;
          }
          
          // Ricerca per tipo di azione
          if (actionTypeFilter !== 'all' && activity.action_type !== actionTypeFilter) {
            return false;
          }

          // Ricerca testuale
          switch (searchType) {
            case 'professor':
              return user.professor_name.toLowerCase().includes(lowercaseSearch);
            case 'description':
              return activity.description.toLowerCase().includes(lowercaseSearch);
            case 'entity':
              return activity.entity_type.toLowerCase().includes(lowercaseSearch);
            case 'all':
            default:
              return (
                user.professor_name.toLowerCase().includes(lowercaseSearch) ||
                activity.description.toLowerCase().includes(lowercaseSearch) ||
                activity.entity_type.toLowerCase().includes(lowercaseSearch) ||
                activity.action_type.toLowerCase().includes(lowercaseSearch)
              );
          }
        });

        // Ritorna l'utente solo se ha attività che matchano i criteri
        return {
          ...user,
          recent_activities: filteredActivities,
          activities_count: filteredActivities.length
        };
      }).filter(user => user.activities_count > 0); // Rimuovi utenti senza attività matchanti
    } else {
      // Se non c'è ricerca testuale, applica solo i filtri per tipo
      if (entityTypeFilter !== 'all' || actionTypeFilter !== 'all') {
        filtered = filtered.map(user => {
          const filteredActivities = user.recent_activities.filter(activity => {
            if (entityTypeFilter !== 'all' && activity.entity_type !== entityTypeFilter) {
              return false;
            }
            if (actionTypeFilter !== 'all' && activity.action_type !== actionTypeFilter) {
              return false;
            }
            return true;
          });

          return {
            ...user,
            recent_activities: filteredActivities,
            activities_count: filteredActivities.length
          };
        }).filter(user => user.activities_count > 0);
      }
    }

    // Applica l'ordinamento
    if (sortOrder === 'alphabetical') {
      return filtered.sort((a, b) => a.professor_name.localeCompare(b.professor_name));
    } else {
      return filtered.sort((a, b) => {
        if (!a.last_activity_time) return 1;
        if (!b.last_activity_time) return -1;
        return new Date(b.last_activity_time) - new Date(a.last_activity_time);
      });
    }
  }, [usersActivity, searchTerm, searchType, entityTypeFilter, actionTypeFilter, sortOrder]);

  // Handler per pulire la ricerca
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchType('all');
    setActionTypeFilter('all');
    setEntityTypeFilter('all');
  };

  // Contatori per i filtri attivi
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    if (searchType !== 'all') count++;
    if (actionTypeFilter !== 'all') count++;
    if (entityTypeFilter !== 'all') count++;
    return count;
  }, [searchTerm, searchType, actionTypeFilter, entityTypeFilter]);

  // Calcola statistiche di ricerca
  const searchStats = useMemo(() => {
    const totalUsers = usersActivity.length;
    const filteredUsers = filteredAndSearchedUsers.length;
    const totalActivities = usersActivity.reduce((sum, user) => sum + user.activities_count, 0);
    const filteredActivities = filteredAndSearchedUsers.reduce((sum, user) => sum + user.activities_count, 0);
    
    return {
      totalUsers,
      filteredUsers,
      totalActivities,
      filteredActivities
    };
  }, [usersActivity, filteredAndSearchedUsers]);

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
      <Typography variant="h4" gutterBottom mb={3}>
        Cronologia Attività Utenti
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        {/* Sezione di ricerca e filtri */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Campo di ricerca principale */}
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                variant="outlined"
                label="Cerca nelle attività"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Inserisci termine di ricerca..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <Tooltip title="Pulisci ricerca">
                        <IconButton size="small" onClick={handleClearSearch}>
                          <ClearIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Tipo di ricerca */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Cerca in</InputLabel>
                <Select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  label="Cerca in"
                  size="medium"
                >
                  <MenuItem value="all">Tutto</MenuItem>
                  <MenuItem value="professor">Nome professore</MenuItem>
                  <MenuItem value="description">Descrizione</MenuItem>
                  <MenuItem value="entity">Tipo entità</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Filtro per tipo di azione */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Azione</InputLabel>
                <Select
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  label="Azione"
                  size="medium"
                >
                  <MenuItem value="all">Tutte le azioni</MenuItem>
                  <MenuItem value="create">Creazione</MenuItem>
                  <MenuItem value="update">Modifica</MenuItem>
                  <MenuItem value="delete">Eliminazione</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Filtro per tipo di entità */}
            <Grid item xs={12} md={2}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Entità</InputLabel>
                <Select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  label="Entità"
                  size="medium"
                >
                  <MenuItem value="all">Tutte le entità</MenuItem>
                  <MenuItem value="lesson">Lezioni</MenuItem>
                  <MenuItem value="package">Pacchetti</MenuItem>
                  <MenuItem value="student">Studenti</MenuItem>
                  <MenuItem value="professor">Professori</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Ordinamento */}
            <Grid item xs={12} md={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Ordina per</InputLabel>
                <Select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  label="Ordina per"
                  size="medium"
                >
                  <MenuItem value="recent">Attività più recente</MenuItem>
                  <MenuItem value="alphabetical">Nome alfabetico</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Indicatori filtri attivi e statistiche */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mt: 2,
            flexWrap: 'wrap',
            gap: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {activeFiltersCount > 0 && (
                <Chip
                  icon={<FilterIcon />}
                  label={`${activeFiltersCount} filtro${activeFiltersCount > 1 ? 'i' : ''} attivo${activeFiltersCount > 1 ? 'i' : ''}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  onDelete={handleClearSearch}
                />
              )}
              
              {/* Filtro periodo */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Periodo</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  label="Periodo"
                >
                  <MenuItem value={7}>Ultimi 7 giorni</MenuItem>
                  <MenuItem value={30}>Ultimi 30 giorni</MenuItem>
                  <MenuItem value={90}>Ultimi 3 mesi</MenuItem>
                  <MenuItem value={365}>Ultimo anno</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Statistiche di ricerca */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                Mostrando {searchStats.filteredUsers} di {searchStats.totalUsers} utenti
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {searchStats.filteredActivities} di {searchStats.totalActivities} attività
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Risultati */}
        <Grid container spacing={2}>
          {filteredAndSearchedUsers.length > 0 ? (
            filteredAndSearchedUsers.map((userData) => (
              <Grid item xs={12} key={userData.professor_id}>
                <ActivitySummaryCard
                  activityData={userData}
                  maxItems={searchTerm.trim() !== '' ? 10 : 3} // Mostra più attività durante la ricerca
                  showViewAll={true}
                />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box py={4} textAlign="center">
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  {searchTerm.trim() !== '' || activeFiltersCount > 0 
                    ? 'Nessun risultato trovato' 
                    : 'Nessuna attività registrata nel periodo selezionato'
                  }
                </Typography>
                {(searchTerm.trim() !== '' || activeFiltersCount > 0) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Prova a modificare i criteri di ricerca o i filtri
                  </Typography>
                )}
                {activeFiltersCount > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label="Pulisci tutti i filtri"
                      onClick={handleClearSearch}
                      onDelete={handleClearSearch}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}

export default ActivityLogPage;