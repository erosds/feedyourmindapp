// src/components/common/EntityAutocomplete.jsx
import React, { useEffect, useState } from 'react';
import { Autocomplete, TextField, CircularProgress, Box } from '@mui/material';

/**
 * Componente riutilizzabile di autocompletamento per la selezione di entità (studenti, professori, ecc.)
 * 
 * @param {Object} props - Le proprietà del componente
 * @param {string|number} props.value - Il valore selezionato (ID dell'entità)
 * @param {Function} props.onChange - Callback chiamato quando si seleziona un'entità
 * @param {string} props.label - Etichetta del campo (es. "Studente", "Professore")
 * @param {Function} props.fetchEntities - Funzione per recuperare le entità se items non è fornito
 * @param {Array} props.items - Lista di entità (opzionale, se non fornita usa fetchEntities)
 * @param {string} props.firstNameField - Nome del campo per il nome (default: 'first_name')
 * @param {string} props.lastNameField - Nome del campo per il cognome (default: 'last_name')
 * @param {Object} props.error - Oggetto errore (opzionale)
 * @param {string} props.helperText - Testo di supporto (opzionale)
 * @param {boolean} props.disabled - Se il campo è disabilitato (opzionale)
 * @param {boolean} props.required - Se il campo è obbligatorio (opzionale)
 * @param {number} props.maxResults - Numero massimo di risultati da mostrare (default: 5)
 */
function EntityAutocomplete({
  value,
  onChange,
  label = "Seleziona",
  fetchEntities = null,
  items = null,
  firstNameField = 'first_name',
  lastNameField = 'last_name',
  error,
  helperText,
  disabled = false,
  required = false,
  maxResults = 7
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  
  // Carica le entità se non sono state fornite come prop
  useEffect(() => {
    const loadEntities = async () => {
      if (Array.isArray(items)) {
        // Se le entità sono fornite, ordinale alfabeticamente 
        const sortedItems = [...items].sort((a, b) => {
          // Ordinamento per nome e cognome
          const fullNameA = `${a[firstNameField]} ${a[lastNameField]}`.toLowerCase();
          const fullNameB = `${b[firstNameField]} ${b[lastNameField]}`.toLowerCase();
          return fullNameA.localeCompare(fullNameB);
        });
        setOptions(sortedItems);
        return;
      }

      // Se non ci sono entità e non c'è una funzione per recuperarle, esci
      if (!fetchEntities) {
        setOptions([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetchEntities();
        if (response && response.data) {
          // Ordina le entità alfabeticamente
          const sortedItems = [...response.data].sort((a, b) => {
            // Ordinamento per nome e cognome
            const fullNameA = `${a[firstNameField]} ${a[lastNameField]}`.toLowerCase();
            const fullNameB = `${b[firstNameField]} ${b[lastNameField]}`.toLowerCase();
            return fullNameA.localeCompare(fullNameB);
          });
          setOptions(sortedItems);
        }
      } catch (err) {
        console.error(`Errore nel caricamento delle entità:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadEntities();
  }, [items, fetchEntities, firstNameField, lastNameField]);

  // Aggiorna l'entità selezionata quando cambia il valore o le opzioni
  useEffect(() => {
    if (value && options.length > 0) {
      if (typeof value === 'object') {
        setSelectedEntity(value);
      } else {
        const entity = options.find(item => item.id === parseInt(value));
        setSelectedEntity(entity || null);
      }
    } else {
      setSelectedEntity(null);
    }
  }, [value, options]);

  // Gestisce il cambio di selezione
  const handleEntityChange = (event, newValue) => {
    setSelectedEntity(newValue);
    if (typeof onChange === 'function') {
      onChange(newValue ? newValue.id : '');
    }
  };

  // Filtra le opzioni in base all'input e limita i risultati
  const filterOptions = (options, state) => {
    const { inputValue } = state;
    const filtered = options.filter(option => {
      const fullName = `${option[firstNameField]} ${option[lastNameField]}`.toLowerCase();
      return fullName.includes(inputValue.toLowerCase());
    });
    
    // Imposta il flag per indicare se ci sono più risultati
    setHasMoreResults(filtered.length > maxResults);
    
    // Restituisci solo i primi N risultati
    return filtered.slice(0, maxResults);
  };

  return (
    <Autocomplete
      value={selectedEntity}
      onChange={handleEntityChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={options}
      getOptionLabel={(option) => `${option[firstNameField]} ${option[lastNameField]}`}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={loading}
      disabled={disabled}
      filterOptions={filterOptions}
      ListboxProps={{
        sx: { maxHeight: 800 }
      }}
      renderOption={(props, option, state) => (
        <Box component="li" {...props}>
          {option[firstNameField]} {option[lastNameField]}
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
                py: 1
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
          label={label}
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

export default EntityAutocomplete;