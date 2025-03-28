// src/components/dashboard/DayProfessorsDialog.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/api';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Avatar,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

function DayProfessorsDialog({ open, onClose, selectedDay, professorSchedules, handleProfessorClick }) {
  const navigate = useNavigate();
  const [enrichedSchedules, setEnrichedSchedules] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Define working day hours (8:00 - 22:00)
  const dayStartHour = 8;
  const dayEndHour = 22;
  const totalHours = dayEndHour - dayStartHour;
  
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
  
  // Generate hour labels for timeline
  const hourLabels = Array.from({ length: totalHours + 1 }, (_, i) => dayStartHour + i);
  
  // Function to calculate exact position of hours (percentage)
  const calculateHourPosition = (hour) => {
    return ((hour - dayStartHour) / totalHours) * 100;
  };

  // Function to navigate to lesson details
  const handleLessonClick = (lessonId, event) => {
    event.stopPropagation(); // Prevent triggering professor click
    navigate(`/lessons/${lessonId}`);
  };

  // Function to get student names using existing service
  const fetchStudentNames = async (studentIds) => {
    try {
      // Use existing service to get all students
      const response = await studentService.getAll();
      
      // Filter only students we're interested in
      if (response && response.data) {
        const allStudents = response.data;
        return allStudents.filter(student => studentIds.includes(student.id));
      }
      
      return [];
    } catch (error) {
      console.error("Error fetching student names:", error);
      return []; // Error handling
    }
  };
  
  // Effect to load student names when data changes
  useEffect(() => {
    const enrichLessonsWithStudentNames = async () => {
      if (!professorSchedules) return;
      
      setLoading(true);
      
      try {
        // Collect all student IDs
        const studentIds = new Set();
        professorSchedules.forEach(prof => {
          prof.lessons.forEach(lesson => {
            if (lesson.student_id) studentIds.add(lesson.student_id);
          });
        });
        
        // If no student IDs, no need for API call
        if (studentIds.size === 0) {
          setEnrichedSchedules(professorSchedules);
          return;
        }
        
        // Fetch student names from API
        const students = await fetchStudentNames([...studentIds]);
        
        // Verify response contains data
        if (!students || !Array.isArray(students) || students.length === 0) {
          throw new Error("Invalid student data from API response");
        }
        
        // Create mapping for easy lookup
        const studentMap = {};
        students.forEach(student => {
          if (student && student.id) {
            studentMap[student.id] = `${student.first_name} ${student.last_name}`;
          }
        });
        
        // Enrich lessons with student names
        const enriched = professorSchedules.map(prof => ({
          ...prof,
          lessons: prof.lessons.map(lesson => ({
            ...lesson,
            student_name: studentMap[lesson.student_id] || `Studente #${lesson.student_id}`
          }))
        }));
        
        setEnrichedSchedules(enriched);
      } catch (error) {
        console.error("Error enriching lessons with student names:", error);
        // In case of error, use original data
        setEnrichedSchedules(professorSchedules);
      } finally {
        setLoading(false);
      }
    };
    
    enrichLessonsWithStudentNames();
  }, [professorSchedules]);
  
  if (!selectedDay || !professorSchedules) return null;
  
  // Use enriched data if available, otherwise original data
  const schedules = enrichedSchedules || professorSchedules;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Professori in sede {selectedDay && format(selectedDay, "EEEE d MMMM yyyy", { locale: it })}
      </DialogTitle>
      <DialogContent sx={{ minHeight: loading ? '200px' : 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px">
            <CircularProgress />
          </Box>
        ) : schedules.length === 0 ? (
          <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
            Nessun professore in sede in questo giorno
          </Typography>
        ) : (
          <Box sx={{ mt: 2 }}>
            {/* Timeline header with hours */}
            <Box 
              sx={{ 
                display: 'flex', 
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
                pb: 1,
                mb: 2,
                position: 'relative'
              }}
            >
              {/* Space for professor names */}
              <Box sx={{ width: '200px', flexShrink: 0 }}></Box>
              
              {/* Timeline with hours - redesigned for precise alignment */}
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
                      width: 'auto',
                      textAlign: 'center',
                      color: 'text.secondary'
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
            
            {/* Professor rows with their lessons */}
            {schedules.map((prof) => (
              <Box 
                key={prof.id} 
                sx={{ 
                  display: 'flex', 
                  mb: 2,
                  pb: 2,
                  borderBottom: '1px solid rgba(224, 224, 224, 0.5)',
                  '&:hover': { 
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    cursor: 'pointer'
                  }
                }}
                onClick={() => handleProfessorClick(prof.id)}
              >
                {/* Professor information */}
                <Box 
                  sx={{ 
                    width: '200px', 
                    flexShrink: 0, 
                    pr: 2,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: 'primary.main',
                      mr: 1
                    }}
                  >
                    {prof.first_name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" noWrap>
                      {prof.first_name} {prof.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {prof.lessons.length} lezioni • {prof.totalHours.toFixed(1)} ore
                    </Typography>
                  </Box>
                </Box>
                
                {/* Lesson timeline with fixed height */}
                <Box sx={{ flex: 1, position: 'relative', height: '60px' }}>
                  {(() => {
                    // Calculate distribution of lessons in fixed height
                    
                    // Constant for total container height
                    const TIMELINE_HEIGHT = 60;
                    
                    // Sort lessons by start time
                    const sortedLessons = [...prof.lessons].sort((a, b) => {
                      const timeA = a.start_time ? a.start_time : "00:00";
                      const timeB = b.start_time ? b.start_time : "00:00";
                      return timeA.localeCompare(timeB);
                    });
                    
                    // Determine how many "tracks" we need for each time slot
                    // This allows us to calculate the height of each bar
                    
                    // For each time position, keep track of how many overlaps there are
                    const timeSlots = {};
                    
                    // For each lesson, add +1 to all time slots it covers
                    sortedLessons.forEach(lesson => {
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
                    
                    // Find maximum number of overlaps
                    const maxOverlap = Math.max(1, ...Object.values(timeSlots));
                    
                    // Calculate height of each bar (with some space between bars)
                    const barHeight = Math.max(12, Math.floor((TIMELINE_HEIGHT) / maxOverlap));
                    
                    // Assign lessons to time bands
                    const rows = Array(maxOverlap).fill().map(() => []);
                    
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
                    sortedLessons.forEach(lesson => {
                      let rowIndex = 0;
                      // Find first row without overlaps
                      while (rowIndex < maxOverlap && isOverlapping(lesson, rows[rowIndex])) {
                        rowIndex++;
                      }
                      
                      // If we've exceeded maximum number of rows, put in last row
                      if (rowIndex >= maxOverlap) rowIndex = maxOverlap - 1;
                      
                      // Add lesson to row
                      rows[rowIndex].push(lesson);
                    });
                    
                    // Now display lessons by rows
                    return rows.map((rowLessons, rowIndex) => (
                      <React.Fragment key={`row-${rowIndex}`}>
                        {rowLessons.map((lesson, index) => {
                          const { startPosition, width } = calculateLessonBar(
                            lesson.start_time ? lesson.start_time.substring(0, 5) : null, 
                            parseFloat(lesson.duration)
                          );
                          
                          // Calculate vertical position of bar
                          const topPosition = 2 + rowIndex * (barHeight + 2);
                          
                          // Get student name (now available thanks to API call)
                          const studentName = lesson.student_name;
                          
                          return (
                            <Tooltip 
                              key={`${prof.id}-lesson-${rowIndex}-${index}`}
                              title={
                                <React.Fragment>
                                  <Typography variant="body2" fontWeight="bold">
                                    {studentName}
                                  </Typography>
                                  <Typography variant="caption">
                                    {lesson.start_time ? lesson.start_time.substring(0, 5) : '—'} • {parseFloat(lesson.duration)} ore
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Clicca per vedere i dettagli
                                  </Typography>
                                </React.Fragment>
                              }
                            >
                              <Box
                                onClick={(e) => handleLessonClick(lesson.id, e)}
                                sx={{
                                  position: 'absolute',
                                  left: `${startPosition}%`,
                                  width: `${width}%`,
                                  height: `${barHeight}px`,
                                  top: `${topPosition}px`,
                                  backgroundColor: 'primary.main',
                                  borderRadius: '3px',
                                  opacity: 0.8,
                                  '&:hover': {
                                    opacity: 1,
                                    transform: 'translateY(-1px)',
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
                                  color: 'white',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  textShadow: '0px 0px 2px rgba(0,0,0,0.5)'
                                }}
                              >
                                {/* Show student if bar is wide enough */}
                                {width > 2 && barHeight > 1 && (
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'white',
                                      padding: '0 4px',
                                      textOverflow: 'ellipsis',
                                      overflow: 'hidden',
                                      maxWidth: '100%',
                                      fontSize: '0.6rem',
                                      lineHeight: 1
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
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}

export default DayProfessorsDialog;