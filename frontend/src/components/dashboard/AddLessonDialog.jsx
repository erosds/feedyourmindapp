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
  updateLessons
}) {
  // Stati locali
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [localPackages, setLocalPackages] = useState([]);
  const [localSelectedPackage, setLocalSelectedPackage] = useState(null);

  // Log importante per il debug
  console.log("Dialog rendered, props studentPackages:", studentPackages?.length);
  console.log("Selected student ID:", lessonForm.student_id);
  console.log("isPackage checked:", lessonForm.is_package);
  
  // Inizializza i pacchetti locali all'apertura del dialog o quando cambiano le props
  useEffect(() => {
    if (open) {
      setError('');
      
      const activePackages = Array.isArray(studentPackages) 
        ? studentPackages.filter(pkg => pkg && pkg.status === 'in_progress')
        : [];
      
      console.log("Setting local packages:", activePackages.length);
      setLocalPackages(activePackages);
      
      // Se c'è un pacchetto selezionato nelle props, usalo
      if (selectedPackage) {
        setLocalSelectedPackage(selectedPackage);
      } else {
        setLocalSelectedPackage(null);
      }
    }
  }, [open, studentPackages, selectedPackage]);

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

  // Calcola le ore disponibili per il pacchetto selezionato
  const getAvailableHours = () => {
    if (!localSelectedPackage) return 0;

    // Utilizza il metodo di calcolo per ottenere le ore disponibili
    const { availableHours } = calculatePackageHours(
      localSelectedPackage.id,
      localSelectedPackage.total_hours
    );

    return availableHours;
  };

  // Gestione dei cambiamenti del form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLessonForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Gestione del toggle per lezione da pacchetto
  const handlePackageToggle = async (e) => {
    const isChecked = e.target.checked;
    
    console.log("Toggle pacchetto cliccato, nuovo stato:", isChecked);
    console.log("Student ID at toggle time:", lessonForm.student_id);
    console.log("Local packages:", localPackages.length);
    
    // Se non c'è uno studente selezionato o non ci sono pacchetti, impedisci il cambio
    if (!lessonForm.student_id || localPackages.length === 0) {
      console.log("Toggle non possibile: studente o pacchetti mancanti");
      return;
    }
    
    // Prepara i nuovi valori del form
    const updatedForm = {
      ...lessonForm,
      is_package: isChecked,
      package_id: null // Reset iniziale
    };
    
    // Se attiviamo la modalità pacchetto e ci sono pacchetti disponibili
    if (isChecked && localPackages.length > 0) {
      // Seleziona automaticamente il primo pacchetto disponibile
      updatedForm.package_id = localPackages[0].id;
      console.log("Selezionato automaticamente pacchetto:", localPackages[0].id);
      
      // Le lezioni da pacchetto sono sempre considerate pagate
      updatedForm.is_paid = true;
      
      // Aggiorna anche il pacchetto selezionato localmente
      setLocalSelectedPackage(localPackages[0]);
      
      // Informa il componente padre del cambio pacchetto
      if (handlePackageChange) {
        await handlePackageChange(localPackages[0].id);
      }
    } else {
      // Resetta il pacchetto selezionato
      setLocalSelectedPackage(null);
    }
    
    console.log("Aggiornamento form:", updatedForm);
    setLessonForm(updatedForm);
  };

  // Gestione del cambio studente
  const handleStudentAutocomplete = async (studentId) => {
    if (!studentId) {
      // Reset dei valori se nessuno studente è selezionato
      setLessonForm(prev => ({
        ...prev,
        student_id: '',
        package_id: null,
        is_package: false
      }));
      setLocalPackages([]);
      setLocalSelectedPackage(null);
      return;
    }

    try {
      setIsLoadingPackages(true);
      
      // Aggiorna il form con il nuovo studente selezionato
      setLessonForm(prev => ({
        ...prev,
        student_id: studentId,
        package_id: null,
        is_package: false
      }));
      
      console.log("Studente selezionato:", studentId);
      
      // Carica direttamente i pacchetti dello studente
      const packagesResponse = await packageService.getByStudent(studentId);
      const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
      console.log("Pacchetti caricati direttamente:", activePackages.length);
      
      // Aggiorna lo stato locale
      setLocalPackages(activePackages);
      setLocalSelectedPackage(null);
      
      // Informa il componente padre del cambio studente
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
    
    // Aggiorna il form
    setLessonForm(prev => ({
      ...prev,
      package_id: parsedPackageId
    }));
    
    // Trova il pacchetto selezionato tra quelli locali
    const pkg = localPackages.find(p => p.id === parsedPackageId);
    setLocalSelectedPackage(pkg);
    
    // Informa anche il componente padre
    if (handlePackageChange) {
      await handlePackageChange(parsedPackageId);
    }
  };

  // Validazione del form
  const validateForm = () => {
    // Validazione base
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

    // Controllo ore disponibili nel pacchetto
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

  // Gestione degli errori restituiti dall'API
  const handleApiError = (err) => {
    console.error('Error saving lesson:', err);

    // Gestione specifica dell'errore di overflow delle ore
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

      // Validazione del form
      if (!validateForm()) {
        setSubmitting(false);
        return;
      }

      // Formatta i dati per l'API
      const formattedValues = {
        ...lessonForm,
        lesson_date: formatDateForAPI(lessonForm.lesson_date),
        start_time: formatTimeForAPI(lessonForm.start_time),
        payment_date: lessonForm.is_paid && lessonForm.payment_date 
          ? formatDateForAPI(lessonForm.payment_date)
          : null,
      };

      // Stampa i dati che vengono inviati
      console.log("Invio lezione con dati:", formattedValues);

      // Crea la lezione
      await lessonService.create(formattedValues);

      // Ricarica le lezioni e chiudi il dialog
      await updateLessons();
      onClose();

    } catch (err) {
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Calcoli derivati
  const availableHours = getAvailableHours();
  const isPackageToggleDisabled = submitting || !lessonForm.student_id || localPackages.length === 0;
  const isDurationExceedingAvailable = lessonForm.is_package && localSelectedPackage && 
                                      parseFloat(lessonForm.duration) > availableHours;
  const totalAmount = ((parseFloat(lessonForm.duration) || 0) * (parseFloat(lessonForm.hourly_rate) || 0)).toFixed(2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
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
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  disabled: submitting
                },
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
                textField: {
                  fullWidth: true,
                  required: true,
                  disabled: submitting
                },
                minutesClockNumberProps: {
                  visibleMinutes: (minutes) => minutes % 30 === 0
                }
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
              inputProps={{
                min: 0.5,
                step: 0.5,
              }}
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

          {/* Toggle per pacchetto */}
          <Grid item xs={12}>
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
                <FormHelperText>
                  {localPackages.length} pacchetti disponibili
                </FormHelperText>
              )}
            </Box>
          </Grid>

          {/* Selezione pacchetto (mostrato solo se is_package è true) */}
          {lessonForm.is_package && (
            <Grid item xs={12} md={6}>
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
                {localSelectedPackage && (
                  <FormHelperText>
                    Ore disponibili: {availableHours.toFixed(1)} di {localSelectedPackage.total_hours}
                    {isDurationExceedingAvailable && (
                      <span style={{ color: 'red' }}>
                        {' '}(insufficienti per la lezione)
                      </span>
                    )}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
          )}

          {/* Toggle pagamento (disabilitato per lezioni da pacchetto) */}
          <Grid item xs={12}>
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
                Le lezioni da pacchetto sono automaticamente considerate pagate
              </FormHelperText>
            )}
          </Grid>

          {/* Data pagamento (solo per lezioni singole pagate) */}
          {!lessonForm.is_package && lessonForm.is_paid && (
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data pagamento"
                value={lessonForm.payment_date}
                onChange={(date) => setLessonForm(prev => ({ ...prev, payment_date: date }))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    disabled: submitting
                  },
                }}
              />
            </Grid>
          )}

          {/* Totale calcolato automaticamente */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Totale lezione"
              value={`€ ${totalAmount}`}
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={submitting}
        >
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
  );
}

export default AddLessonDialog;