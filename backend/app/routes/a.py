{/* Sostituisci questa condizione: */}
{packageData.status === 'in_progress' && (
  <Button
    variant="contained"
    color="primary"
    startIcon={<AddLessonIcon />}
    onClick={handleAddLesson}
    sx={{ mr: 1 }}
    size='small'
  >
    Aggiungi Lezioni al Pacchetto
  </Button>
)}

{/* Con questa: */}
{parseFloat(packageData.remaining_hours) > 0 && (
  <Button
    variant="contained"
    color="primary"
    startIcon={<AddLessonIcon />}
    onClick={handleAddLesson}
    sx={{ mr: 1 }}
    size='small'
  >
    Aggiungi Lezioni al Pacchetto
  </Button>
)}