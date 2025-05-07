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
  Link,
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

function AddLessonDialog({
  open,
  onClose,
  selectedDay,
  lessonForm,
  setLessonForm,
  students,
  studentPackages,
  selectedPackage,
  formError,
  formSubmitting,
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
      setError('Inserisci una tariffa oraria valida');
      return false;
    }
    if (lessonForm.is_package && !lessonForm.package_id) {
      setError('Seleziona un pacchetto');
      return false;
    }
    if (lessonForm.is_package) {
      // Se c'è un package_id nel form, verificare esplicitamente
      if (lessonForm.package_id) {
        const duration = parseFloat(lessonForm.duration);
        // Calcola direttamente le ore disponibili senza dipendere da localSelectedPackage
        const availableHours = getAvailableHours();
        if (duration > availableHours) {
          setError(`Ore eccedenti: il pacchetto ha solo ${availableHours.toFixed(1)} ore rimanenti mentre stai cercando di utilizzarne ${duration}. Usa il form completo nella sezione Lezioni per gestire le ore in eccesso.`);
          return false;
        }
      } else {
        setError('Seleziona un pacchetto');
        return false;
      }
    }
    return true;
  };

  // Gestione degli errori dell'API
  const handleApiError = (err) => {
    console.error('Error saving lesson:', err);
    if (err.response?.status === 409 && err.response?.data?.detail) {
      const detail = err.response.data.detail;
      if (typeof detail === 'object' && detail.message && detail.message.includes('exceeds remaining')) {
        setError(`Ore eccedenti: il pacchetto ha solo ${detail.remaining_hours} ore rimanenti. Usa il form completo nella sezione Lezioni per gestire le ore in eccesso.`);
      } else if (typeof detail === 'string' && detail.includes('exceeds remaining')) {
        setError('Ore eccedenti nel pacchetto. Usa il form completo nella sezione Lezioni per gestire le ore in eccesso.');
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

      console.log("Invio lezione con dati:", formattedValues);
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
    console.log("Toggle pacchetto cliccato, nuovo stato:", isChecked);
    console.log("Student ID at toggle time:", lessonForm.student_id);
    console.log("Local packages:", localPackages.length);
    if (!lessonForm.student_id || localPackages.length === 0) {
      console.log("Toggle non possibile: studente o pacchetti mancanti");
      return;
    }
    const updatedForm = {
      ...lessonForm,
      is_package: isChecked,
      package_id: null
    };
    if (isChecked && localPackages.length > 0) {
      updatedForm.package_id = localPackages[0].id;
      console.log("Selezionato automaticamente pacchetto:", localPackages[0].id);
      updatedForm.is_paid = true;
      setLocalSelectedPackage(localPackages[0]);
      if (handlePackageChange) {
        await handlePackageChange(localPackages[0].id);
      }
    } else {
      setLocalSelectedPackage(null);
    }
    console.log("Aggiornamento form:", updatedForm);
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
      console.log("Studente selezionato:", studentId);

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

      console.log("Pacchetti terminati recentemente:", recentlyEnded.length);
      console.log("Pacchetti attivi:", activePackages.length);
      console.log("Pacchetti scaduti con ore residue:", expiredWithHoursPackages.length);

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



  // Modifica questo useEffect in AddLessonDialog.jsx
  useEffect(() => {
    if (open) {
      setError('');

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
        const activePackages = Array.isArray(studentPackages)
          ? studentPackages.filter(pkg => pkg && pkg.status === 'in_progress')
          : [];
        setLocalPackages(activePackages);
        if (selectedPackage) {
          setLocalSelectedPackage(selectedPackage);
        } else {
          setLocalSelectedPackage(null);
        }
      }

      // Carica le lezioni dello studente solo se non è già stato fatto
      if (lessonForm.student_id && studentLessons.length === 0) {
        loadStudentLessons(lessonForm.student_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, context, fixedPackageId, selectedPackage, lessonForm.student_id, context, fixedPackageId, students]); // Rimuovi le dipendenze che causano re-render continui

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
                Valuta di estenderl{expiredPackages.length === 1 ? 'o' : 'i'} cliccando sul pacchetto.
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
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Selezione studente - Condizionale in base al contesto */}
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
                <StudentAutocomplete
                  students={students}
                  value={lessonForm.student_id}
                  onChange={handleStudentAutocomplete}
                  disabled={submitting || context === 'packageDetail'}
                  required
                  helperText={!lessonForm.student_id ? "Seleziona uno studente" : ""}
                />
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
                  `Attenzione: la durata supera le ore disponibili (${availableHours.toFixed(1)}).      
                  Creare la lezione dalla sezione Lezioni.` : ''}
              />
            </Grid>
            {/* Tariffa oraria */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="hourly_rate"
                label="Tariffa oraria"
                type="number"
                value={lessonForm.hourly_rate}
                onChange={handleFormChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  inputProps: { min: 0.01, step: 0.5 }
                }}
                required
                disabled={submitting}
                helperText={!lessonForm.hourly_rate ? "Inserisci una tariffa oraria" : ""}
              />
            </Grid>
            {/* Totale calcolato automaticamente */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Totale lezione"
                value={`€ ${totalAmount}`}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            {/* Toggle per lezione online */}
            <Grid item xs={12} md={4}>
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

            {/* Toggle per pacchetto - nascondi nel contesto del pacchetto */}
            {context !== 'packageDetail' && (
              <Grid item xs={12} md={4}>
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
                <Box ml={2} display="inline">
                  {isPackageToggleDisabled && lessonForm.student_id && localPackages.length === 0 && (
                    <FormHelperText error>
                      Lo studente non ha pacchetti attivi.
                    </FormHelperText>
                  )}
                  {lessonForm.student_id && localPackages.length > 0 && (
                    <FormHelperText sx={{
                      color: 'primary.main',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'  // Aumentato da 0.75rem (default) a 0.9rem
                    }}>
                      {localPackages.length} pacchetto disponibile
                    </FormHelperText>
                  )}
                </Box>
              </Grid>
            )}

            {/* Toggle pagamento (disabilitato per lezioni da pacchetto) */}
            <Grid item xs={12} md={4}>
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
                          {`Pacchetto #${pkg.id} - ${pkg.remaining_hours} ore rimanenti`}
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

            {/* Mostare un messaggio informativo nel contesto packageDetail */}
            {context === 'packageDetail' && (
              <Grid item xs={12}>
                <Box sx={{ bgcolor: 'info.light', p: 2, borderRadius: 1, color: 'info.contrastText' }}>
                  <FormHelperText sx={{ color: 'inherit', mb: 0 }}>
                    Stai creando una lezione associata al pacchetto #{fixedPackageId}.
                    La lezione sarà automaticamente configurata come parte del pacchetto.
                  </FormHelperText>
                </Box>
              </Grid>
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