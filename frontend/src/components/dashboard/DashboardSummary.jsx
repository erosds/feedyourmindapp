// src/components/dashboard/DashboardSummary.jsx
import React from 'react';
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
  currentWeekLessons,
  currentWeekEarnings,
  currentTab,
  setCurrentTab,
  periodFilter,
  setPeriodFilter,
  periodLessons,
  periodEarnings,
  calculateEarnings,
  navigate
}) {
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
              {currentWeekLessons.length}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={2}>
              Guadagni settimana in corso
            </Typography>
            <Typography variant="h4" color="primary">
              €{currentWeekEarnings.toFixed(2)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Paper sx={{ p: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(event, newValue) => setCurrentTab(newValue)}
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
                onChange={(e) => setPeriodFilter(e.target.value)}
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
                {periodLessons.length}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Guadagni nel periodo
              </Typography>
              <Typography variant="h5" color="primary">
                €{periodEarnings.toFixed(2)}
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
                  secondary={`${periodLessons.filter(l => !l.is_package).length} lezioni`}
                />
                <Typography>
                  €{calculateEarnings(periodLessons.filter(l => !l.is_package)).toFixed(2)}
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Lezioni da pacchetti"
                  secondary={`${periodLessons.filter(l => l.is_package).length} lezioni`}
                />
                <Typography>
                  €{calculateEarnings(periodLessons.filter(l => l.is_package)).toFixed(2)}
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