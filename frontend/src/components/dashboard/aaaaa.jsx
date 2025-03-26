// Aggiungi questi import nella sezione degli import esistenti
import AddLessonDialog from '../../components/dashboard/AddLessonDialog';

function PackageDetailPage() {
  // ...codice esistente...
  
  // Aggiungi questi stati
  const [addLessonDialogOpen, setAddLessonDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentLessons, setStudentLessons] = useState([]);
  
  // Stato per il form della lezione
  const [lessonForm, setLessonForm] = useState({
    professor_id: currentUser?.id || '',
    student_id: '',
    lesson_date: new Date(),
    start_time: new Date(new Date().setHours(14, 0, 0, 0)), // Default alle 14:00
    duration: 1,
    is_package: true,
    package_id: null,
    hourly_rate: '',
    is_paid: true,
    payment_date: new Date(), // Default oggi
  });

  // Modifica useEffect per caricare anche gli studenti e impostare i valori di default
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Load package data
        const packageResponse = await packageService.getById(id);
        setPackageData(packageResponse.data);

        // Load student data
        const studentResponse = await studentService.getById(packageResponse.data.student_id);
        setStudent(studentResponse.data);
        
        // Imposta lo student_id nel form
        setLessonForm(prev => ({
          ...prev,
          student_id: packageResponse.data.student_id,
          package_id: parseInt(id),
          is_package: true
        }));
        
        // Carica tutti gli studenti per il componente StudentAutocomplete
        const studentsResponse = await studentService.getAll();
        setStudents(studentsResponse.data);

        // Load lessons related to the package
        const lessonsResponse = await lessonService.getAll();
        const packageLessons = lessonsResponse.data.filter(
          lesson => lesson.package_id === parseInt(id) && lesson.is_package
        );
        setLessons(packageLessons);
        
        // Load student lessons for overlap checks
        const studentLessonsResponse = await lessonService.getByStudent(packageResponse.data.student_id);
        setStudentLessons(studentLessonsResponse.data);

        // ...resto del codice...
      } catch (err) {
        // ...gestione errori...
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Funzione per gestire il click su un giorno del calendario
  const handleDayClick = (day) => {
    setSelectedDay(day);
    setLessonForm(prev => ({
      ...prev,
      lesson_date: day,
      professor_id: currentUser?.id || '',
      student_id: packageData.student_id,
      package_id: parseInt(id),
      is_package: true
    }));
    setAddLessonDialogOpen(true);
  };
  
  // Funzione per calcolare le ore disponibili nel pacchetto
  const calculatePackageHours = (packageId, totalHours) => {
    if (!packageId || !totalHours) return { usedHours: 0, availableHours: 0 };

    // Calcola la somma delle ore di lezione già usate in questo pacchetto
    const usedHours = lessons.reduce((total, lesson) =>
      total + parseFloat(lesson.duration), 0);

    // Calcola le ore disponibili
    const availableHours = parseFloat(totalHours) - usedHours;

    return {
      usedHours,
      availableHours
    };
  };
  
  // Funzione per aggiornare le lezioni dopo un'aggiunta
  const updateLessons = async () => {
    try {
      const lessonsResponse = await lessonService.getAll();
      const packageLessons = lessonsResponse.data.filter(
        lesson => lesson.package_id === parseInt(id) && lesson.is_package
      );
      setLessons(packageLessons);
      
      // Aggiorna anche i dati del pacchetto per riflettere le ore aggiornate
      const packageResponse = await packageService.getById(id);
      setPackageData(packageResponse.data);
    } catch (err) {
      console.error('Error updating lessons:', err);
    }
  };

  return (
    <Box>
      {/* ... codice esistente ... */}
      
      {/* Aggiungi il componente PackageCalendar con l'handler per il click */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom mb={3.3}>
              Calendario Lezioni
            </Typography>
            <PackageCalendar 
              lessons={lessons} 
              professors={professors}
              onDayClick={handleDayClick} // Aggiungi questa prop al componente PackageCalendar
            />
          </CardContent>
        </Card>
      </Grid>
      
      {/* ... resto del codice ... */}
      
      {/* Aggiungi il dialogo */}
      <AddLessonDialog
        open={addLessonDialogOpen}
        onClose={() => setAddLessonDialogOpen(false)}
        selectedDay={selectedDay}
        lessonForm={lessonForm}
        setLessonForm={setLessonForm}
        students={students}
        studentPackages={[packageData]} // Passa solo il pacchetto corrente
        selectedPackage={packageData}
        formError={null}
        formSubmitting={false}
        handleStudentChange={() => {}} // Funzione vuota perché lo studente è fisso
        handlePackageChange={() => {}} // Funzione vuota perché il pacchetto è fisso
        calculatePackageHours={calculatePackageHours}
        currentUser={currentUser}
        selectedProfessor={null}
        updateLessons={updateLessons}
        lessons={studentLessons}
        context="packageDetail" // Specifica il contesto
        fixedPackageId={parseInt(id)} // Passa l'ID del pacchetto fisso
      />
    </Box>
  );
}