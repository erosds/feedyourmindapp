// Modifiche a ProfessorWeeklyTable.jsx
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
  // Determina se siamo in vista mensile
  const isMonthView = currentWeekStart && endOfWeek && 
                     (endOfWeek.getMonth() === currentWeekStart.getMonth() && 
                      endOfWeek.getDate() > 28);
                      
  // Titolo dinamico in base alla vista
  const tableTitle = isMonthView ? "Riepilogo Mese Selezionato" : "Riepilogo Settimana Selezionata";

  // Ordina i professori alfabeticamente per nome e poi per cognome
  const sortedProfessors = [...professorWeeklyData].sort((a, b) => {
    // Prima confronta per nome
    const firstNameComparison = a.first_name.localeCompare(b.first_name);
    // Se i nomi sono uguali, confronta per cognome
    return firstNameComparison !== 0 ? firstNameComparison : a.last_name.localeCompare(b.last_name);
  });

  // Calcola il totale delle ore
  const totalHours = professorWeeklyData.reduce((total, prof) => {
    // Prendi le ore dalle lezioni del periodo del professore
    const professorsHours = prof.weeklyLessons.reduce((sum, lesson) => 
      sum + parseFloat(lesson.duration), 0);
    return total + professorsHours;
  }, 0);

  return (
    <Paper sx={{ p: 2, height: '100%', mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" color='primary'>
          {tableTitle}
        </Typography>
        <Box display="flex" alignItems="center">
        </Box>
      </Box>

      {sortedProfessors.length === 0 ? (
        <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
          Nessun professore attivo in {isMonthView ? "questo mese" : "questa settimana"}
        </Typography>
      ) : (
        <TableContainer sx={{ mb: 2 }}>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Professore</TableCell>
                <TableCell align="center">Ore</TableCell>
                <TableCell align="right">Ultimo giorno</TableCell>
                <TableCell align="right">Pagamento</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedProfessors.map((prof) => {
                // Calcola il totale delle ore per questo professore
                const professorHours = prof.weeklyLessons.reduce((sum, lesson) => 
                  sum + parseFloat(lesson.duration), 0);
                
                return (
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
                        {professorHours.toFixed(1)}
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
                );
              })}
              <TableRow>
                <TableCell colSpan={1} sx={{ fontWeight: 'bold' }}>
                  <Typography variant="subtitle1" fontWeight="medium">Totale</Typography>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {totalHours.toFixed(1)}
                  </Typography>
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