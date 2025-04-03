// src/components/common/PackageStudentSelector.jsx
// Componente specializzato per la selezione degli studenti di un pacchetto specifico
import React, { useState } from 'react';
import { Autocomplete, TextField, CircularProgress, Typography, Box } from '@mui/material';

/**
 * Component for selecting a student from a list of students associated with a package
 * This is specifically used when adding a lesson from the package detail page
 */
function PackageStudentSelector({
  packageStudents = [],
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText
}) {
  const [inputValue, setInputValue] = useState('');
  
  // Find the selected student object based on the ID
  const selectedStudent = value
    ? packageStudents.find(student => student.id === parseInt(value))
    : null;

  const handleStudentChange = (event, newValue) => {
    // Call the onChange handler with the student ID
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
      options={packageStudents}
      getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      disabled={disabled}
      renderOption={(props, option) => (
        <Box component="li" {...props}>
          {option.first_name} {option.last_name}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Studente del pacchetto"
          required={required}
          error={Boolean(error)}
          helperText={helperText || (packageStudents.length > 0 
            ? `${packageStudents.length} studenti in questo pacchetto` 
            : "Nessuno studente trovato nel pacchetto")}
        />
      )}
    />
  );
}

export default PackageStudentSelector;