// src/theme.js (o dove hai definito il tema)
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input[type=number]::-webkit-inner-spin-button, & input[type=number]::-webkit-outer-spin-button': {
            '-webkit-appearance': 'inner-spin-button',
            opacity: 1,
            height: '100%',
            margin: 0,
            transform: 'scale(1.5)',  // Aumenta le dimensioni di 1.5 volte
            position: 'relative',
            right: '5px'
          },
          '& input[type=number]': {
            paddingRight: '25px'  // Aggiunge spazio a destra per le freccette più grandi
          }
        }
      }
    }
  }
});

export default theme;