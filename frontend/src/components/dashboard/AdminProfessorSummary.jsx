// src/components/dashboard/AdminProfessorSummary.jsx
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography
} from '@mui/material';

function AdminProfessorSummary({ professorWeeklyData, totalProfessorPayments }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Riepilogo Settimanale
        </Typography>
        <Box mt={3}>
          <Typography variant="body1" color="text.secondary">
            Professori attivi questa settimana
          </Typography>
          <Typography variant="h3" color="primary" gutterBottom>
            {professorWeeklyData.length}
          </Typography>
          <Typography variant="body1" color="text.secondary" mt={3}>
            Totale pagamenti
          </Typography>
          <Typography variant="h3" color="primary" gutterBottom>
            €{totalProfessorPayments.toFixed(2)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default AdminProfessorSummary;