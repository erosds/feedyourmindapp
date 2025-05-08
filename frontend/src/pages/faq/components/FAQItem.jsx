// src/pages/faq/components/FAQItem.jsx
import React, { useState } from 'react';
import { 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails,
  Box,
  useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';

function FAQItem({ question, answer, defaultExpanded = false, highlight = '' }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  // Function to highlight the search text
  const highlightText = (text, highlight) => {
    if (!highlight || !text.includes) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
        <Box component="span" key={i} sx={{ backgroundColor: theme.palette.secondary.light, color: 'white', px: 0.5, borderRadius: '2px' }}>
          {part}
        </Box> : part
    );
  };

  const questionHighlighted = highlight ? 
    highlightText(question, highlight) : 
    question;

  return (
    <Accordion 
      expanded={expanded} 
      onChange={handleChange}
      sx={{ 
        mb: 2,
        '&:before': {
          display: 'none',
        },
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls={`panel-${question}-content`}
        id={`panel-${question}-header`}
        sx={{
          backgroundColor: expanded ? theme.palette.primary.light : theme.palette.grey[50],
          color: expanded ? 'white' : 'inherit',
          borderRadius: expanded ? '4px 4px 0 0' : '4px',
          '&:hover': {
            backgroundColor: expanded ? theme.palette.primary.light : theme.palette.grey[100],
          },
          '& .MuiAccordionSummary-expandIconWrapper': {
            color: expanded ? 'white' : 'inherit',
          }
        }}
      >
        <Box display="flex" alignItems="center">
          <QuestionAnswerOutlinedIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: expanded ? 'bold' : 'medium' }}>
            {questionHighlighted}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 3, pb: 2, px: 3 }}>
        {answer}
      </AccordionDetails>
    </Accordion>
  );
}

export default FAQItem;