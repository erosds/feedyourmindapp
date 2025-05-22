import React, { useState, useEffect } from 'react';
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

function PaymentRemindersCard({
  professors = [],
  onNotesUpdate = () => { }
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [professorsWithNotes, setProfessorsWithNotes] = useState([]);

  // Effetto per aggiornare i professori con note ogni volta che cambiano i professori
  useEffect(() => {
    const filteredProfessors = professors
      .filter((prof) => prof.notes && prof.notes.trim() !== '')
      .sort((a, b) => a.first_name.localeCompare(b.first_name));

    setProfessorsWithNotes(filteredProfessors);
  }, [professors]);

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

      // Chiamare la funzione di callback per notificare l'aggiornamento
      onNotesUpdate();

      handleClose();
    } catch (error) {
      console.error('Errore nel salvataggio della nota:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (professorId) => {
    try {
      await professorService.update(professorId, { notes: '' });

      // Chiamare la funzione di callback per notificare l'aggiornamento
      onNotesUpdate();
    } catch (err) {
      console.error('Errore durante l\'eliminazione della nota:', err);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" color='primary'>Reminder Pagamenti</Typography>
          <IconButton color="primary" onClick={handleOpen}>
            <AddIcon />
          </IconButton>
        </Box>

        <List dense>
          {professorsWithNotes.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ py: 2 }}
            >
              Nessun reminder presente
            </Typography>
          ) : (
            professorsWithNotes.map((prof) => (
              <ListItem
                key={prof.id}
                divider
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    color="error"
                    onClick={() => handleDeleteNote(prof.id)}
                  >
                    <DeleteIcon fontSize="small" />
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
            ))
          )}
        </List>
      </CardContent>

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>Aggiungi Nota</DialogTitle>

        <DialogContent>
          <Box display="flex" flexDirection="column" gap={3} mt={1}>

            <FormControl fullWidth required>
              <InputLabel id="professor-select-label">Professore</InputLabel>
              <Select
                labelId="professor-select-label"
                id="professor-select"
                value={selectedProfessorId}
                onChange={(e) => setSelectedProfessorId(e.target.value)}
                label="Professore"
              >
                <MenuItem value="" disabled>
                  Seleziona un professore
                </MenuItem>
                {professors
                  .filter(prof => !prof.notes || prof.notes.trim() === '')
                  .sort((a, b) => a.first_name.localeCompare(b.first_name)) // <-- Ordinamento per nome
                  .map((prof) => (
                    <MenuItem key={prof.id} value={prof.id}>
                      {prof.first_name} {prof.last_name}
                    </MenuItem>
                  ))}

              </Select>
            </FormControl>

            <TextField
              required
              id="outlined-required"
              label="Nota"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Inserisci una nota per il professore selezionato"
            />
          </Box>
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