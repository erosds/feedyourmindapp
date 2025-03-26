// src/utils/lessonOverlapUtils.js
import { parseISO } from 'date-fns';

/**
 * Checks if a lesson overlaps with existing lessons for the same student
 * 
 * @param {Object} formValues - The form values for the new lesson
 * @param {Array} existingLessons - All existing lessons to check against
 * @param {number} lessonIdToExclude - Optional ID of lesson to exclude (for editing)
 * @returns {Object} Result with hasOverlap flag and overlappingLesson object if found
 */
export const checkLessonOverlap = (formValues, existingLessons, lessonIdToExclude = null) => {
  // Filter to only include lessons for the same student
  const studentLessons = existingLessons.filter(
    lesson => lesson.student_id === parseInt(formValues.student_id)
  );
  
  if (!studentLessons.length || !formValues.student_id) {
    return { hasOverlap: false };
  }

  // Convert form values to Date objects for comparison
  const lessonDate = new Date(formValues.lesson_date);
  
  let startHours, startMinutes;
  if (formValues.start_time instanceof Date) {
    startHours = formValues.start_time.getHours();
    startMinutes = formValues.start_time.getMinutes();
  } else if (typeof formValues.start_time === 'string' && formValues.start_time) {
    const timeParts = formValues.start_time.split(':');
    startHours = parseInt(timeParts[0] || 0);
    startMinutes = parseInt(timeParts[1] || 0);
  } else {
    startHours = 0;
    startMinutes = 0;
  }
  
  // Create Date objects for the new lesson's start and end times
  const newLessonStart = new Date(lessonDate);
  newLessonStart.setHours(startHours, startMinutes, 0, 0);
  
  const durationHours = Math.floor(parseFloat(formValues.duration));
  const durationMinutes = Math.round((parseFloat(formValues.duration) - durationHours) * 60);
  
  const newLessonEnd = new Date(newLessonStart);
  newLessonEnd.setHours(
    newLessonStart.getHours() + durationHours,
    newLessonStart.getMinutes() + durationMinutes,
    0,
    0
  );

  // Check each existing lesson for overlap
  for (const lesson of studentLessons) {
    // Skip the current lesson if we're editing
    if (lessonIdToExclude && lesson.id === parseInt(lessonIdToExclude)) {
      continue;
    }
    
    // Get the date of the existing lesson
    const existingDate = parseISO(lesson.lesson_date);
    
    // Only check lessons on the same day
    if (existingDate.getDate() !== lessonDate.getDate() ||
        existingDate.getMonth() !== lessonDate.getMonth() ||
        existingDate.getFullYear() !== lessonDate.getFullYear()) {
      continue;
    }
    
    // Extract start time
    let existingStartHours = 0, existingStartMinutes = 0;
    if (lesson.start_time) {
      const timeParts = typeof lesson.start_time === 'string' 
        ? lesson.start_time.split(':') 
        : [0, 0];
      existingStartHours = parseInt(timeParts[0] || 0);
      existingStartMinutes = parseInt(timeParts[1] || 0);
    }
    
    // Create Date objects for existing lesson's start and end
    const existingLessonStart = new Date(existingDate);
    existingLessonStart.setHours(existingStartHours, existingStartMinutes, 0, 0);
    
    const existingDurationHours = Math.floor(parseFloat(lesson.duration));
    const existingDurationMinutes = Math.round((parseFloat(lesson.duration) - existingDurationHours) * 60);
    
    const existingLessonEnd = new Date(existingLessonStart);
    existingLessonEnd.setHours(
      existingLessonStart.getHours() + existingDurationHours,
      existingLessonStart.getMinutes() + existingDurationMinutes,
      0,
      0
    );
    
    // Check for overlap: (new start < existing end) AND (new end > existing start)
    if (newLessonStart < existingLessonEnd && newLessonEnd > existingLessonStart) {
      return {
        hasOverlap: true,
        overlappingLesson: lesson
      };
    }
  }
  
  return { hasOverlap: false };
};