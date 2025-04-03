// Updated StudentMultiAutocomplete.jsx

import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, CircularProgress, Chip } from '@mui/material';
import { studentService } from '../../services/api';

function StudentMultiAutocomplete({
  values = [],
  onChange,
  label = "Studenti",
  error,
  helperText,
  disabled = false,
  required = false,
  students = null,
  maxStudents = 3
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Carica gli studenti se non sono forniti
  useEffect(() => {
    if (Array.isArray(students)) {
      setOptions(students);
      return;
    }

    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await studentService.getAll();
        setOptions(response.data || []);
      } catch (err) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [students]);

  // Aggiorna gli studenti selezionati quando cambiano i valori o le opzioni
  useEffect(() => {
    if (values && values.length && options.length) {
      const selectedOptions = values.map(id => 
        options.find(student => student.id === parseInt(id))
      ).filter(Boolean);
      
      setSelectedStudents(selectedOptions);
    } else {
      setSelectedStudents([]);
    }
  }, [values, options]);

  const handleChange = (event, newValue) => {
    if (newValue.length > maxStudents) {
      return; // Non permettere più di maxStudents studenti
    }
    
    setSelectedStudents(newValue);
    
    if (typeof onChange === 'function') {
      const studentIds = newValue.map(student => student.id);
      onChange(studentIds);
    }
  };

  return (
    <Autocomplete
      multiple
      value={selectedStudents}
      onChange={handleChange}
      options={options}
      getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={loading}
      disabled={disabled}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            label={`${option.first_name} ${option.last_name}`}
            {...getTagProps({ index })}
            disabled={disabled}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={Boolean(error)}
          helperText={helperText || `Seleziona fino a ${maxStudents} studenti`}
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

export default StudentMultiAutocomplete;