import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  IconButton,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { professorService } from '../../services/api';

const ProfessorNotes = ({ professorId, initialNotes, onNotesUpdate }) => {
  const [notes, setNotes] = useState(initialNotes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setNotes(initialNotes || '');
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await professorService.update(professorId, { notes: notes.trim() });
      setSuccess('Annotazioni salvate con successo');
      setIsEditing(false);
      if (onNotesUpdate) {
        onNotesUpdate(notes.trim());
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Errore durante il salvataggio delle note:', err);
      setError('Impossibile salvare le note. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotes = async () => {
    try {
      setLoading(true);
      setError('');
      await professorService.update(professorId, { notes: '' });
      setNotes('');
      setSuccess('Annotazioni cancellate con successo');
      if (onNotesUpdate) {
        onNotesUpdate('');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Errore durante la cancellazione delle note:', err);
      setError('Impossibile cancellare le note. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{height: '100%'}}>
      <CardHeader 
        title={<Typography variant="h6">Note Pagamenti</Typography>}
        action={
          !isEditing ? (
            <Box>
              <IconButton color="error" onClick={handleDeleteNotes} disabled={loading || !notes}>
                <DeleteIcon />
              </IconButton>
              <IconButton color="primary" onClick={handleToggleEdit}>
                <EditIcon />
              </IconButton>
            </Box>
          ) : (
            <Box>
              <IconButton color="error" onClick={handleCancel}>
                <CancelIcon />
              </IconButton>
              <IconButton 
                color="primary" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : <SaveIcon />}
              </IconButton>
            </Box>
          )
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 1 }}>
            {success}
          </Alert>
        )}
        
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            placeholder="Aggiungi annotazioni sul professore (es. note di pagamento, situazioni particolari, ecc.)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        ) : notes ? (
          <Typography 
            variant="body1" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {notes}
          </Typography>
        ) : (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              fontStyle: 'italic',
              p: 2,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'divider'
            }}
          >
            Nessuna annotazione presente. Clicca sull'icona di modifica per aggiungere delle note.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessorNotes;
