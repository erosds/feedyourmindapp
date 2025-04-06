// src/components/dashboard/ProfessorWeeklyTable.jsx
import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Button
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

function ProfessorWeeklyTable({
  currentWeekStart,
  endOfWeek,
  navigateToManageProfessors,
  professorWeeklyData,
  totalProfessorPayments,
  handleProfessorClick
}) {
  return (
    <Paper sx={{ p: 2, height: '100%', mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Riepilogo Settimana Selezionata
        </Typography>
        <Box display="flex" alignItems="center">
        </Box>
      </Box>

      {professorWeeklyData.length === 0 ? (
        <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
          Nessun professore attivo questa settimana
        </Typography>
      ) : (
        <TableContainer sx={{ mb: 2 }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Professore</TableCell>
                <TableCell align="center">Lezioni</TableCell>
                <TableCell align="right">Ultimo giorno</TableCell>
                <TableCell align="right">Pagamento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {professorWeeklyData.map((prof) => (
                <TableRow
                  key={prof.id}
                  hover
                  onClick={() => handleProfessorClick(prof.id)}
                  sx={{ cursor: 'pointer', height: 20 }}
                >
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar
                        sx={{
                          width: 16,
                          height: 16,
                          mr: 1,
                          ml: -1,
                          bgcolor: 'primary.main',
                          fontSize: '0.6rem'
                        }}
                      >
                        {prof.first_name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ lineHeight: 1.2 }}>
                          {prof.first_name}
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.2 }}>
                          {prof.last_name}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body1">
                      {prof.weeklyLessons}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      {prof.lastLessonDate ? format(prof.lastLessonDate, "EEEE dd/MM", { locale: it }) : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1">
                      €{prof.totalPayment.toFixed(2)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>
                  <Typography variant="subtitle1" fontWeight="medium">Totale Pagamenti</Typography>
                </TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    €{totalProfessorPayments.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

export default ProfessorWeeklyTable;