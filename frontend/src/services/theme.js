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

// Theme defaul
const theme2 = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const appleInspiredTheme = createTheme({
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.03em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em',
    },
    body1: {
      fontWeight: 400,
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#007AFF', // Apple's blue
      light: '#5AC8FA',
      dark: '#0056b3',
    },
    secondary: {
      main: '#5856D6', // Apple's purple
      light: '#AF52DE',
      dark: '#3A30B0',
    },
    background: {
      default: '#F2F2F7', // Very light gray, similar to iOS background
      paper: '#FFFFFF',
    },
    error: {
      main: '#FF3B30', // Apple's red
    },
    success: {
      main: '#34C759', // Apple's green
    },
    warning: {
      main: '#FF9500', // Apple's orange
    },
    info: {
      main: '#5856D6', // Apple's purple
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
  shape: {
    borderRadius: 10, // More rounded corners
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#007AFF',
          color: 'white',
          '&:hover': {
            backgroundColor: '#0056b3',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(0,122,255,0.3)',
          color: '#007AFF',
          '&:hover': {
            backgroundColor: 'rgba(0,122,255,0.05)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: 'rgba(0,0,0,0.23)',
            },
            '&:hover fieldset': {
              borderColor: '#007AFF',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#007AFF',
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', // Soft shadow
          border: '1px solid rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
            transform: 'translateY(-3px)',
          },
        },
        elevation1: {
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: 'visible',
          boxShadow: '0 6px 30px rgba(0,0,0,0.05)',
          border: '1px solid rgba(0,0,0,0.04)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            transform: 'translateY(-5px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: 'rgba(0,122,255,0.1)',
          color: '#007AFF',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 62,
          height: 34,
          padding: 7,
        },
        switchBase: {
          padding: 9,
          '&$checked': {
            transform: 'translateX(28px)',
            color: '#fff',
            '& + $track': {
              opacity: 1,
              backgroundColor: '#007AFF',
            },
          },
        },
        thumb: {
          width: 20,
          height: 20,
        },
        track: {
          borderRadius: 32 / 2,
          opacity: 1,
          backgroundColor: '#C0C0C0',
        },
      },
    },
  },
});

export { theme, theme2, appleInspiredTheme };