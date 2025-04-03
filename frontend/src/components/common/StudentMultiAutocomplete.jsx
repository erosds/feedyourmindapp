// src/components/common/StudentMultiAutocomplete.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete, TextField, CircularProgress, Chip, Box, Typography } from '@mui/material';
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
  const [debug, setDebug] = useState({
    receivedValues: JSON.stringify(values),
    options: "Not loaded yet",
    selectedStudents: "None"
  });
  
  // For tracking render cycles
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  // Load students if not provided
  useEffect(() => {
    console.log("StudentMultiAutocomplete: Loading options, current values:", values);
    
    const loadStudents = async () => {
      if (Array.isArray(students)) {
        console.log("StudentMultiAutocomplete: Using provided students:", students);
        setOptions(students);
        setDebug(prev => ({ ...prev, options: JSON.stringify(students.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))) }));
        return;
      }

      try {
        setLoading(true);
        console.log("StudentMultiAutocomplete: Fetching students from API");
        const response = await studentService.getAll();
        const fetchedStudents = response.data || [];
        console.log("StudentMultiAutocomplete: API returned students:", fetchedStudents);
        setOptions(fetchedStudents);
        setDebug(prev => ({ ...prev, options: JSON.stringify(fetchedStudents.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))) }));
      } catch (err) {
        console.error('StudentMultiAutocomplete: Error loading students:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [students]);

  // Convert IDs to student objects when values change
  useEffect(() => {
    console.log("StudentMultiAutocomplete: Values changed:", values);
    setDebug(prev => ({ ...prev, receivedValues: JSON.stringify(values) }));
    
    if (!options.length) {
      console.log("StudentMultiAutocomplete: Options not loaded yet, can't update selected students");
      return;
    }
    
    const valueArray = Array.isArray(values) ? values : [];
    console.log("StudentMultiAutocomplete: Using value array:", valueArray);
    
    if (valueArray.length > 0) {
      const found = valueArray.map(id => {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        const student = options.find(s => s.id === numericId);
        console.log(`StudentMultiAutocomplete: Looking for student with ID ${numericId}:`, student);
        return student;
      }).filter(Boolean);
      
      console.log("StudentMultiAutocomplete: Found students:", found);
      setSelectedStudents(found);
      setDebug(prev => ({ ...prev, selectedStudents: JSON.stringify(found.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))) }));
    } else {
      console.log("StudentMultiAutocomplete: No values to convert, clearing selected students");
      setSelectedStudents([]);
      setDebug(prev => ({ ...prev, selectedStudents: "None" }));
    }
  }, [values, options]);

  const handleChange = (event, newSelectedStudents) => {
    console.log("StudentMultiAutocomplete: Selection changed to:", newSelectedStudents);
    
    if (newSelectedStudents.length > maxStudents) {
      console.log(`StudentMultiAutocomplete: Ignoring selection, exceeds max of ${maxStudents}`);
      return;
    }
    
    setSelectedStudents(newSelectedStudents);
    setDebug(prev => ({ ...prev, selectedStudents: JSON.stringify(newSelectedStudents.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}` }))) }));
    
    // Extract IDs and call the onChange handler
    const newStudentIds = newSelectedStudents.map(student => student.id);
    console.log("StudentMultiAutocomplete: Calling onChange with IDs:", newStudentIds);
    
    if (typeof onChange === 'function') {
      onChange(newStudentIds);
    } else {
      console.error("StudentMultiAutocomplete: onChange is not a function!");
    }
  };

  console.log(`StudentMultiAutocomplete render #${renderCount.current}, selected:`, selectedStudents);

  return (
    <>
      <Autocomplete
        multiple
        options={options}
        value={selectedStudents}
        onChange={handleChange}
        getOptionLabel={(option) => `${option.first_name} ${option.last_name}`}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={loading}
        disabled={disabled}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              key={option.id || index}
              label={`${option.first_name} ${option.last_name}`}
              {...getTagProps({ index })}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={Boolean(error)}
            helperText={helperText || `Selected: ${selectedStudents.length}`}
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
      
      {/* Debug info - uncomment to see in UI 
      <Box sx={{ mt: 1, p: 1, border: '1px solid #eee', fontSize: '0.7rem', display: 'none' }}>
        <Typography variant="caption">Debug Info:</Typography>
        <pre>{JSON.stringify(debug, null, 2)}</pre>
      </Box>
      */}
    </>
  );
}

export default StudentMultiAutocomplete;