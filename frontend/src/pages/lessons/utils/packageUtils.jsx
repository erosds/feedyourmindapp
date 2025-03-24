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