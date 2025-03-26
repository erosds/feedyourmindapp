// src/components/dashboard/AddLessonDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
  TextField
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { lessonService, packageService } from '../../services/api';
import StudentAutocomplete from '../common/StudentAutocomplete';
import LessonOverlapDialog from '../lessons/LessonOverlapDialog';
import { checkLessonOverlap } from '../../utils/lessonOverlapUtils';

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
  lessons = []
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

  // Calcola le ore disponibili per il pacchetto selezionato
  const getAvailableHours = () => {
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
    if (lessonForm.is_package && localSelectedPackage) {
      const duration = parseFloat(lessonForm.duration);
      const availableHours = getAvailableHours();
      if (duration > availableHours) {
        setError(`Ore eccedenti: il pacchetto ha solo ${availableHours.toFixed(1)} ore rimanenti mentre stai cercando di utilizzarne ${duration}. Usa il form completo nella sezione Lezioni per gestire le ore in eccesso.`);
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
      const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
      console.log("Pacchetti caricati direttamente:", activePackages.length);
      setLocalPackages(activePackages);
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
  const isDurationExceedingAvailable = lessonForm.is_package && localSelectedPackage &&
    parseFloat(lessonForm.duration) > availableHours;
  const totalAmount = ((parseFloat(lessonForm.duration) || 0) * (parseFloat(lessonForm.hourly_rate) || 0)).toFixed(2);

  // Inizializzazione dei pacchetti locali all'apertura del dialogo
  useEffect(() => {
    if (open) {
      setError('');
      const activePackages = Array.isArray(studentPackages)
        ? studentPackages.filter(pkg => pkg && pkg.status === 'in_progress')
        : [];
      console.log("Setting local packages:", activePackages.length);
      setLocalPackages(activePackages);
      if (selectedPackage) {
        setLocalSelectedPackage(selectedPackage);
      } else {
        setLocalSelectedPackage(null);
      }

      // If student_id is already set, load their lessons
      if (lessonForm.student_id) {
        loadStudentLessons(lessonForm.student_id);
      }
    }
  }, [open, studentPackages, selectedPackage, lessonForm.student_id]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          Aggiungi Lezione per {selectedDay ? format(selectedDay, "EEEE d MMMM yyyy", { locale: it }) : ""}
        </DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Inserisci i dettagli della lezione
          </DialogContentText>
          {(formError || error) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError || error}
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Selezione studente */}
            <Grid item xs={12} md={6}>
              <StudentAutocomplete
                students={students}
                value={lessonForm.student_id}
                onChange={handleStudentAutocomplete}
                disabled={submitting}
                required
                error={!lessonForm.student_id}
                helperText={!lessonForm.student_id ? "Seleziona uno studente" : ""}
              />
            </Grid>
            {/* Data lezione */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data lezione"
                value={lessonForm.lesson_date}
                onChange={(date) => setLessonForm(prev => ({ ...prev, lesson_date: date }))}
                slotProps={{ textField: { fullWidth: true, required: true, disabled: submitting } }}
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
                  `Attenzione: la durata supera le ore disponibili (${availableHours.toFixed(1)})` : ''}
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
                error={!lessonForm.hourly_rate}
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
            {/* Toggle per pacchetto */}
            <Grid item xs={12} md={6}>
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
                    Lo studente non ha pacchetti attivi
                  </FormHelperText>
                )}
                {lessonForm.student_id && localPackages.length > 0 && (
                  <FormHelperText sx={{ color: 'red' }}>
                    {localPackages.length} pacchetto disponibile
                  </FormHelperText>
                )}
              </Box>
            </Grid>
            {/* Toggle pagamento (disabilitato per lezioni da pacchetto) */}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_paid"
                    checked={lessonForm.is_paid}
                    onChange={(e) => {
                      const isPaid = e.target.checked;
                      setLessonForm(prev => ({
                        ...prev,
                        is_paid: isPaid,
                        payment_date: isPaid ? new Date() : null
                      }));
                    }}
                    disabled={submitting || (lessonForm.is_package && localSelectedPackage)}
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
            {/* Selezione pacchetto (solo se is_package è true) */}
            {lessonForm.is_package && (
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