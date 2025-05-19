// src/pages/activity/ActivityLogPage.jsx
import React, { useState, useEffect } from 'react';
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
  Typography,
} from '@mui/material';
import { activityService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ActivitySummaryCard from '../../components/activity/ActivitySummaryCard';

function ActivityLogPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Stati
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usersActivity, setUsersActivity] = useState([]);
  const [timeRange, setTimeRange] = useState(30); // Default: 30 giorni
  
  // Stato per ordinamento
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' o 'alphabetical'

  // Funzione per ordinare gli utenti
  const getSortedUsers = () => {
    if (sortOrder === 'alphabetical') {
      return [...usersActivity].sort((a, b) =>
        a.professor_name.localeCompare(b.professor_name)
      );
    } else {
      // Ordina per data attività più recente (è già il default)
      return [...usersActivity].sort((a, b) => {
        // Prima le attività più recenti
        if (!a.last_activity_time) return 1;
        if (!b.last_activity_time) return -1;
        return new Date(b.last_activity_time) - new Date(a.last_activity_time);
      });
    }
  };

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
          limit_per_user: 3, // Mostra le 3 attività più recenti per ogni utente
          days: timeRange,  // Ultimi X giorni
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

  // Handler per il cambio di periodo
  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  // Ottieni tutti gli utenti attivi
  const activeUsers = getSortedUsers().filter(user => user.activities_count > 0);

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
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
            width: '100%'
          }}
        >
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            width: { xs: '100%', sm: 'auto' }
          }}>
            <FormControl sx={{
              minWidth: { sm: 200 },
              width: { xs: '100%', sm: 'auto' },
              mb: { xs: 2, sm: 0 }
            }}>
              <InputLabel id="sort-order-label">Ordina per</InputLabel>
              <Select
                labelId="sort-order-label"
                value={sortOrder}
                label="Ordina per"
                onChange={(e) => setSortOrder(e.target.value)}
                size="small"
              >
                <MenuItem value="recent">Attività più recente</MenuItem>
                <MenuItem value="alphabetical">Nome alfabetico</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{
              minWidth: { sm: 200 },
              width: { xs: '100%', sm: 'auto' }
            }}>
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
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          {activeUsers.length > 0 ? (
            activeUsers.map((userData) => (
              <Grid item xs={12} key={userData.professor_id}>
                <ActivitySummaryCard
                  activityData={userData}
                  maxItems={3}
                  showViewAll={true}
                />
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box py={4} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  Nessuna attività registrata nel periodo selezionato
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
}

export default ActivityLogPage;