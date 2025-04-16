// src/theme.js (o dove hai definito il tema)
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',    // Attuale
      light: '#6573c3',   // Nuance più soft
      dark: '#2c387e'     // Variante più scura
    },
    secondary: {
      main: '#f50057',    // Attuale
      light: '#f73378',   // Nuance più soft 
      dark: '#ab003c'     // Variante più scura
    },
    background: {
      default: '#f4f6f8', // Background più chiaro e pulito
      paper: '#ffffff'    // Superficie dei componenti
    }
  },
  typography: {
    fontFamily: [
      '-apple-system', 
      'BlinkMacSystemFont', 
      'Segoe UI', 
      'Roboto', 
      'Helvetica Neue', 
      'Arial', 
      'sans-serif'
    ].join(','),
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.02em'
    },
    body1: {
      lineHeight: 1.6
    }
  },
  components: {
    MuiBox: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }
      }
    }, 
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }
      }
    }, 
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          boxShadow: '0 4px 8px rgba(0,0,0,0.08)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Rimuove MAIUSCOLO di default
          borderRadius: 4
        }
      }
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Rimuove MAIUSCOLO di default
          borderRadius: 4
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 4
          }
        }
      }
    }
  }
});

export { theme };