// src/pages/lessons/utils/packageUtils.js

/**
 * Calcola le ore utilizzate e disponibili di un pacchetto
 * 
 * @param {Object} params - Parametri della funzione
 * @param {Array} params.packageLessons - Lezioni associate al pacchetto
 * @param {number} params.totalHours - Ore totali del pacchetto
 * @param {Object} params.originalLesson - Lezione originale (in caso di modifica)
 * @param {number} params.packageId - ID del pacchetto
 * @returns {Object} Informazioni su ore utilizzate e disponibili
 */
export const calculatePackageHours = ({ packageLessons, totalHours, originalLesson, packageId }) => {
  if (!packageId || !totalHours) {
    return { usedHours: 0, availableHours: 0, totalAvailable: 0 };
  }
  
  // Calcola la somma delle ore di lezione già usate in questo pacchetto
  const usedHours = packageLessons.reduce((total, lesson) => 
    total + parseFloat(lesson.duration), 0);
  
  // Ore originali della lezione (se stiamo modificando una lezione esistente)
  const originalLessonHours = originalLesson && 
                             originalLesson.is_package && 
                             originalLesson.package_id === packageId 
                              ? parseFloat(originalLesson.duration) : 0;
  
  // Calcola le ore disponibili
  const availableHours = parseFloat(totalHours) - usedHours;
  
  return { 
    usedHours, 
    availableHours,
    totalAvailable: availableHours + originalLessonHours
  };
};

/**
 * Verifica se una lezione si sovrappone con altre lezioni dello stesso studente
 * 
 * @param {Object} params - Parametri della funzione
 * @param {Array} params.existingLessons - Lezioni esistenti dello studente
 * @param {Object} params.newLesson - Nuova lezione da verificare
 * @param {number} params.lessonIdToExclude - ID della lezione da escludere (in caso di modifica)
 * @returns {Object} Risultato della verifica
 */
export const checkLessonOverlap = ({ existingLessons, newLesson, lessonIdToExclude = null }) => {
  // Converti data e ora della nuova lezione in oggetti Date
  const newLessonDate = new Date(newLesson.lesson_date);
  
  // Estrai ore e minuti dalla stringa "HH:MM:SS"
  let startHours, startMinutes;
  
  if (newLesson.start_time instanceof Date) {
    // Se start_time è già un oggetto Date
    startHours = newLesson.start_time.getHours();
    startMinutes = newLesson.start_time.getMinutes();
  } else {
    // Se start_time è una stringa nel formato "HH:MM:SS"
    [startHours, startMinutes] = newLesson.start_time.split(':').map(Number);
  }
  
  // Crea Date oggetti per l'inizio e la fine della nuova lezione
  const newLessonStart = new Date(newLessonDate);
  newLessonStart.setHours(startHours, startMinutes, 0, 0);
  
  // Calcola l'orario di fine (ore * durata)
  const newLessonDuration = parseFloat(newLesson.duration);
  const durationHours = Math.floor(newLessonDuration);
  const durationMinutes = (newLessonDuration - durationHours) * 60;
  
  const newLessonEnd = new Date(newLessonStart);
  newLessonEnd.setHours(
    newLessonStart.getHours() + durationHours,
    newLessonStart.getMinutes() + durationMinutes,
    0,
    0
  );
  
  // Filtra le lezioni dello stesso giorno
  const sameDayLessons = existingLessons.filter(lesson => {
    // Escludi la lezione corrente se stiamo modificando
    if (lessonIdToExclude && lesson.id === lessonIdToExclude) return false;
    
    // Verifica se la lezione è dello stesso giorno
    const lessonDate = new Date(lesson.lesson_date);
    return lessonDate.getFullYear() === newLessonDate.getFullYear() &&
           lessonDate.getMonth() === newLessonDate.getMonth() &&
           lessonDate.getDate() === newLessonDate.getDate();
  });
  
  // Verifica se c'è sovrapposizione
  for (const lesson of sameDayLessons) {
    // Converti l'orario di inizio della lezione esistente
    const lessonStartTime = lesson.start_time;
    let existingStartHours, existingStartMinutes;
    
    if (typeof lessonStartTime === 'string') {
      [existingStartHours, existingStartMinutes] = lessonStartTime.split(':').map(Number);
    } else {
      // Se non c'è start_time, ignora questa lezione (non dovrebbe accadere)
      continue;
    }
    
    // Crea Date oggetti per l'inizio e la fine della lezione esistente
    const existingLessonStart = new Date(new Date(lesson.lesson_date));
    existingLessonStart.setHours(existingStartHours, existingStartMinutes, 0, 0);
    
    // Calcola l'orario di fine
    const existingLessonDuration = parseFloat(lesson.duration);
    const existingDurationHours = Math.floor(existingLessonDuration);
    const existingDurationMinutes = (existingLessonDuration - existingDurationHours) * 60;
    
    const existingLessonEnd = new Date(existingLessonStart);
    existingLessonEnd.setHours(
      existingLessonStart.getHours() + existingDurationHours,
      existingLessonStart.getMinutes() + existingDurationMinutes,
      0,
      0
    );
    
    // Verifica sovrapposizione
    // (nuova inizio < esistente fine) AND (nuova fine > esistente inizio)
    if (newLessonStart < existingLessonEnd && newLessonEnd > existingLessonStart) {
      return {
        hasOverlap: true,
        overlappingLesson: lesson
      };
    }
  }
  
  return { hasOverlap: false };
};

/**
 * Controlla se la durata della lezione supera le ore disponibili nel pacchetto
 * 
 * @param {Object} params - Parametri della funzione
 * @param {Object} params.formValues - Valori del form
 * @param {Array} params.packages - Lista di pacchetti disponibili
 * @param {Array} params.packageLessons - Lezioni associate al pacchetto
 * @param {Object} params.originalLesson - Lezione originale (in caso di modifica)
 * @returns {Object} Risultato del controllo e dettagli overflow
 */
export const checkPackageOverflow = ({ formValues, packages, packageLessons, originalLesson }) => {
  // Se non è un pacchetto o non è specificato un pacchetto, non c'è overflow
  if (!formValues.is_package || !formValues.package_id) {
    return { hasOverflow: false };
  }
  
  // Trova il pacchetto selezionato
  const selectedPackage = packages.find(pkg => pkg.id === parseInt(formValues.package_id));
  
  if (!selectedPackage) {
    return { hasOverflow: false };
  }
  
  const { availableHours, totalAvailable } = calculatePackageHours({
    packageLessons,
    totalHours: selectedPackage.total_hours,
    originalLesson,
    packageId: parseInt(formValues.package_id)
  });
  
  const isEditMode = originalLesson !== null;
  const duration = parseFloat(formValues.duration);
  
  // Verifica se la durata supera le ore disponibili
  const availableToCheck = isEditMode ? totalAvailable : availableHours;
  const hasOverflow = duration > availableToCheck;
  
  if (hasOverflow) {
    const overflowHours = duration - availableToCheck;
    
    return {
      hasOverflow: true,
      details: {
        totalHours: duration,
        remainingHours: availableToCheck,
        overflowHours: overflowHours
      }
    };
  }
  
  return { hasOverflow: false };
};