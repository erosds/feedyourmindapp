// src/components/dashboard/AddLessonDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
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
  studentPackages = [],
  selectedPackage,
  formError,
  formSubmitting,
  handleStudentChange,
  handlePackageChange,
  calculatePackageHours,
  currentUser,
  updateLessons
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingPackages, setIsLoadingPackages] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);

  // Effetto per resettare l'errore quando il dialogo si apre o chiude
  useEffect(() => {
    if (open) {
      setError('');
    }
  }, [open]);

  // Effetto per aggiornare la lista di pacchetti disponibili
  useEffect(() => {
    setAvailablePackages(studentPackages.filter(pkg => pkg && pkg.status === 'in_progress') || []);
  }, [studentPackages]);

  // Calcola le ore disponibili per il pacchetto selezionato
  const getAvailableHours = () => {
    if (!selectedPackage) return 0;

    // Utilizza il metodo di calcolo per ottenere le ore disponibili
    const { availableHours } = calculatePackageHours(
      selectedPackage.id,
      selectedPackage.total_hours
    );

    return availableHours;
  };

  // Gestione dei cambiamenti del form
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setLessonForm({
      ...lessonForm,
      [name]: value,
    });
  };

  // Gestione del toggle is_package
  const handlePackageToggle = (e) => {
    const isChecked = e.target.checked;
    
    // Se non c'è uno studente selezionato o non ci sono pacchetti, impedisci il cambio
    if (!lessonForm.student_id || availablePackages.length === 0) {
      return;
    }
    
    // Nuovi valori del form
    const newFormValues = {
      ...lessonForm,
      is_package: isChecked,
      package_id: null // Reset iniziale
    };
    
    // Se attiviamo la modalità pacchetto e ci sono pacchetti disponibili
    if (isChecked && availablePackages.length > 0) {
      // Seleziona automaticamente il primo pacchetto disponibile
      newFormValues.package_id = availablePackages[0].id;
      
      // Se il pacchetto è già pagato, impostiamo is_paid a true
      newFormValues.is_paid = true;
    }
    
    setLessonForm(newFormValues);
    
    // Se abbiamo selezionato un pacchetto, chiamiamo anche handlePackageChange
    if (isChecked && newFormValues.package_id) {
      handlePackageChange(newFormValues.package_id);
    }
  };

  // Gestione del cambio studente con l'autocompletamento
  const handleStudentAutocomplete = async (studentId) => {
    if (!studentId) {
      setLessonForm({
        ...lessonForm,
        student_id: '',
        package_id: null,
        is_package: false
      });
      setAvailablePackages([]);
      return;
    }

    try {
      setIsLoadingPackages(true);
      setLessonForm({
        ...lessonForm,
        student_id: studentId,
        package_id: null,
        is_package: false
      });
      
      // Carica i pacchetti attivi dello studente
      const packagesResponse = await packageService.getByStudent(studentId);
      const activePackages = packagesResponse.data.filter(pkg => pkg.status === 'in_progress');
      setAvailablePackages(activePackages);
      
      // Se ci sono pacchetti attivi, possiamo eventualmente impostare is_package a true
      if (activePackages && activePackages.length > 0) {
        // Opzionale: auto-seleziona il primo pacchetto
        // setLessonForm(prev => ({
        //   ...prev,
        //   is_package: true,
        //   package_id: activePackages[0].id
        // }));
        // handlePackageChange(activePackages[0].id);
      }
    } catch (err) {
      console.error('Error in student selection:', err);
      setError('Errore nel caricamento dei dati dello studente');
      setAvailablePackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Formattazione della data per l'API
  const formatDateForAPI = (date) => {
    if (!date) return null;
    try {
      return format(date, 'yyyy-MM-dd');
    } catch (err) {
      console.error('Error formatting date:', err);
      return null;
    }
  };

  // Formattazione dell'orario per l'API
  const formatTimeForAPI = (time) => {
    if (!time) return null;
    try {
      return format(time, 'HH:mm:ss');
    } catch (err) {
      console.error('Error formatting time:', err);
      return null;
    }
  };

  // Salvataggio della lezione
  const handleSubmitLesson = async () => {
    try {
      setSubmitting(true);
      setError('');

      // Validazione di base
      if (!lessonForm.student_id) {
        setError('Seleziona uno studente');
        setSubmitting(false);
        return;
      }

      if (!lessonForm.hourly_rate || lessonForm.hourly_rate <= 0) {
        setError('Inserisci una tariffa oraria valida');
        setSubmitting(false);
        return;
      }

      if (lessonForm.is_package && !lessonForm.package_id) {
        setError('Seleziona un pacchetto');
        setSubmitting(false);
        return;
      }

      // Formatta la data per l'API
      const formattedValues = {
        ...lessonForm,
        lesson_date: formatDateForAPI(lessonForm.lesson_date),
        start_time: formatTimeForAPI(lessonForm.start_time),
        payment_date: lessonForm.is_paid && lessonForm.payment_date 
          ? formatDateForAPI(lessonForm.payment_date)
          : null,
      };

      // Se utilizza un pacchetto, verifica che ci siano ore sufficienti
      if (lessonForm.is_package && selectedPackage) {
        const duration = parseFloat(lessonForm.duration);
        const availableHours = getAvailableHours();

        if (duration > availableHours) {
          setError(`Ore eccedenti: il pacchetto ha solo ${availableHours.toFixed(1)} ore rimanenti mentre stai cercando di utilizzarne ${duration}. Usa il form completo nella sezione Lezioni per gestire le ore in eccesso.`);
          setSubmitting(false);
          return;
        }
      }

      // Crea la lezione
      await lessonService.create(formattedValues);

      // Ricarica le lezioni
      await updateLessons();

      // Chiudi il dialog
      onClose();

    } catch (err) {
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
    } finally {
      setSubmitting(false);
    }
  };

  // Disponibilità ore per il pacchetto selezionato
  const availableHours = getAvailableHours();

  // Verifica se il toggle pacchetto deve essere disabilitato
  const isPackageToggleDisabled = submitting || !lessonForm.student_id || availablePackages.length === 0;

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

          <Grid item xs={12} md={6}>
            <DatePicker
              label="Data lezione"
              value={lessonForm.lesson_date}
              onChange={(date) => setLessonForm({ ...lessonForm, lesson_date: date })}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  disabled: submitting
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TimePicker
              label="Orario inizio"
              value={lessonForm.start_time}
              onChange={(time) => setLessonForm({ ...lessonForm, start_time: time })}
              ampm={false}
              minutesStep={30}
              views={['hours', 'minutes']}
              skipDisabled={true}  // Salta i minuti disabilitati nella navigazione
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  disabled: submitting
                },
                minutesClockNumberProps: { 
                  // Filtra i numeri dei minuti per mostrare solo 0 e 30
                  visibleMinutes: (minutes) => minutes % 30 === 0 
                }
              }}
            />
          </Grid>

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
              error={lessonForm.is_package && selectedPackage && parseFloat(lessonForm.duration) > availableHours}
              helperText={lessonForm.is_package && selectedPackage && parseFloat(lessonForm.duration) > availableHours ?
                `Attenzione: la durata supera le ore disponibili (${availableHours.toFixed(1)})` : ''}
            />
          </Grid>

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
            {lessonForm.student_id && availablePackages.length === 0 && (
              <FormHelperText error>
                Lo studente non ha pacchetti attivi
              </FormHelperText>
            )}
          </Grid>

          {lessonForm.is_package && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={isLoadingPackages || submitting}>
                <InputLabel id="package-label">Pacchetto</InputLabel>
                <Select
                  labelId="package-label"
                  name="package_id"
                  value={lessonForm.package_id || ''}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  label="Pacchetto"
                  disabled={availablePackages.length === 0 || isLoadingPackages || submitting}
                  error={lessonForm.is_package && availablePackages.length === 0}
                >
                  {isLoadingPackages ? (
                    <MenuItem disabled>
                      Caricamento pacchetti...
                    </MenuItem>
                  ) : availablePackages.length === 0 ? (
                    <MenuItem disabled>
                      Nessun pacchetto attivo per questo studente
                    </MenuItem>
                  ) : (
                    availablePackages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        {`Pacchetto #${pkg.id} - ${pkg.remaining_hours} ore rimanenti`}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {selectedPackage && (
                  <FormHelperText>
                    Ore disponibili: {availableHours.toFixed(1)} di {selectedPackage.total_hours}
                    {parseFloat(lessonForm.duration) > availableHours && (
                      <span style={{ color: 'red' }}>
                        {' '}(insufficienti per la lezione)
                      </span>
                    )}
                  </FormHelperText>
                )}
              </FormControl>
            </Grid>
          )}

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  name="is_paid"
                  checked={lessonForm.is_paid}
                  onChange={(e) => {
                    const isPaid = e.target.checked;
                    setLessonForm({
                      ...lessonForm,
                      is_paid: isPaid,
                      payment_date: isPaid ? new Date() : null
                    });
                  }}
                  disabled={submitting || (lessonForm.is_package && selectedPackage)}
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

          {/* Stato del pagamento (solo per lezioni singole) */}
          {!lessonForm.is_package && lessonForm.is_paid && (
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data pagamento"
                value={lessonForm.payment_date}
                onChange={(date) => setLessonForm({ ...lessonForm, payment_date: date })}
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
              value={`€ ${((parseFloat(lessonForm.duration) || 0) * (parseFloat(lessonForm.hourly_rate) || 0)).toFixed(2)}`}
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
            (lessonForm.is_package && selectedPackage && parseFloat(lessonForm.duration) > availableHours)
          }
        >
          {submitting ? <CircularProgress size={24} /> : "Salva"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddLessonDialog;