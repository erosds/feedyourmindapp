import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Box
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { professorService } from '../../services/api';

function PaymentRemindersCard({ professors, onNoteAdded }) {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const professorsWithNotes = professors
    .filter((prof) => prof.notes)
    .sort((a, b) => a.first_name.localeCompare(b.first_name));

  const handleOpen = () => setOpenDialog(true);
  const handleClose = () => {
    setOpenDialog(false);
    setSelectedProfessorId('');
    setNewNote('');
  };

  const handleSave = async () => {
    if (!selectedProfessorId || !newNote.trim()) return;

    setLoading(true);
    try {
      await professorService.update(selectedProfessorId, { notes: newNote.trim() });

      if (onNoteAdded) {
        onNoteAdded(); // richiama la funzione nel componente genitore per aggiornare i dati
      }

      handleClose();
    } catch (error) {
      console.error('Errore nel salvataggio della nota:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Reminder Pagamenti</Typography>
          <IconButton color="primary" onClick={handleOpen}>
            <AddIcon />
          </IconButton>
        </Box>

        <List dense>
          {professorsWithNotes.map((prof) => (
            <ListItem key={prof.id} divider
              secondaryAction={
                <IconButton edge="end" aria-label="delete" color="error" onClick={async () => {
                  try {
                    await professorService.update(prof.id, { notes: '' });
                    if (onNoteAdded) onNoteAdded();
                  } catch (err) {
                    console.error('Errore durante l\'eliminazione della nota:', err);
                  }
                }}>
                  <DeleteIcon fontSize="small"/>
                </IconButton>
              }
            >
              <ListItemText
                primary={`${prof.first_name} ${prof.last_name}`}
                secondary={
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      maxHeight: 100,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {prof.notes}
                  </Typography>
                }
              />
            </ListItem>

          ))}
        </List>
      </CardContent>

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Aggiungi Nota</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel shrink htmlFor="professor-select">Professore</InputLabel>
            <Select
              label="Professore"
              value={selectedProfessorId}
              onChange={(e) => setSelectedProfessorId(e.target.value)}
              inputProps={{
                id: 'professor-select'
              }}
              displayEmpty
            >
              <MenuItem value="" disabled>
                Seleziona un professore
              </MenuItem>
              {professors.map((prof) => (
                <MenuItem key={prof.id} value={prof.id}>
                  {prof.first_name} {prof.last_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>



          <TextField
            label="Nota"
            multiline
            rows={4}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            fullWidth
            variant="outlined"
            placeholder="Inserisci una nota per il professore selezionato"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>Annulla</Button>
          <Button
            onClick={handleSave}
            disabled={loading || !selectedProfessorId || !newNote.trim()}
            variant="contained"
          >
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default PaymentRemindersCard;
