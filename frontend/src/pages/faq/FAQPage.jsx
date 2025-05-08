// src/pages/faq/FAQPage.jsx
import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import FAQSection1 from './sections/FAQSection1';
import FAQSection2 from './sections/FAQSection2';
import FAQSection3 from './sections/FAQSection3';
import FAQSection4 from './sections/FAQSection4';
import FAQSection5 from './sections/FAQSection5';
import FAQSearch from './components/FAQSearch';

function FAQPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    setSearchQuery(''); // Clear search when changing tabs
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Map tab index to section component
  const renderSection = () => {
    // If search is active, show all sections
    if (searchQuery.trim()) {
      return (
        <>
          <FAQSection1 searchQuery={searchQuery} />
          <FAQSection2 searchQuery={searchQuery} />
          <FAQSection3 searchQuery={searchQuery} />
          <FAQSection4 searchQuery={searchQuery} />
          <FAQSection5 searchQuery={searchQuery} />
        </>
      );
    }

    // Otherwise show only the selected section
    switch (currentTab) {
      case 0:
        return <FAQSection1 />;
      case 1:
        return <FAQSection2 />;
      case 2:
        return <FAQSection3 />;
      case 3:
        return <FAQSection4 />;
      case 4:
        return <FAQSection5 />;
      default:
        return <FAQSection1 />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: 0 , alignContent: 'center', alignItems: 'center', justifyContent: 'center'}}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        FeedYourMind - FAQ
      </Typography>
      
      <Box mb={4}>
        <FAQSearch onSearch={handleSearch} />
      </Box>

      <Paper elevation={3}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons={isMobile ? "auto" : false}
            allowScrollButtonsMobile
            centered={!isMobile}
            sx={{ 
              backgroundColor: theme.palette.primary.light,
              '.MuiTab-root': { 
                color: 'white',
                '&.Mui-selected': { 
                  color: 'white', 
                  fontWeight: 'bold' 
                } 
              },
              '.MuiTabs-indicator': { 
                backgroundColor: 'white' 
              }
            }}
          >
            <Tab label="Domande di Base" />
            <Tab label="Gestione Studenti" />
            <Tab label="Gestione Pacchetti" />
            <Tab label="Gestione Lezioni" />
            <Tab label="Casi Particolari" />
          </Tabs>
        </Box>
        
        <Box p={3}>
          {renderSection()}
        </Box>
      </Paper>
    </Container>
  );
}

export default FAQPage;