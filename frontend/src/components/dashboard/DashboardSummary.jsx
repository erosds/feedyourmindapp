// src/components/dashboard/DashboardSummary.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  Typography
} from '@mui/material';

function DashboardSummary({
  currentWeekLessons = [],
  currentWeekEarnings = 0,
  currentTab = 0,
  setCurrentTab,
  periodFilter = 'week',
  setPeriodFilter,
  periodLessons = [],
  periodEarnings = 0,
  calculateEarnings,
  navigate
}) {
  // Aggiungiamo stati locali per tracciare i valori effettivi
  const [displayedWeekLessons, setDisplayedWeekLessons] = useState(currentWeekLessons.length);
  const [displayedWeekEarnings, setDisplayedWeekEarnings] = useState(currentWeekEarnings);
  const [displayedPeriodLessons, setDisplayedPeriodLessons] = useState(periodLessons.length);
  const [displayedPeriodEarnings, setDisplayedPeriodEarnings] = useState(periodEarnings);
  
  // Aggiorniamo gli stati locali quando cambiano i props
  useEffect(() => {
    setDisplayedWeekLessons(currentWeekLessons.length);
    setDisplayedWeekEarnings(currentWeekEarnings);
  }, [currentWeekLessons, currentWeekEarnings]);
  
  // Aggiorniamo gli stati del periodo quando cambiano i props o il filtro del periodo
  useEffect(() => {
    setDisplayedPeriodLessons(periodLessons.length);
    setDisplayedPeriodEarnings(periodEarnings);
  }, [periodLessons, periodEarnings, periodFilter]);

  // Calcola gli utili per tipo di lezione
  const calculateTypeEarnings = (type) => {
    const filteredLessons = periodLessons.filter(lesson => 
      type === 'package' ? lesson.is_package : !lesson.is_package
    );
    return calculateEarnings(filteredLessons);
  };

  // Conteggio lezioni per tipo
  const packageLessonsCount = periodLessons.filter(lesson => lesson.is_package).length;
  const singleLessonsCount = periodLessons.filter(lesson => !lesson.is_package).length;

  // Calcolo guadagni per tipo
  const packageEarnings = calculateTypeEarnings('package');
  const singleEarnings = calculateTypeEarnings('single');

  // Handler per cambiare il periodo
  const handlePeriodChange = (event) => {
    setPeriodFilter(event.target.value);
  };

  // Handler per il cambio di tab
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Riepilogo Settimana
          </Typography>
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Lezioni questa settimana
            </Typography>
            <Typography variant="h4" color="primary">
              {displayedWeekLessons}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Guadagni settimana in corso
            </Typography>
            <Typography variant="h4" color="primary">
              €{displayedWeekEarnings.toFixed(2)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="Riepilogo" />
          <Tab label="Dettaglio" />
        </Tabs>

        {currentTab === 0 ? (
          <Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="period-filter-label">Periodo</InputLabel>
              <Select
                labelId="period-filter-label"
                value={periodFilter}
                label="Periodo"
                onChange={handlePeriodChange}
              >
                <MenuItem value="week">Questa Settimana</MenuItem>
                <MenuItem value="month">Questo Mese</MenuItem>
                <MenuItem value="year">Questo Anno</MenuItem>
              </Select>
            </FormControl>

            <Box mt={3}>
              <Typography variant="body2" color="text.secondary">
                Lezioni nel periodo
              </Typography>
              <Typography variant="h5">
                {displayedPeriodLessons}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Guadagni nel periodo
              </Typography>
              <Typography variant="h5" color="primary">
                €{displayedPeriodEarnings.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Lezioni per tipo
            </Typography>

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Lezioni singole"
                  secondary={`${singleLessonsCount} lezioni`}
                />
                <Typography>
                  €{singleEarnings.toFixed(2)}
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Lezioni da pacchetti"
                  secondary={`${packageLessonsCount} lezioni`}
                />
                <Typography>
                  €{packageEarnings.toFixed(2)}
                </Typography>
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between">
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate('/lessons')}
                fullWidth
              >
                Visualizza tutte le lezioni
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </>
  );
}

export default DashboardSummary;