// src/components/dashboard/DayProfessorsDialog.jsx
import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper
} from '@mui/material';
import { format, addMinutes, parseISO, parse } from 'date-fns';
import { it } from 'date-fns/locale';

function DayProfessorsDialog({ open, onClose, selectedDay, professorSchedules, handleProfessorClick }) {
  if (!selectedDay || !professorSchedules) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Professori in sede {selectedDay && format(selectedDay, "EEEE d MMMM yyyy", { locale: it })}
      </DialogTitle>
      <DialogContent>
        {professorSchedules.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
            Nessun professore in sede in questo giorno
          </Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Professore</TableCell>
                  <TableCell align="center">Numero lezioni</TableCell>
                  <TableCell align="center">Orario inizio</TableCell>
                  <TableCell align="center">Orario fine</TableCell>
                  <TableCell align="right">Ore di lezione svolte</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {professorSchedules.map((prof) => (
                  <TableRow 
                    key={prof.id}
                    hover
                    onClick={() => handleProfessorClick(prof.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body1">
                        {prof.first_name} {prof.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {prof.lessons.length}
                    </TableCell>
                    <TableCell align="center">
                      {prof.startTime}
                    </TableCell>
                    <TableCell align="center">
                      {prof.endTime}
                    </TableCell>
                    <TableCell align="right">
                      {prof.totalHours.toFixed(1)} ore
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DayProfessorsDialog;