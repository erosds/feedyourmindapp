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
  Cancel as CancelIcon
} from '@mui/icons-material';
import { packageService } from '../../services/api';

const PackageNotes = ({ packageId, initialNotes, onNotesUpdate }) => {
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
      
      // Fetch the full package data before updating
      const packageResponse = await packageService.getById(packageId);
      const currentPackageData = packageResponse.data;
      
      // Update with full package data, just changing notes
      await packageService.update(packageId, {
        ...currentPackageData, // Spread existing package data
        notes: notes.trim() // Only modify notes
      });
      
      setSuccess('Annotazioni salvate con successo');
      setIsEditing(false);
      
      if (onNotesUpdate) {
        onNotesUpdate(notes.trim());
      }
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Errore dettagliato durante il salvataggio delle note:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      const errorMessage = err.response?.data?.detail 
        || err.message 
        || 'Si è verificato un errore durante il salvataggio. Riprova più tardi.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader 
        title={<Typography variant="h6" color="primary">Annotazioni pacchetto</Typography>}
        action={
          !isEditing ? (
            <IconButton color="primary" onClick={handleToggleEdit}>
              <EditIcon />
            </IconButton>
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
        // Reduce bottom padding of the header
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {isEditing ? (
          <TextField
            fullWidth
            multiline
            rows={1}
            variant="outlined"
            placeholder="Aggiungi qui le tue annotazioni sul pacchetto (es. informazioni sui pagamenti parziali, richieste specifiche, etc.)"
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
              borderColor: 'divider',
            }}
          >
            Nessuna annotazione presente. Clicca sull'icona di modifica per aggiungere delle note.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default PackageNotes;