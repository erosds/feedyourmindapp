// src/components/dashboard/AddLessonDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Box,
  CircularProgress,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,

  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { it } from 'date-fns/locale';
import { lessonService, packageService } from '../../services/api';
import StudentAutocomplete from '../common/StudentAutocomplete';
import PackageStudentSelector from '../common/PackageStudentSelector'; // Import the new component
import LessonOverlapDialog from '../lessons/LessonOverlapDialog';
import { checkLessonOverlap } from '../../utils/lessonOverlapUtils';
// Aggiungi in cima all'import
import { Link as RouterLink } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

function AddLessonDialog({
  open,
  onClose,
  selectedDay,
  lessonForm,
  setLessonForm,
  students,
  studentPackages,
  selectedPackage,
  handleStudentChange,
  handlePackageChange,
  calculatePackageHours,
  currentUser,
  selectedProfessor,
  updateLessons,
  lessons = [],
  // Nuova prop per definire il contesto e bloccare campi specifici
  context = 'dashboard', // Valori possibili: 'dashboard', 'packageDetail'
  // Prop opzionale per forzare un pacchetto specifico
  fixedPackageId = null
}) {
  // Stati locali
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [localPackages, setLocalPackages] = useState([]);
  const [localSelectedPackage, setLocalSelectedPackage] = useState(null);
  const [overlapWarningOpen, setOverlapWarningOpen] = useState(false);
  const [overlappingLesson, setOverlappingLesson] = useState(null);
  const [studentLessons, setStudentLessons] = useState([]);
  const [packageStudents, setPackageStudents] = useState([]);
  const [expiredPackages, setExpiredPackages] = useState([]);
  const [recentlyEndedPackages, setRecentlyEndedPackages] = useState([]);
  const [showRateFields, setShowRateFields] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Funzioni helper per formattare date e orari
  const formatDateForAPI = (date) => {
    if (!date) return null;
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (err) {
      console.error('Error formatting date:', err);
      return null;
    }
  };

  const formatTimeForAPI = (time) => {
    if (!time) return null;
    try {
      return format(time, 'HH:mm:ss');
    } catch (err) {
      console.error('Error formatting time:', err);
      return null;
    }
  };

  // Carica le lezioni dello studente quando lo studente cambia
  const loadStudentLessons = async (studentId) => {
    if (!studentId) {
      setStudentLessons([]);
      return;
    }

    try {
      const response = await lessonService.getByStudent(studentId);
      setStudentLessons(response.data || []);
    } catch (err) {
      console.error('Error loading student lessons:', err);
      setError('Impossibile caricare le lezioni dello studente. Prova a riaggiornare la pagina.');
    }
  };

  useEffect(() => {
    if (lessonForm.package_id && studentPackages && studentPackages.length > 0) {
      const pkg = studentPackages.find(p => p.id === parseInt(lessonForm.package_id));
      if (pkg) {
        setLocalSelectedPackage(pkg);
      }
    }
  }, [lessonForm.package_id, studentPackages]);

  // Calcola le ore disponibili per il pacchetto selezionato
  const getAvailableHours = () => {
    // Se abbiamo un pacchetto nel form ma non abbiamo localSelectedPackage,
    // cerca il pacchetto negli studentPackages
    if (lessonForm.is_package && lessonForm.package_id && (!localSelectedPackage || localSelectedPackage.id !== lessonForm.package_id)) {
      const pkg = studentPackages.find(p => p.id === parseInt(lessonForm.package_id));
      if (pkg) {
        const { availableHours } = calculatePackageHours(
          pkg.id,
          pkg.total_hours
        );
        return availableHours;
      }
      return 0;
    }

    // Comportamento normale
    if (!localSelectedPackage) return 0;
    const { availableHours } = calculatePackageHours(
      localSelectedPackage.id,
      localSelectedPackage.total_hours
    );
    return availableHours;
  };

  // Validazione del form
  const validateForm = () => {
    if (!lessonForm.student_id) {
      setError('Seleziona uno studente');
      return false;
    }
    if (!lessonForm.hourly_rate || lessonForm.hourly_rate <= 0) {
      setError('Inserisci un compenso orari valido');
      return false;
    }
    if (lessonForm.is_package && !lessonForm.package_id) {
      setError('Seleziona un pacchetto');
      return false;
    }

    // Aggiungi questa verifica per la data di scadenza del pacchetto
    if (lessonForm.is_package && lessonForm.package_id) {
      const selectedPkg = localPackages.find(pkg => pkg.id === parseInt(lessonForm.package_id)) ||
        studentPackages.find(pkg => pkg.id === parseInt(lessonForm.package_id));

      if (selectedPkg && lessonForm.lesson_date) {
        const expiryDate = parseISO(selectedPkg.expiry_date);
        if (lessonForm.lesson_date > expiryDate) {
          setError(`Non è possibile inserire lezioni dopo la data di scadenza del pacchetto (${format(expiryDate, 'd MMMM yyyy', { locale: it })}).`);
          return false;
        }
      }

      // Continua con il controllo delle ore disponibili
      const duration = parseFloat(lessonForm.duration);
      const availableHours = getAvailableHours();
      if (duration > availableHours) {
        setError(`Ore eccedenti: il pacchetto ha solo ${availableHours.toFixed(1)} ore rimanenti mentre stai cercando di utilizzarne ${duration}.`);
        return false;
      }
    }

    return true;
  };

  // Alla funzione handleApiError, aggiungi questa condizione
  const handleApiError = (err) => {
    console.error('Error saving lesson:', err);
    if (err.response?.status === 409 && err.response?.data?.detail) {
      const detail = err.response.data.detail;
      if (typeof detail === 'object' && detail.message && detail.message.includes('exceeds remaining')) {
        setError(`La lezione ha una durata maggiore delle ${detail.remaining_hours} ore rimanenti sul pacchetto. Valuta se aprire un nuovo pacchetto.`);
      } else if (typeof detail === 'string' && detail.includes('exceeds remaining')) {
        setError(`La lezione ha una durata maggiore delle ore rimanenti sul pacchetto. Valuta se aprire un nuovo pacchetto.`);
      } else if (typeof detail === 'string' && detail.includes('data della lezione non può essere successiva alla scadenza')) {
        // Aggiungi questo caso specifico
        setError('Non è possibile inserire lezioni dopo la data di scadenza del pacchetto.');
      } else {
        setError(typeof detail === 'string' ? detail : 'Errore durante il salvataggio della lezione.');
      }
    } else {
      setError('Errore durante il salvataggio della lezione. Verifica i dati e riprova.');
    }
  };

  // Salvataggio della lezione
  const handleSubmitLesson = async () => {
    try {
      setSubmitting(true);
      setError('');

      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      const formattedValues = {
        ...lessonForm,
        professor_id: selectedProfessor || lessonForm.professor_id,
        lesson_date: formatDateForAPI(lessonForm.lesson_date),
        start_time: formatTimeForAPI(lessonForm.start_time),
        payment_date: lessonForm.is_paid && lessonForm.payment_date
          ? formatDateForAPI(lessonForm.payment_date)
          : null,
        price: lessonForm.is_package ? 0 : (lessonForm.price || 20 * lessonForm.duration), // Set price to 0 for package lessons
        is_online: lessonForm.is_online || false  // Use the actual value from the form
      };

      // Controllo sovrapposizioni usando la funzione utility
      // Combiniamo le lezioni locali e quelle caricate per lo studente
      const allLessons = [...lessons, ...studentLessons];
      const { hasOverlap, overlappingLesson } = checkLessonOverlap(lessonForm, allLessons);

      if (hasOverlap) {
        setOverlappingLesson(overlappingLesson);
        setOverlapWarningOpen(true);
        setSubmitting(false);
        return;
      }

      await lessonService.create(formattedValues);
      await updateLessons();
      onClose();
    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Gestione dei cambiamenti del form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLessonForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Toggle per lezione da pacchetto
  const handlePackageToggle = async (e) => {
    const isChecked = e.target.checked;
    const updatedForm = {
      ...lessonForm,
      is_package: isChecked,
      package_id: null
    };
    if (isChecked && localPackages.length > 0) {
      updatedForm.package_id = localPackages[0].id;
      updatedForm.is_paid = true;
      setLocalSelectedPackage(localPackages[0]);
      if (handlePackageChange) {
        await handlePackageChange(localPackages[0].id);
      }
    } else {
      setLocalSelectedPackage(null);
    }
    setLessonForm(updatedForm);
  };

  // Gestione del cambio studente
  const handleStudentAutocomplete = async (studentId) => {
    if (!studentId) {
      setLessonForm(prev => ({
        ...prev,
        student_id: '',
        package_id: null,
        is_package: false
      }));
      setLocalPackages([]);
      setLocalSelectedPackage(null);
      setStudentLessons([]);
      setExpiredPackages([]); // Reset pacchetti scaduti
      setRecentlyEndedPackages([]); // Reset pacchetti terminati
      return;
    }
    try {
      setIsLoadingPackages(true);
      setLessonForm(prev => ({
        ...prev,
        student_id: studentId,
        package_id: null,
        is_package: false
      }));

      // Load packages
      const packagesResponse = await packageService.getByStudent(studentId);
      // Separa i pacchetti attivi da quelli scaduti con ore residue
      const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
      const expiredWithHoursPackages = packagesResponse.data.filter(pkg =>
        pkg.status === 'expired' && parseFloat(pkg.remaining_hours) > 0
      );

      // Trova pacchetti terminati recentemente (ultimi 14 giorni)
      const today = new Date();
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(today.getDate() - 14);

      const recentlyEnded = packagesResponse.data.filter(pkg => {
        // Pacchetti scaduti con 0 ore o pacchetti completati
        const isEndedPackage = (pkg.status === 'expired' && parseFloat(pkg.remaining_hours) <= 0) ||
          (pkg.status === 'completed');

        // Verifica se è terminato negli ultimi 14 giorni
        const expiryDate = parseISO(pkg.expiry_date);
        const isRecent = expiryDate >= twoWeeksAgo && expiryDate <= today;

        return isEndedPackage && isRecent;
      });

      setLocalPackages(activePackages);
      setExpiredPackages(expiredWithHoursPackages);
      setRecentlyEndedPackages(recentlyEnded);
      setLocalSelectedPackage(null);

      // Load all lessons for this student regardless of professor
      await loadStudentLessons(studentId);

      if (handleStudentChange) {
        await handleStudentChange(studentId);
      }
    } catch (err) {
      console.error('Error in student selection:', err);
      setError('Errore nel caricamento dei dati dello studente');
      setLocalPackages([]);
      setLocalSelectedPackage(null);
      setExpiredPackages([]);
      setRecentlyEndedPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Gestione del cambio pacchetto
  const handleLocalPackageChange = async (packageId) => {
    if (!packageId) {
      setLessonForm(prev => ({
        ...prev,
        package_id: null
      }));
      setLocalSelectedPackage(null);
      return;
    }
    const parsedPackageId = parseInt(packageId);
    setLessonForm(prev => ({
      ...prev,
      package_id: parsedPackageId
    }));
    const pkg = localPackages.find(p => p.id === parsedPackageId);
    setLocalSelectedPackage(pkg);
    if (handlePackageChange) {
      await handlePackageChange(parsedPackageId);
    }
  };

  // Calcoli derivati
  const availableHours = getAvailableHours();
  const isPackageToggleDisabled = submitting || !lessonForm.student_id || localPackages.length === 0;
  const isDurationExceedingAvailable = lessonForm.is_package && lessonForm.package_id &&
    parseFloat(lessonForm.duration) > availableHours;
  const totalAmount = ((parseFloat(lessonForm.duration) || 0) * (parseFloat(lessonForm.hourly_rate) || 0)).toFixed(2);



  // Modifica all'useEffect per resettare correttamente gli stati quando il dialogo si apre

  useEffect(() => {
    if (open) {
      // Reset stati quando si apre il dialogo
      setError('');
      setLocalPackages([]);
      setExpiredPackages([]);
      setRecentlyEndedPackages([]);
      setLocalSelectedPackage(null);
      setStudentLessons([]);

      // Se stiamo usando il dialogo dal dettaglio pacchetto, imposta alcuni valori di default
      if (context === 'packageDetail' && fixedPackageId) {
        // Forza sempre l'utilizzo del pacchetto corrente
        setLessonForm(prev => ({
          ...prev,
          is_package: true,
          package_id: fixedPackageId
        }));

        // Trova il pacchetto corrente nella lista
        const currentPackage = studentPackages.find(pkg => pkg.id === fixedPackageId);
        if (currentPackage) {
          setLocalSelectedPackage(currentPackage);

          // Estrai gli studenti dal pacchetto corrente - esegui solo una volta
          if (packageStudents.length === 0 && students && Array.isArray(students)) {
            // Filtriamo gli studenti che sono associati a questo pacchetto
            const pkgStudents = students.filter(student =>
              currentPackage.student_ids &&
              currentPackage.student_ids.includes(student.id)
            );
            setPackageStudents(pkgStudents);
          }
        }
      } else {
        // Per il contesto normale, carica i pacchetti solo se lo studente è già selezionato
        if (lessonForm.student_id) {
          // Carica i pacchetti attivi dello studente
          const fetchPackages = async () => {
            try {
              setIsLoadingPackages(true);
              const packagesResponse = await packageService.getByStudent(lessonForm.student_id);

              // Separa i pacchetti in categorie
              const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
              const expiredWithHoursPackages = packagesResponse.data.filter(pkg =>
                pkg.status === 'expired' && parseFloat(pkg.remaining_hours) > 0
              );

              // Trova pacchetti terminati recentemente
              const today = new Date();
              const twoWeeksAgo = new Date(today);
              twoWeeksAgo.setDate(today.getDate() - 14);

              const recentlyEnded = packagesResponse.data.filter(pkg => {
                const isEndedPackage = (pkg.status === 'expired' && parseFloat(pkg.remaining_hours) <= 0) ||
                  (pkg.status === 'completed');
                const expiryDate = parseISO(pkg.expiry_date);
                const isRecent = expiryDate >= twoWeeksAgo && expiryDate <= today;
                return isEndedPackage && isRecent;
              });

              setLocalPackages(activePackages);
              setExpiredPackages(expiredWithHoursPackages);
              setRecentlyEndedPackages(recentlyEnded);

              if (selectedPackage) {
                setLocalSelectedPackage(selectedPackage);
              }

              // Carica le lezioni dello studente
              await loadStudentLessons(lessonForm.student_id);
            } catch (err) {
              console.error('Error loading student packages:', err);
              setError('Errore nel caricamento dei pacchetti dello studente');
            } finally {
              setIsLoadingPackages(false);
            }
          };

          fetchPackages();
        }
      }
    }
  }, [open, context, fixedPackageId, lessonForm.student_id, students, selectedPackage, studentPackages]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Aggiungi Lezione per {selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: it }) : ""}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {/* Alert per pacchetti terminati recentemente */}
          {recentlyEndedPackages.length > 0 && localPackages.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {recentlyEndedPackages.length === 1
                  ? "È stato rilevato un pacchetto terminato recentemente."
                  : `Sono stati rilevati ${recentlyEndedPackages.length} pacchetti terminati recentemente.`}
                {" "}
                Se lo studente intende proseguire con un nuovo pacchetto, crealo prima gi aggiungere la lezione.
              </Typography>

              {recentlyEndedPackages.map((pkg, idx) => (
                <Box component="div" key={pkg.id} sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
                  <Chip
                    component={RouterLink}
                    to={`/packages/${pkg.id}`}
                    label={`Pacchetto #${pkg.id}`}
                    color="default"
                    variant="outlined"
                    clickable
                    sx={{
                      mr: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                      }
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {`${pkg.status === 'completed' ? 'Completato' : 'Scaduto (senza ore residue)'} il ${format(parseISO(pkg.expiry_date), 'dd/MM/yyyy')}`}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ mt: 0, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  component={RouterLink}
                  to={`/packages/new?student=${encodeURIComponent(students[lessonForm.student_id] || '')}`}
                  variant="contained"
                  color="primary"
                  size="small"
                  sx={{ fontSize: '0.8rem' }}
                >
                  Crea nuovo pacchetto
                </Button>
              </Box>
            </Alert>
          )}
          {/* Alert modificato con chip cliccabile e informazioni separate */}
          {expiredPackages.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Attenzione: lo studente ha {expiredPackages.length} pacchett{expiredPackages.length === 1 ? 'o' : 'i'} scadut{expiredPackages.length === 1 ? 'o' : 'i'} con ore residue.
                Prima di usare nuovi pacchetti, valuta di estendere quell{expiredPackages.length === 1 ? 'o' : 'i'} scadut{expiredPackages.length === 1 ? 'o' : 'i'} cliccando qui sotto.
              </Typography>
              {expiredPackages.map((pkg, idx) => (
                <Box component="div" key={pkg.id} sx={{ mt: 1.5, display: 'flex', alignItems: 'center' }}>
                  <Chip
                    component={RouterLink}
                    to={`/packages/${pkg.id}`}
                    label={`Pacchetto #${pkg.id}`}
                    color="primary"
                    variant="outlined"
                    clickable
                    sx={{
                      mr: 1.5,
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                      }
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {`iniziato il ${format(parseISO(pkg.start_date), 'dd/MM/yyyy')} e scaduto il ${format(parseISO(pkg.expiry_date), 'dd/MM/yyyy')} - ${parseFloat(pkg.remaining_hours).toFixed(1)} ore rimanenti.`}
                  </Typography>
                </Box>
              ))}
            </Alert>
          )}
          {/* Messaggio specifico per il contesto "packageDetail" */}
          {context === 'packageDetail' && fixedPackageId ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ display: 'inline' }}>
                  Stai aggiungendo una nuova lezione direttamente al
                </Typography>
                <Chip
                  component={RouterLink}
                  to={`/packages/${fixedPackageId}`}
                  label={`Pacchetto #${fixedPackageId}`}
                  color="primary"
                  variant="outlined"
                  clickable
                  size="small"
                  sx={{
                    mx: 0.5,
                    my: 0.25,
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
                    }
                  }}
                />
                <Typography variant="body2" sx={{ display: 'inline' }}>
                  La lezione verrà automaticamente registrata come parte di questo pacchetto.
                </Typography>
              </Box>
            </Alert>
          ) : (
            /* Avviso per più pacchetti disponibili - solo nel contesto normale */
            lessonForm.student_id && localPackages.length > 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {localPackages.length > 1 ? (
                    <>
                      Sono stati trovati {localPackages.length} pacchetti attivi per questo studente.
                      Assicurati di spuntare l'opzione sotto che indica che la lezione fa parte di un pacchetto.
                      Solitamente andrebbero esaurite prima le ore del pacchetto più vecchio.
                    </>
                  ) : (
                    <>
                      È stato trovato un pacchetto attivo per questo studente.
                      Assicurati di spuntare l'opzione sotto che indica che la lezione fa parte di un pacchetto.
                    </>
                  )}
                </Typography>
              </Alert>
            )
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Selezione studente */}
            <Grid item xs={12} md={6}>
              {context === 'packageDetail' ? (
                <PackageStudentSelector
                  packageStudents={packageStudents}
                  value={lessonForm.student_id}
                  onChange={handleStudentAutocomplete}
                  disabled={submitting}
                  required
                  error={!lessonForm.student_id}
                />
              ) : (
                <>
                  <StudentAutocomplete
                    students={students}
                    value={lessonForm.student_id}
                    onChange={handleStudentAutocomplete}
                    disabled={submitting || context === 'packageDetail'}
                    required
                    helperText={!lessonForm.student_id ? "Seleziona uno studente" : ""}
                  />
                </>
              )}
            </Grid>

            {/* Data lezione */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data lezione"
                value={lessonForm.lesson_date}
                onChange={(date) => setLessonForm(prev => ({ ...prev, lesson_date: date }))}
                disabled={context === 'packageDetail'}
                readOnly={context === 'packageDetail'}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    disabled: submitting || context === 'packageDetail',
                    helperText: context === 'packageDetail' ? "Data fissata dal calendario" : ""
                  }
                }}
              />
            </Grid>
            {/* Orario inizio */}
            <Grid item xs={12} md={6}>
              <TimePicker
                label="Orario inizio"
                value={lessonForm.start_time}
                onChange={(time) => setLessonForm(prev => ({ ...prev, start_time: time }))}
                ampm={false}
                minutesStep={30}
                views={['hours', 'minutes']}
                skipDisabled={true}
                slotProps={{
                  textField: { fullWidth: true, required: true, disabled: submitting },
                  minutesClockNumberProps: { visibleMinutes: (minutes) => minutes % 30 === 0 }
                }}
              />
            </Grid>
            {/* Durata lezione */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="duration"
                label="Durata (ore)"
                type="number"
                value={lessonForm.duration}
                onChange={handleFormChange}
                inputProps={{ min: 0.5, step: 0.5 }}
                required
                disabled={submitting}
                error={isDurationExceedingAvailable}
                helperText={isDurationExceedingAvailable ?
                  `Attenzione: la durata supera le ore disponibili (${availableHours.toFixed(1)}).` : ''}
              />
            </Grid>

            {/* Toggle per pacchetto - nascondi nel contesto del pacchetto */}
            {context !== 'packageDetail' && (
              <Grid item xs={12} md={4.5}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_package"
                      checked={lessonForm.is_package}
                      onChange={handlePackageToggle}
                      disabled={isPackageToggleDisabled}
                    />
                  }
                  label="Parte di un pacchetto"
                />
                {lessonForm.student_id && localPackages.length > 0 && (
                  <FormHelperText sx={{
                    color: 'primary.main',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    ml: 1
                  }}>
                    {localPackages.length} pacchett{localPackages.length !== 1 ? 'i' : 'o'} disponibil{localPackages.length !== 1 ? 'i' : 'e'}
                  </FormHelperText>
                )}
                <Box ml={2} display="inline">
                  {isPackageToggleDisabled && lessonForm.student_id && localPackages.length === 0 && (
                    <FormHelperText error>
                      Lo studente non ha pacchetti attivi.
                    </FormHelperText>
                  )}
                </Box>
              </Grid>
            )}

            {/* Toggle pagamento (disabilitato per lezioni da pacchetto) */}
            <Grid item xs={12} md={4.5}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_paid"
                    checked={lessonForm.is_package ? true : lessonForm.is_paid}
                    onChange={(e) => {
                      const isPaid = e.target.checked;
                      setLessonForm(prev => ({
                        ...prev,
                        is_paid: isPaid,
                        payment_date: isPaid ? prev.lesson_date : null,
                        price: isPaid ? (prev.price || 20 * lessonForm.duration) : 0
                      }));
                    }}
                    disabled={submitting || lessonForm.is_package}
                  />
                }
                label="Lezione pagata"
              />
              {lessonForm.is_package && (
                <FormHelperText>
                  La lezione viene saldata con il pacchetto stesso.
                </FormHelperText>
              )}
            </Grid>

            {/* Toggle per lezione online */}
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_online"
                    checked={lessonForm.is_online || false}
                    onChange={(e) => {
                      setLessonForm(prev => ({
                        ...prev,
                        is_online: e.target.checked
                      }));
                    }}
                  />
                }
                label="Lezione online"
              />
            </Grid>

            {/* Selezione pacchetto - nascondi nel contesto del pacchetto */}
            {lessonForm.is_package && context !== 'packageDetail' && (
              <Grid item xs={12}>
                <FormControl fullWidth disabled={isLoadingPackages || submitting}>
                  <InputLabel id="package-label">Pacchetto</InputLabel>
                  <Select
                    labelId="package-label"
                    name="package_id"
                    value={lessonForm.package_id || ''}
                    onChange={(e) => handleLocalPackageChange(e.target.value)}
                    label="Pacchetto"
                    disabled={localPackages.length === 0 || isLoadingPackages || submitting}
                    error={lessonForm.is_package && localPackages.length === 0}
                  >
                    {isLoadingPackages ? (
                      <MenuItem disabled>
                        Caricamento pacchetti...
                      </MenuItem>
                    ) : localPackages.length === 0 ? (
                      <MenuItem disabled>
                        Nessun pacchetto attivo per questo studente
                      </MenuItem>
                    ) : (
                      localPackages.map((pkg) => (
                        <MenuItem key={pkg.id} value={pkg.id}>
                          {`Pacchetto #${pkg.id} (scad. ${format(parseISO(pkg.expiry_date), 'd MMMM yyyy', { locale: it })}) - ${pkg.remaining_hours} ore rimanenti`}
                        </MenuItem>
                      ))
                    )}
                  </Select>

                </FormControl>
              </Grid>
            )}
            {/* Data pagamento (solo per lezioni singole pagate) */}
            {!lessonForm.is_package && lessonForm.is_paid && (
              <Grid item xs={12}>
                <DatePicker
                  label="Data pagamento"
                  value={lessonForm.payment_date}
                  onChange={(date) => setLessonForm(prev => ({ ...prev, payment_date: date }))}
                  slotProps={{ textField: { fullWidth: true, required: true, disabled: submitting } }}
                />
              </Grid>
            )}
            {/* Prezzo campo per gli admin */}
            {!lessonForm.is_package && lessonForm.is_paid && currentUser?.is_admin && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Prezzo studente"
                  type="number"
                  value={lessonForm.price || 20 * lessonForm.duration}
                  onChange={(e) => setLessonForm(prev => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 20 * lessonForm.duration
                  }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    inputProps: { min: 0, step: 0.5 }
                  }}
                  disabled={submitting}
                />
                <FormHelperText>
                  Prezzo pagato dallo studente all'associazione
                </FormHelperText>
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                type="button"
                variant="text"
                color="primary"
                size="small"
                onClick={() => setShowRateFields(!showRateFields)}
                startIcon={showRateFields ? <VisibilityOffIcon /> : <VisibilityIcon />}
              >
                {showRateFields ? "Nascondi compenso" : "Mostra compenso"}
              </Button>
            </Grid>

            {showRateFields && (
              <React.Fragment>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Compenso orario (€)"
                    type="number"
                    inputProps={{ step: "0.5", min: "0" }}
                    value={lessonForm.hourly_rate}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setLessonForm({
                        ...lessonForm,
                        hourly_rate: value,
                        total_payment: value * lessonForm.duration
                      });
                    }}
                    disabled={formSubmitting}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Totale lezione (€)"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                      readOnly: true,
                    }}
                    value={(lessonForm.hourly_rate * lessonForm.duration).toFixed(2)}
                    disabled={true}
                  />
                </Grid>
              </React.Fragment>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmitLesson}
            color="primary"
            variant="contained"
            disabled={
              submitting ||
              !lessonForm.student_id ||
              !lessonForm.hourly_rate ||
              (lessonForm.is_package && !lessonForm.package_id) ||
              isDurationExceedingAvailable
            }
          >
            {submitting ? <CircularProgress size={24} /> : "Salva"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogo di avviso per sovrapposizioni */}
      <LessonOverlapDialog
        open={overlapWarningOpen}
        onClose={() => setOverlapWarningOpen(false)}
        overlappingLesson={overlappingLesson}
      />
    </>
  );
}

export default AddLessonDialog;