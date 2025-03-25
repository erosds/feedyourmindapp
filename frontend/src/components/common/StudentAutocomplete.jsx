// src/components/common/StudentAutocomplete.jsx
import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
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

  // Carica gli studenti se non sono stati forniti come prop
  useEffect(() => {
    const fetchStudents = async () => {
      if (Array.isArray(students)) {
        setOptions(students);
        return;
      }

      try {
        setLoading(true);
        const response = await studentService.getAll();
        if (response && response.data) {
          setOptions(response.data);
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
      disabled={disabled}
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