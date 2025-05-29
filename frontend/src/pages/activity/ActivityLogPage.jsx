// src/pages/activity/ActivityLogPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Custom hook per il debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

function ActivityLogPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Stati base
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersActivity, setUsersActivity] = useState([]);
  const [timeRange, setTimeRange] = useState(30);
  const [sortOrder, setSortOrder] = useState('recent');

  // Stati per la ricerca - separati per input locale e valore effettivo
  const [searchInputValue, setSearchInputValue] = useState(''); // Valore locale dell'input
  const [searchTerm, setSearchTerm] = useState(''); // Valore effettivo per la ricerca
  const [searchType, setSearchType] = useState('all');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');

  // Debounce del valore di ricerca (500ms di ritardo)
  const debouncedSearchTerm = useDebounce(searchInputValue, 500);

  // Aggiorna il searchTerm effettivo quando il valore debounced cambia
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  // Check admin access
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  // Carica dati attività - ora usa searchTerm (non searchInputValue)
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setLoading(true);

        // Passa tutti i filtri al backend
        const params = {
          days: timeRange,
          limit_per_user: 50,
        };

        // Aggiungi filtri solo se diversi da 'all'
        if (actionTypeFilter !== 'all') {
          params.action_type = actionTypeFilter;
        }

        if (entityTypeFilter !== 'all') {
          params.entity_type = entityTypeFilter;
        }

        if (searchTerm.trim() !== '') {
          params.search = searchTerm.trim();
          params.search_type = searchType;
        }

        const response = await activityService.getUsersActivity(params);
        setUsersActivity(response.data || []);
      } catch (err) {
        console.error('Errore nel caricamento dei dati di attività:', err);
        setError('Impossibile caricare le attività. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, [timeRange, searchTerm, searchType, actionTypeFilter, entityTypeFilter]); // Usa searchTerm, non searchInputValue

  // Funzione per filtrare e cercare nelle attività
  const filteredAndSearchedUsers = useMemo(() => {
    let filtered = [...usersActivity];

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
  }, [usersActivity, sortOrder]);

  // Handler per pulire la ricerca
  const handleClearSearch = useCallback(() => {
    setSearchInputValue('');
    setSearchTerm('');
    setSearchType('all');
    setActionTypeFilter('all');
    setEntityTypeFilter('all');
  }, []);

  // Handler per il cambio del valore di input (immediato, solo locale)
  const handleSearchInputChange = useCallback((event) => {
    setSearchInputValue(event.target.value);
  }, []);

  // Handler per submit della ricerca (Enter o blur)
  const handleSearchSubmit = useCallback(() => {
    setSearchTerm(searchInputValue.trim());
  }, [searchInputValue]);

  // Handler per keydown (Enter)
  const handleSearchKeyDown = useCallback((event) => {
    if (event.key === 'Enter') {
      handleSearchSubmit();
      event.target.blur(); // Rimuovi focus dopo Enter
    }
  }, [handleSearchSubmit]);

  // Handler per blur (quando perde focus)
  const handleSearchBlur = useCallback(() => {
    handleSearchSubmit();
  }, [handleSearchSubmit]);

  // Contatori per i filtri attivi
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    if (searchType !== 'all') count++;
    if (actionTypeFilter !== 'all') count++;
    if (entityTypeFilter !== 'all') count++;
    return count;
  }, [searchTerm, searchType, actionTypeFilter, entityTypeFilter]);

  // Determina se ci sono filtri attivi
  const isSearchActive = searchTerm.trim() !== '' || actionTypeFilter !== 'all' || entityTypeFilter !== 'all';

  // Calcola statistiche di ricerca
  const searchStats = useMemo(() => {
    const totalUsers = usersActivity.length;
    const filteredUsers = filteredAndSearchedUsers.length;
    const totalActivities = usersActivity.reduce((sum, user) => sum + user.activities_count, 0);
    const filteredActivities = filteredAndSearchedUsers.reduce((sum, user) => sum + (user.filtered_activities_count || user.activities_count), 0);
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
                value={searchInputValue} // Usa searchInputValue per l'input
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                onBlur={handleSearchBlur}
                placeholder="Inserisci termine di ricerca..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchInputValue && (
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
                  maxItems={5}
                  showViewAll={true}
                  isSearchActive={isSearchActive}
                  searchFilters={{
                    searchTerm,
                    searchType,
                    actionTypeFilter,
                    entityTypeFilter,
                    timeRange
                  }}
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