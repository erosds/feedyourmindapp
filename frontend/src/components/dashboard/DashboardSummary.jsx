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
import { parseISO } from 'date-fns';

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
  // Stati locali per tracciare i valori effettivi
  const [displayedWeekHours, setDisplayedWeekHours] = useState(0);
  const [displayedWeekEarnings, setDisplayedWeekEarnings] = useState(currentWeekEarnings);
  const [displayedPeriodHours, setDisplayedPeriodHours] = useState(0);
  const [displayedPeriodEarnings, setDisplayedPeriodEarnings] = useState(periodEarnings);
  
  // Funzione per calcolare il totale delle ore
  const calculateTotalHours = (lessons) => {
    return lessons.reduce((total, lesson) => {
      // Consideriamo la durata di ogni lezione
      const lessonDuration = parseFloat(lesson.duration) || 0;
      return total + lessonDuration;
    }, 0);
  };
  
  // Aggiorniamo gli stati locali quando cambiano i props
  useEffect(() => {
    setDisplayedWeekHours(calculateTotalHours(currentWeekLessons));
    setDisplayedWeekEarnings(currentWeekEarnings);
  }, [currentWeekLessons, currentWeekEarnings]);
  
  // Aggiorniamo gli stati del periodo quando cambiano i props o il filtro del periodo
  useEffect(() => {
    setDisplayedPeriodHours(calculateTotalHours(periodLessons));
    setDisplayedPeriodEarnings(periodEarnings);
  }, [periodLessons, periodEarnings, periodFilter]);

  // Calcola gli utili per tipo di lezione
  const calculateTypeEarnings = (type) => {
    const filteredLessons = periodLessons.filter(lesson => 
      type === 'package' ? lesson.is_package : !lesson.is_package
    );
    return calculateEarnings(filteredLessons);
  };
  
  // Calcola le ore per tipo di lezione
  const calculateTypeHours = (type) => {
    const filteredLessons = periodLessons.filter(lesson => 
      type === 'package' ? lesson.is_package : !lesson.is_package
    );
    return calculateTotalHours(filteredLessons);
  };

  // Conteggio ore per tipo
  const packageHours = calculateTypeHours('package');
  const singleHours = calculateTypeHours('single');

  // Conteggio numero di lezioni per tipo
  const packageLessonsCount = periodLessons.filter(lesson => lesson.is_package).length;
  const singleLessonsCount = periodLessons.filter(lesson => !lesson.is_package).length;

  // Calcolo guadagni per tipo
  const packageEarnings = calculateTypeEarnings('package');
  const singleEarnings = calculateTypeEarnings('single');

  // Calcola il numero di lezioni singole pagate
  const paidSingleLessons = periodLessons.filter(lesson => 
    !lesson.is_package && lesson.is_paid
  ).length;

  // Funzione per verificare se una lezione appartiene a un pacchetto in scadenza
  const isLessonFromExpiringPackage = (lesson) => {
    if (!lesson.is_package || !lesson.package_id) return false;
    
    // Per determinare se un pacchetto è in scadenza, dovremmo avere la data di scadenza del pacchetto
    // Poiché non abbiamo direttamente quella informazione nella lezione, 
    // possiamo considerare che le lezioni recenti (ultimi 7 giorni) siano potenzialmente da pacchetti in scadenza
    // Nota: questa è una semplificazione; in un'implementazione reale dovresti verificare la data di scadenza del pacchetto
    
    const lessonDate = parseISO(lesson.lesson_date);
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);
    
    return lessonDate >= oneWeekAgo && lessonDate <= today;
  };

  // Calcola lezioni da pacchetti in scadenza (questo è un'approssimazione)
  const lessonsFromExpiringPackages = periodLessons.filter(lesson => 
    lesson.is_package && isLessonFromExpiringPackage(lesson)
  ).length;

  // Handler per cambiare il periodo
  const handlePeriodChange = (event) => {
    setPeriodFilter(event.target.value);
  };

  // Handler per il cambio di tab
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
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
                <MenuItem value="week">Settimana Selezionata</MenuItem>
                <MenuItem value="month">Mese Corrente</MenuItem>
                <MenuItem value="year">Anno Corrente</MenuItem>
              </Select>
            </FormControl>

            <Box mt={3}>
              <Typography variant="body2" color="text.secondary">
                Ore svolte nel periodo
              </Typography>
              <Typography variant="h5">
                {displayedPeriodHours.toFixed(1)}
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
              Ore per tipo di lezione
            </Typography>

            <List dense>
              <ListItem>
                <ListItemText
                  primary="Lezioni singole"
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {singleLessonsCount} lezioni
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        di cui pagate: {paidSingleLessons}
                      </Typography>
                    </Box>
                  }
                />
                <Typography>
                  €{singleEarnings.toFixed(2)}
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Lezioni da pacchetti"
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {packageLessonsCount} lezioni
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        di cui in scadenza: {lessonsFromExpiringPackages}
                      </Typography>
                    </Box>
                  }
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
  );
}

export default DashboardSummary;