// src/components/dashboard/DayDetailsDialog.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import AddIcon from '@mui/icons-material/Add';

function DayDetailsDialog({ open, onClose, onAddLesson, selectedDay, dayLessons, studentsMap }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  if (!selectedDay) return null;
  
  // Sort lessons by start time
  const sortedLessons = [...dayLessons].sort((a, b) => {
    const timeA = a.start_time ? a.start_time.substring(0, 5) : '00:00';
    const timeB = b.start_time ? b.start_time.substring(0, 5) : '00:00';
    return timeA.localeCompare(timeB);
  });

  // Define working day hours (8:00 - 22:00)
  // On mobile, reduce the displayed hours to prevent overlapping
  const dayStartHour = 8;
  const dayEndHour = 22;
  const totalHours = dayEndHour - dayStartHour;
  
  // For mobile, display fewer hour labels to prevent overlapping
  const hourStep = isMobile ? 2 : 1; // Show every 2 hours on mobile
  
  // Generate hour labels for timeline - on mobile, only show every 2 hours
  const hourLabels = Array.from(
    { length: Math.ceil((totalHours + 1) / hourStep) }, 
    (_, i) => dayStartHour + (i * hourStep)
  );
  
  // Function to convert time "10:30" to minutes since midnight (630)
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return dayStartHour * 60;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Function to calculate position and width of lesson bar
  const calculateLessonBar = (startTime, duration) => {
    // Convert start time to minutes since midnight
    const startMinutes = timeToMinutes(startTime);
    // Convert duration to minutes
    const durationMinutes = duration * 60;
    
    // Calculate relative start position (percentage)
    const dayStartMinutes = dayStartHour * 60;
    const dayEndMinutes = dayEndHour * 60;
    const totalDayMinutes = dayEndMinutes - dayStartMinutes;
    
    // Calculate position and width as percentages
    const startPosition = Math.max(0, ((startMinutes - dayStartMinutes) / totalDayMinutes) * 100);
    const width = Math.min(100 - startPosition, (durationMinutes / totalDayMinutes) * 100);
    
    return { startPosition, width };
  };
  
  // Function to calculate exact position of hours (percentage)
  const calculateHourPosition = (hour) => {
    return ((hour - dayStartHour) / totalHours) * 100;
  };

  // Function to navigate to lesson details
  const handleLessonClick = (lessonId) => {
    navigate(`/lessons/${lessonId}`);
  };

  // Calculate the maximum number of overlaps for the timeline height
  const calculateMaxOverlaps = (lessons) => {
    const timeSlots = {};
    
    // For each lesson, add +1 to all time slots it covers
    lessons.forEach(lesson => {
      const { startPosition, width } = calculateLessonBar(
        lesson.start_time ? lesson.start_time.substring(0, 5) : null, 
        parseFloat(lesson.duration)
      );
      
      // Round to have discrete slots (5% increments)
      const startSlot = Math.floor(startPosition / 5) * 5;
      const endSlot = Math.ceil((startPosition + width) / 5) * 5;
      
      // For each time slot covered by the lesson
      for (let slot = startSlot; slot < endSlot; slot += 5) {
        if (!timeSlots[slot]) timeSlots[slot] = 0;
        timeSlots[slot]++;
      }
    });
    
    // Find maximum number of overlaps (minimum 1)
    return Math.max(1, ...Object.values(timeSlots));
  };

  // Calculate the maximum number of overlaps
  const maxOverlaps = calculateMaxOverlaps(sortedLessons);
  
  // Calculate the timeline height based on number of overlaps
  // Each row needs at least 15px height + 2px spacing
  const minHeight = maxOverlaps * 17; // 15px per row + 2px spacing
  const timelineHeight = Math.max(120, minHeight);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Lezioni per {format(selectedDay, "EEEE d MMMM yyyy", { locale: it })}
      </DialogTitle>
      <DialogContent>
        {sortedLessons.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            {/* Timeline header with hours */}
            <Box 
              sx={{ 
                display: 'flex', 
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                pb: 1,
                mb: 3,
                position: 'relative'
              }}
            >
              {/* Timeline with hours */}
              <Box sx={{ flex: 1, position: 'relative', height: 30 }}>
                {/* Hour labels */}
                {hourLabels.map((hour) => (
                  <Typography 
                    key={hour} 
                    variant="caption" 
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: `${calculateHourPosition(hour)}%`,
                      transform: 'translateX(-50%)', // Center label on line
                      width: isMobile ? '24px' : 'auto', // Fixed width on mobile
                      textAlign: 'center',
                      color: 'text.secondary',
                      fontSize: isMobile ? '0.6rem' : '0.75rem' // Smaller font on mobile
                    }}
                  >
                    {hour}:00
                  </Typography>
                ))}
                
                {/* Vertical dividing lines - in header */}
                {hourLabels.map((hour, index) => {
                  // First line (left) has different style
                  const isFirst = index === 0;
                  return (
                    <Box
                      key={`header-line-${hour}`}
                      sx={{
                        position: 'absolute',
                        left: `${calculateHourPosition(hour)}%`,
                        top: 20, // Below labels
                        bottom: 0,
                        width: '1px',
                        backgroundColor: isFirst ? 'transparent' : 'rgba(224, 224, 224, 0.8)',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            {/* Timeline of lessons - dynamic height based on overlaps */}
            <Box sx={{ position: 'relative', height: `${timelineHeight}px`, mb: 1, mt: -2 }}>
              {/* Vertical dividing lines for hours - in main body */}
              {hourLabels.map((hour, index) => {
                // First line (left) has different style
                const isFirst = index === 0;
                
                return (
                  <Box
                    key={`divider-${hour}`}
                    sx={{
                      position: 'absolute',
                      left: `${calculateHourPosition(hour)}%`,
                      top: 0,
                      bottom: 0,
                      width: '1px',
                      backgroundColor: isFirst ? 'transparent' : 'rgba(224, 224, 224, 0.5)'
                    }}
                  />
                );
              })}

              {(() => {
                // Calculate layout with rows to fully use available height
                
                // Sort lessons by start time
                const sortedTimelineLessons = [...sortedLessons].sort((a, b) => {
                  const timeA = a.start_time ? a.start_time : "00:00";
                  const timeB = b.start_time ? b.start_time : "00:00";
                  return timeA.localeCompare(timeB);
                });
                
                // Calculate height of each bar (with space between bars)
                const barHeight = Math.floor((timelineHeight - (maxOverlaps - 1) * 2) / maxOverlaps);
                
                // Assign lessons to time bands
                const rows = Array(maxOverlaps).fill().map(() => []);
                
                // Function to check for overlaps
                const isOverlapping = (lesson, rowLessons) => {
                  const { startPosition: lessonStart, width: lessonWidth } = calculateLessonBar(
                    lesson.start_time ? lesson.start_time.substring(0, 5) : null, 
                    parseFloat(lesson.duration)
                  );
                  const lessonEnd = lessonStart + lessonWidth;
                  
                  for (const existingLesson of rowLessons) {
                    const { startPosition: existingStart, width: existingWidth } = calculateLessonBar(
                      existingLesson.start_time ? existingLesson.start_time.substring(0, 5) : null, 
                      parseFloat(existingLesson.duration)
                    );
                    const existingEnd = existingStart + existingWidth;
                    
                    // If there's overlap
                    if (lessonStart < existingEnd && lessonEnd > existingStart) {
                      return true;
                    }
                  }
                  return false;
                };
                
                // Assign each lesson to first available row
                sortedTimelineLessons.forEach(lesson => {
                  let rowIndex = 0;
                  // Find first row without overlaps
                  while (rowIndex < maxOverlaps && isOverlapping(lesson, rows[rowIndex])) {
                    rowIndex++;
                  }
                  
                  // If we've exceeded maximum number of rows, put in last row
                  if (rowIndex >= maxOverlaps) rowIndex = maxOverlaps - 1;
                  
                  // Add lesson to row
                  rows[rowIndex].push(lesson);
                });

                // Render all the lessons by row
                return rows.map((rowLessons, rowIndex) => (
                  <React.Fragment key={`row-${rowIndex}`}>
                    {rowLessons.map((lesson, index) => {
                      const { startPosition, width } = calculateLessonBar(
                        lesson.start_time ? lesson.start_time.substring(0, 5) : null, 
                        parseFloat(lesson.duration)
                      );
                      
                      // Calculate vertical position
                      const topPosition = 2 + rowIndex * (barHeight + 2);
                      
                      // Get student name
                      const studentName = studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`;
                      
                      // Don't show text in very narrow bars on mobile
                      const showText = !isMobile || width > 5;
                      
                      return (
                        <Tooltip 
                          key={`lesson-${lesson.id}-${rowIndex}`}
                          title={
                            <React.Fragment>
                              <Typography variant="body2" fontWeight="bold">
                                {studentName}
                              </Typography>
                              <Typography variant="caption">
                                {lesson.start_time ? lesson.start_time.substring(0, 5) : '—'} • {parseFloat(lesson.duration)} ore
                              </Typography>
                              <Typography variant="caption" display="block">
                                €{parseFloat(lesson.total_payment).toFixed(2)}
                                {lesson.is_package ? ' • Da pacchetto' : ''}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Clicca per vedere i dettagli
                              </Typography>
                            </React.Fragment>
                          }
                        >
                          <Box
                            onClick={() => handleLessonClick(lesson.id)}
                            sx={{
                              position: 'absolute',
                              left: `${startPosition}%`,
                              width: `${width}%`,
                              height: `${barHeight}px`,
                              top: `${topPosition}px`,
                              backgroundColor: lesson.is_online ? 'secondary.main' : 'primary.main',
                              borderRadius: '3px',
                              opacity: 0.85,
                              '&:hover': {
                                opacity: 1,
                                boxShadow: 1,
                                zIndex: 10,
                                cursor: 'pointer'
                              },
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              color: 'white'
                            }}
                          >
                            {showText && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'white',
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  maxWidth: '100%',
                                  fontSize: isMobile ? '0.6rem' : '0.7rem',
                                  textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
                                  px: 0.5
                                }}
                                noWrap
                              >
                                {studentName}
                              </Typography>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </React.Fragment>
                ));
              })()}
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Compact list view below timeline */}
            <Typography variant="subtitle1" gutterBottom>
              Dettaglio lezioni
            </Typography>
            
            {sortedLessons.map((lesson) => (
              <Box 
                key={lesson.id} 
                sx={{ 
                  mb: 1, 
                  py: 1.2, 
                  px: 1.5,
                  borderRadius: 1, 
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 1,
                    cursor: 'pointer'
                  }
                }}
                onClick={() => handleLessonClick(lesson.id)}
              >
                {/* Modified layout to prevent text overlapping on mobile */}
                {isMobile ? (
                  // Mobile layout - split into two rows
                  <Box>
                    {/* First row with time and student name */}
                    <Box display="flex" alignItems="center" mb={0.5}>
                      <Typography variant="body1" fontWeight="medium" sx={{ mr: 1, minWidth: '40px' }}>
                        {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                      </Typography>
                      <Typography variant="body1" noWrap sx={{ flex: 1 }}>
                        {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                      </Typography>
                    </Box>
                    
                    {/* Second row with duration, badges and payment */}
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2" sx={{ mr: 1, minWidth: '40px' }}>
                          {lesson.duration} ore
                        </Typography>
                        {lesson.is_package && (
                          <Chip
                            label="P"
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 0.5, height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.625rem' } }}
                          />
                        )}
                        {lesson.is_online && (
                          <Chip
                            label="online"
                            size="small"
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.625rem' } }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" fontWeight="medium" sx={{ minWidth: '70px', textAlign: 'right' }}>
                        €{parseFloat(lesson.total_payment).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  // Desktop layout - single row with all elements
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box display="flex" alignItems="center">
                      <Typography variant="body1" fontWeight="medium" sx={{ mr: 1 }}>
                        {lesson.start_time ? lesson.start_time.substring(0, 5) : '00:00'}
                      </Typography>
                      <Typography variant="body1" noWrap sx={{ maxWidth: { xs: '130px', sm: '200px', md: '300px' } }}>
                        {studentsMap[lesson.student_id] || `Studente #${lesson.student_id}`}
                      </Typography>
                      {lesson.is_package && (
                        <Chip
                          label="P"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ ml: 1, height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.625rem' } }}
                        />
                      )}
                      {lesson.is_online && (
                        <Chip
                          label="online"
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ ml: 1, height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.625rem' } }}
                        />
                      )}
                    </Box>
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2" sx={{ mr: 2 }}>
                        {lesson.duration} ore
                      </Typography>
                      <Typography variant="body2" fontWeight="medium" sx={{ minWidth: '70px', textAlign: 'right' }}>
                        €{parseFloat(lesson.total_payment).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="120px"
            p={3}
            textAlign="center"
          >
            <Typography variant="body1" color="text.secondary" paragraph>
              Non hai lezioni programmate per questa giornata.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
        <Button
          onClick={onAddLesson}
          color="primary"
          variant="contained"
          startIcon={<AddIcon />}
        >
          Aggiungi Lezione
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default DayDetailsDialog;