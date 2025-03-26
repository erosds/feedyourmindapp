// Prima definire checkLessonOverlap al livello giusto, dopo getAvailableHours
const checkLessonOverlap = (formValues) => {
    // Implementazione della funzione...
  };
  
  // Poi la funzione handleSubmitLesson dovrebbe essere completa e chiusa correttamente
  const handleSubmitLesson = async () => {
    try {
      // Codice esistente...
      
      // Controllo sovrapposizioni
      const { hasOverlap, overlappingLesson } = checkLessonOverlap(lessonForm);
      
      if (hasOverlap) {
        setOverlappingLesson(overlappingLesson);
        setOverlapWarningOpen(true);
        setSubmitting(false);
        return;
      }
      
      // Resto del codice...
      
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  }; // Chiusura corretta
  
  // Calcoli derivati al livello giusto, fuori da qualsiasi funzione
  const availableHours = getAvailableHours();
  const isPackageToggleDisabled = submitting || !lessonForm.student_id || localPackages.length === 0;
  // Altri calcoli...