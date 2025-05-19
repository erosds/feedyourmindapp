// src/components/dashboard/ViewToggleComponent.jsx
import React from 'react';
import { Box, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';
import { ViewWeek, CalendarMonth } from '@mui/icons-material';

function ViewToggleComponent({ viewMode, setViewMode }) {
  const handleViewChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={1} mr={2}>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={handleViewChange}
        aria-label="view mode"
        size="small"
      >
        <ToggleButton value="week" aria-label="week view" >
          <ViewWeek fontSize="small" sx={{ mr: 0.5, color:"primary.contrastText"}} />
          <Typography variant="body2" color="primary.contrastText">Settimanale</Typography>
        </ToggleButton>
        <ToggleButton value="month" aria-label="month view">
          <CalendarMonth fontSize="small" sx={{ mr: 0.5, color:"primary.contrastText"}} />
          <Typography variant="body2" color="primary.contrastText">Mensile</Typography>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

export default ViewToggleComponent;