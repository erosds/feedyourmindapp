import React, { useState } from 'react';
import { Box, Grid, IconButton, Typography, Tooltip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TodayIcon from '@mui/icons-material/Today';
import { format, getYear, getMonth, getDaysInMonth, getDay, startOfMonth, parseISO, addMonths, subMonths, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import getProfessorNameById from '../../utils/professorMapping';

const PackageCalendar = ({ lessons, professors, onDayClick, expiryDate, startDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const changeMonth = (offset) => {
    if (offset === 1) {
      setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
    } else {
      setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
    }
  };

  const resetToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const year = getYear(currentMonth);
  const month = getMonth(currentMonth);
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const firstDayOfMonth = getDay(startOfMonth(new Date(year, month)));

  // Weekday names (abbreviated)
  const weekdays = ["Lu", "Ma", "Me", "Gi", "Ve", "Sa", "Do"];

  // Adjust weekdays to start from Monday (0 = Monday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  // Create array with all days of the month
  let days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Add empty days at the beginning to align the calendar
  const emptyDays = Array(adjustedFirstDay).fill(null);
  days = [...emptyDays, ...days];

  // Organize lessons by day with details for each teacher
  const lessonsByDay = {};

  if (Array.isArray(lessons)) {
    lessons.forEach(lesson => {
      if (!lesson.lesson_date) return;

      const lessonDate = parseISO(lesson.lesson_date);
      const dateKey = format(lessonDate, 'yyyy-MM-dd');

      if (!lessonsByDay[dateKey]) {
        lessonsByDay[dateKey] = [];
      }

      // Add this lesson to the day's array
      lessonsByDay[dateKey].push({
        professorId: lesson.professor_id,
        professorName: professors && professors[lesson.professor_id] ?
          professors[lesson.professor_id] :
          `Prof. ${lesson.professor_id}`,
        duration: parseFloat(lesson.duration)
      });
    });
  }

  // Parse the start date if provided
  const packageStartDate = startDate ? parseISO(startDate) : null;

  return (
    <Box sx={{ position: 'relative', overflow: 'visible' , mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <IconButton size="small" onClick={() => changeMonth(-1)}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" align="center">
          {format(currentMonth, 'MMMM yyyy', { locale: it })}
        </Typography>
        <Box>
          {/* Aggiungiamo un pulsante per tornare al mese corrente */}
          <IconButton size="small" onClick={resetToCurrentMonth} sx={{ mr: 0.5 }}>
            <TodayIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => changeMonth(1)}>
            <ArrowBackIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={0.5}>
        {/* Weekday headers */}
        {weekdays.map((day, index) => (
          <Grid item xs={12 / 7} key={`weekday-${index}`}>
            <Box
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                p: 0.5,
                fontSize: '0.75rem',
              }}
            >
              {day}
            </Box>
          </Grid>
        ))}

        {/* Days of the month */}
        {days.map((day, index) => {
          if (!day) {
            // Empty cell for days before the start of the month
            return <Grid item xs={12 / 7} key={`day-${index}`} />;
          }

          // Check if this day has lessons
          const dateObj = new Date(year, month, day);
          const dateKey = format(dateObj, 'yyyy-MM-dd');
          const hasLesson = lessonsByDay[dateKey] && lessonsByDay[dateKey].length > 0;
          const dayLessons = hasLesson ? lessonsByDay[dateKey] : [];
          const isToday = isSameDay(dateObj, new Date());
          const isPastExpiryDate = expiryDate && dateObj > new Date(expiryDate);

          // Check if this is the package start date
          const isPackageStartDate = packageStartDate && isSameDay(dateObj, packageStartDate);

          // Prepare tooltip content for lessons
          const lessonsTooltipContent = hasLesson ? (
            <Box sx={{ p: 0.5 }}>
              {dayLessons.map((lesson, i) => (
                <Box key={i} sx={{
                  textAlign: 'left',
                  py: 0.2,
                  borderBottom: i < dayLessons.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                }}>
                  {lesson.duration} {lesson.duration === 1 || lesson.duration === 1.0 ? 'ora' : 'ore'} con {getProfessorNameById(lesson.professorId)}
                </Box>
              ))}
            </Box>
          ) : null;

          return (
            <Grid item xs={12 / 7} key={`day-${index}`}>
              <Box sx={{
                position: 'relative',
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Tooltip
                  title={
                    <>
                      {isPackageStartDate && <Box>Inizio pacchetto</Box>}
                      {lessonsTooltipContent}
                    </>
                  }
                  arrow
                  placement="top"
                  PopperProps={{
                    style: { zIndex: 1400 },
                    modifiers: [{
                      name: 'preventOverflow',
                      enabled: false
                    }]
                  }}
                  // Aggiungi questa riga:
                  disableHoverListener={!isPackageStartDate && !hasLesson}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: 'primary.main',  // Colore di sfondo del tooltip
                        opacity: 0.5,
                        color: 'primary.contrastText',  // Colore del testo
                        '& .MuiTooltip-arrow': {
                          color: 'primary.main'  // Colore della freccia
                        }
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      textAlign: 'center',
                      borderRadius: '50%',
                      height: 32,
                      width: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isToday ? 1 : 0,
                      borderColor: 'primary.main',
                      bgcolor: hasLesson ? 'primary.main' : 'transparent',
                      color: hasLesson ? 'primary.contrastText' : (isPastExpiryDate ? 'text.disabled' : 'text.primary'),
                      opacity: isPastExpiryDate ? 0.5 : 1,
                      cursor: isPastExpiryDate ? 'not-allowed' : (onDayClick ? 'pointer' : 'default'),
                      '&:hover': {
                        ...(onDayClick && !isPastExpiryDate && {
                          transform: 'scale(1.1)',
                          boxShadow: '0 0 5px rgba(0,0,0,0.2)',
                        })
                      },
                    }}
                    onClick={() => {
                      if (onDayClick && !isPastExpiryDate) {
                        onDayClick(dateObj);
                      } else if (isPastExpiryDate) {
                        alert("Non è possibile aggiungere lezioni oltre la data di scadenza del pacchetto");
                      }
                    }}
                  >
                    {day}
                    {/* Semicirconferenza per indicare l'inizio del pacchetto */}
                    {isPackageStartDate && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: -1,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16,
                          height: 32,
                          borderRadius: '16px 0 0 16px',
                          border: '2px solid',
                          borderColor: 'secondary.main',
                          borderRight: 'none',
                          boxSizing: 'border-box',
                          zIndex: 1
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default PackageCalendar;