// src/components/common/StudentAutocomplete.jsx
import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress, Typography, Box } from '@mui/material';
import { studentService } from '../../services/api';

/**
 * Componente di autocompletamento per la selezione degli studenti
 * @param {Object} props - Le proprietà del componente
 * @param {string|number} props.value - Il valore selezionato (ID dello studente)
 * @param {Function} props.onChange - Callback chiamato quando si seleziona uno studente
 * @param {Object} props.error - Oggetto errore (opzionale)
 * @param {string} props.helperText - Testo di supporto (opzionale)
 * @param {boolean} props.disabled - Se il campo è disabilitato (opzionale)
 * @param {boolean} props.required - Se il campo è obbligatorio (opzionale)
 * @param {Array} props.students - Lista di studenti (opzionale, se non fornita li carica)
 */
function StudentAutocomplete({
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  students = null
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  
  // Assicurati che disabled sia sempre un booleano
  const isDisabled = disabled === true || disabled === "true";
  
  // Carica gli studenti se non sono stati forniti come prop
  useEffect(() => {
    const fetchStudents = async () => {
      if (Array.isArray(students)) {
        // Se gli studenti sono forniti, ordinali alfabeticamente 
        const sortedStudents = [...students].sort((a, b) => {
          // Ordinamento per nome e cognome
          const fullNameA = `${a.first_name} ${a.last_name}`.toLowerCase();
          const fullNameB = `${b.first_name} ${b.last_name}`.toLowerCase();
          return fullNameA.localeCompare(fullNameB);
        });
        setOptions(sortedStudents);
        return;
      }

      try {
        setLoading(true);
        const response = await studentService.getAll();
        if (response && response.data) {
          // Ordina gli studenti alfabeticamente
          const sortedStudents = [...response.data].sort((a, b) => {
            // Ordinamento per nome e cognome
            const fullNameA = `${a.first_name} ${a.last_name}`.toLowerCase();
            const fullNameB = `${b.first_name} ${b.last_name}`.toLowerCase();
            return fullNameA.localeCompare(fullNameB);
          });
          setOptions(sortedStudents);
        }
      } catch (err) {
        console.error('Errore nel caricamento degli studenti:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [students]);

  // Aggiorna lo studente selezionato quando cambia il valore o le opzioni
  useEffect(() => {
    if (value && options.length > 0) {
      if (typeof value === 'object') {
        setSelectedStudent(value);
      } else {
        const student = options.find(s => s.id === parseInt(value));
        setSelectedStudent(student || null);
      }
    } else {
      setSelectedStudent(null);
    }
  }, [value, options]);

  // Gestisce il cambio di selezione
  const handleStudentChange = (event, newValue) => {
    setSelectedStudent(newValue);
    if (typeof onChange === 'function') {
      onChange(newValue ? newValue.id : '');
    }
  };

  // Filtra le opzioni in base all'input e limita i risultati a 5
  const filterOptions = (options, state) => {
    // Filtro nativo di Autocomplete
    const { inputValue } = state;
    const filtered = options.filter(option => {
      const fullName = `${option.first_name} ${option.last_name}`.toLowerCase();
      return fullName.includes(inputValue.toLowerCase());
    });
    
    // Imposta il flag per indicare se ci sono più risultati
    setHasMoreResults(filtered.length > 5);
    
    // Restituisci solo i primi 5 risultati
    return filtered.slice(0, 5);
  };

  return (
    <Autocomplete
      value={selectedStudent}
      onChange={handleStudentChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={options}
      getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={loading}
      disabled={isDisabled}
      filterOptions={filterOptions}
      ListboxProps={{
        sx: { maxHeight: 300 }
      }}
      renderOption={(props, option, state) => (
        <Box component="li" {...props}>
          {option.first_name} {option.last_name}
        </Box>
      )}
      ListboxComponent={props => (
        <Box {...props}>
          {props.children}
          {hasMoreResults && (
            <Box 
              sx={{ 
                textAlign: 'center', 
                borderColor: 'divider',
                fontStyle: 'italic',
                color: 'text.secondary',
                fontSize: '0.8rem',
              }}
            >
              altri nomi presenti...
            </Box>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Studente"
          required={required}
          error={Boolean(error)}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}

export default StudentAutocomplete;