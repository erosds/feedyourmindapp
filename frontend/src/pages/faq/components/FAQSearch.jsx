// src/pages/faq/components/FAQSearch.jsx
import React, { useState } from 'react';
import { TextField, InputAdornment, Paper, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';

function FAQSearch({ onSearch }) {
  const [searchText, setSearchText] = useState('');

  const handleTextChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchText('');
    onSearch('');
  };

  return (
    <Paper elevation={2} sx={{ p: 0.5 }}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          placeholder="Cerca nelle FAQ... (es. pacchetto, studente, lezione)"
          variant="outlined"
          value={searchText}
          onChange={handleTextChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
            endAdornment: searchText ? (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleClear}
                  edge="end"
                  aria-label="clear search"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'transparent',
              },
              '&:hover fieldset': {
                borderColor: 'transparent',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'transparent',
              },
            },
          }}
        />
      </Box>
    </Paper>
  );
}

export default FAQSearch;