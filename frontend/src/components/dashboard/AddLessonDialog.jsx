// src/components/dashboard/AddLessonDialog.jsx
import React, { useState } from 'react';
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
import { lessonService } from '../../services/api';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
    setLessonForm({
      ...lessonForm,
      is_package: e.target.checked,
      package_id: e.target.checked ? lessonForm.package_id : null,
    });
  };

  // Salvataggio della lezione
  const handleSubmitLesson = async () => {
    try {
      setSubmitting(true);
      setError('');

      // Formatta la data per l'API
      const formattedValues = {
        ...lessonForm,
        lesson_date: format(lessonForm.lesson_date, 'yyyy-MM-dd'),
        start_time: format(lessonForm.start_time, 'HH:mm:ss'),
        payment_date: lessonForm.is_paid && lessonForm.payment_date 
        ? format(lessonForm.payment_date, 'yyyy-MM-dd')
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
      if (err.response?.status === 409 && err.response?.data?.detail?.message?.includes('exceeds remaining')) {
        setError(`Ore eccedenti: il pacchetto ha solo ${err.response.data.detail.remaining_hours} ore rimanenti. Usa il form completo nella sezione Lezioni per gestire le ore in eccesso.`);
      } else {
        setError('Errore durante il salvataggio della lezione. Verifica i dati e riprova.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Disponibilità ore per il pacchetto selezionato
  const availableHours = getAvailableHours();

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
            <FormControl fullWidth>
              <InputLabel id="student-label">Studente</InputLabel>
              <Select
                labelId="student-label"
                name="student_id"
                value={lessonForm.student_id}
                onChange={(e) => handleStudentChange(e.target.value)}
                label="Studente"
                required
              >
                {students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
                },
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TimePicker
              llabel="Orario inizio"
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
              error={lessonForm.is_package && selectedPackage && parseFloat(lessonForm.duration) > availableHours}
              helperText={lessonForm.is_package && selectedPackage && parseFloat(lessonForm.duration) > availableHours ?
                `Attenzione: la durata supera le ore disponibili (${availableHours})` : ''}
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
              }}
              required
            />
          </Grid>

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
                />
              }
              label="Lezione pagata"
            />
          </Grid>

          {lessonForm.is_package && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="package-label">Pacchetto</InputLabel>
                <Select
                  labelId="package-label"
                  name="package_id"
                  value={lessonForm.package_id || ''}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  label="Pacchetto"
                  disabled={studentPackages.length === 0}
                  error={lessonForm.is_package && studentPackages.length === 0}
                >
                  {studentPackages.length === 0 ? (
                    <MenuItem disabled>
                      Nessun pacchetto attivo per questo studente
                    </MenuItem>
                  ) : (
                    studentPackages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        {`Pacchetto #${pkg.id} - ore rimanenti: ${availableHours.toFixed(1)}`}
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
              value={`€ ${(lessonForm.duration * lessonForm.hourly_rate).toFixed(2) || '0.00'}`}
              InputProps={{
                readOnly: true,
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annulla</Button>
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