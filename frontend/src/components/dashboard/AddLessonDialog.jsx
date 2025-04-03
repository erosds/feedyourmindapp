// src/components/dashboard/AddLessonDialog.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import { lessonService } from '../../services/api';
import { checkLessonOverlap } from '../../utils/lessonOverlapUtils';
import LessonOverlapDialog from '../lessons/LessonOverlapDialog';
import WifiIcon from '@mui/icons-material/Wifi'; // Icona per lezione online

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
  selectedProfessor,
  updateLessons,
  lessons = [],
  context = 'dashboard',
  fixedPackageId = null
}) {
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [availableHours, setAvailableHours] = useState(0);
  const [defaultStart, setDefaultStart] = useState(new Date());
  
  // Stato per gestire il dialog di overlap
  const [overlapDialogOpen, setOverlapDialogOpen] = useState(false);
  const [overlappingLesson, setOverlappingLesson] = useState(null);

  // Resetta il form e gli errori quando si apre il dialog
  useEffect(() => {
    if (open) {
      setLocalError('');
      
      // Inizializza l'orario di default alle 9 del mattino
      const defaultTime = new Date();
      defaultTime.setHours(9, 0, 0, 0);
      setDefaultStart(defaultTime);
      
      // Se c'è un giorno selezionato, aggiorna la data nel form
      if (selectedDay) {
        // Preserva selectedProfessor durante l'aggiornamento di lesson_date
        setLessonForm(prev => ({
          ...prev,
          lesson_date: selectedDay || new Date(),
          professor_id: selectedProfessor || currentUser?.id || '',
          start_time: defaultTime,
          is_online: false, // Default a false per nuove lezioni
        }));
      }

      // Se c'è un ID del pacchetto fisso (per il contesto packageDetail)
      if (fixedPackageId && context === 'packageDetail') {
        setLessonForm(prev => ({
          ...prev,
          is_package: true,
          package_id: fixedPackageId
        }));

        // Calcola ore disponibili
        if (selectedPackage) {
          const { availableHours: availHours } = calculatePackageHours(
            fixedPackageId,
            selectedPackage.total_hours
          );
          setAvailableHours(availHours);
        }
      }
    }
  }, [open, selectedDay, currentUser, selectedProfessor, fixedPackageId, context, selectedPackage]);

  // Aggiorna l'orario di inizio predefinito quando cambia la data
  useEffect(() => {
    if (lessonForm.lesson_date) {
      const defaultTime = new Date(lessonForm.lesson_date);
      defaultTime.setHours(9, 0, 0, 0);
      
      if (!lessonForm.start_time) {
        setLessonForm(prev => ({
          ...prev,
          start_time: defaultTime
        }));
      }
    }
  }, [lessonForm.lesson_date]);

  // Aggiorna le ore disponibili quando cambia il pacchetto selezionato
  useEffect(() => {
    if (lessonForm.is_package && lessonForm.package_id && selectedPackage) {
      const { availableHours: availHours } = calculatePackageHours(
        lessonForm.package_id,
        selectedPackage.total_hours
      );
      setAvailableHours(availHours);
    } else {
      setAvailableHours(0);
    }
  }, [lessonForm.package_id, selectedPackage, lessonForm.is_package]);

  const handleSubmit = async () => {
    try {
      setLocalError('');
      setSubmitting(true);

      // Verifica che il professore e lo studente siano selezionati
      if (!lessonForm.professor_id) {
        setLocalError('Seleziona un professore');
        setSubmitting(false);
        return;
      }

      if (!lessonForm.student_id) {
        setLocalError('Seleziona uno studente');
        setSubmitting(false);
        return;
      }

      // Formatta i dati per l'API
      const formattedValues = {
        ...lessonForm,
        lesson_date: format(lessonForm.lesson_date, 'yyyy-MM-dd'),
        start_time: lessonForm.start_time ? format(lessonForm.start_time, 'HH:mm:ss') : null,
        payment_date: lessonForm.is_paid && lessonForm.payment_date 
          ? format(lessonForm.payment_date, 'yyyy-MM-dd')
          : null
      };

      // Se non è un pacchetto, rimuovi l'ID del pacchetto
      if (!formattedValues.is_package) {
        formattedValues.package_id = null;
      }

      // Verifica sovrapposizioni
      const { hasOverlap, overlappingLesson: overlapLesson } = checkLessonOverlap(
        formattedValues,
        lessons
      );

      if (hasOverlap) {
        setOverlappingLesson(overlapLesson);
        setOverlapDialogOpen(true);
        setSubmitting(false);
        return;
      }

      // Verifica che la durata non superi le ore disponibili nel pacchetto
      if (formattedValues.is_package && 
          formattedValues.package_id && 
          parseFloat(formattedValues.duration) > parseFloat(availableHours)) {
        setLocalError(`La durata (${formattedValues.duration} ore) supera le ore disponibili nel pacchetto (${availableHours} ore)`);
        setSubmitting(false);
        return;
      }

      // Invia la richiesta di creazione
      await lessonService.create(formattedValues);
      
      // Aggiorna la lista delle lezioni
      if (updateLessons) {
        await updateLessons();
      }

      // Chiudi il dialog
      onClose();
      
      // Resetta il form
      setLessonForm({
        professor_id: currentUser?.id || '',
        student_id: '',
        lesson_date: new Date(),
        start_time: defaultStart,
        duration: 1,
        is_package: false,
        package_id: null,
        hourly_rate: '12.5',
        is_paid: false,
        payment_date: new Date(),
        is_online: false, // Default a false
      });

    } catch (err) {
      console.error('Error creating lesson:', err);
      setLocalError(
        err.response?.data?.detail || 
        'Errore durante la creazione della lezione. Riprova più tardi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseOverlapDialog = () => {
    setOverlapDialogOpen(false);
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Aggiungi nuova lezione
          {selectedDay && (
            <Typography variant="subtitle1" color="text.secondary">
              {format(selectedDay, 'd MMMM yyyy')}
            </Typography>
          )}
        </DialogTitle>
        
        <DialogContent>
          {(localError || formError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {localError || formError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Info studente e professore */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="student-select-label">Studente</InputLabel>
                <Select
                  labelId="student-select-label"
                  value={lessonForm.student_id}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  label="Studente"
                  disabled={context === 'packageDetail'}
                >
                  <MenuItem value="">
                    <em>Seleziona uno studente</em>
                  </MenuItem>
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="professor-select-label">Professore</InputLabel>
                <Select
                  labelId="professor-select-label"
                  value={lessonForm.professor_id}
                  onChange={(e) => setLessonForm({
                    ...lessonForm, 
                    professor_id: e.target.value
                  })}
                  label="Professore"
                >
                  <MenuItem value="">
                    <em>Seleziona un professore</em>
                  </MenuItem>
                  {/* Se non hai un array di professori, mostra solo l'utente corrente */}
                  <MenuItem value={currentUser?.id}>
                    {currentUser?.first_name} {currentUser?.last_name}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Data e ora */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="Data lezione"
                value={lessonForm.lesson_date}
                onChange={(date) => setLessonForm({...lessonForm, lesson_date: date})}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TimePicker
                label="Orario di inizio"
                value={lessonForm.start_time}
                onChange={(time) => setLessonForm({...lessonForm, start_time: time})}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Grid>

            {/* Durata */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Durata (in ore)"
                type="number"
                InputProps={{
                  inputProps: { min: 0.5, step: 0.5 },
                  endAdornment: <InputAdornment position="end">ore</InputAdornment>,
                }}
                value={lessonForm.duration}
                onChange={(e) => setLessonForm({
                  ...lessonForm, 
                  duration: parseFloat(e.target.value) || 1
                })}
              />
            </Grid>

            {/* Tariffa oraria */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tariffa oraria"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.5 },
                  startAdornment: <InputAdornment position="start">€</InputAdornment>,
                }}
                value={lessonForm.hourly_rate}
                onChange={(e) => setLessonForm({
                  ...lessonForm, 
                  hourly_rate: parseFloat(e.target.value) || 0
                })}
              />
            </Grid>

            {/* Toggle lezione online */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lessonForm.is_online}
                    onChange={(e) => setLessonForm({
                      ...lessonForm,
                      is_online: e.target.checked
                    })}
                  />
                }
                label={
                  <Box display="flex" alignItems="center">
                    <WifiIcon sx={{ mr: 0.5 }} fontSize="small" />
                    <span>Lezione Online</span>
                  </Box>
                }
              />
            </Grid>

            {/* Pacchetto o lezione singola */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={lessonForm.is_package}
                    onChange={(e) => {
                      const isPackage = e.target.checked;
                      setLessonForm({
                        ...lessonForm,
                        is_package: isPackage,
                        package_id: isPackage ? lessonForm.package_id : null,
                        is_paid: isPackage ? true : lessonForm.is_paid,
                      });
                    }}
                    disabled={context === 'packageDetail'}
                  />
                }
                label="Lezione da pacchetto"
              />
            </Grid>

            {/* Selezione pacchetto se è una lezione da pacchetto */}
            {lessonForm.is_package && (
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="package-select-label">Pacchetto</InputLabel>
                  <Select
                    labelId="package-select-label"
                    value={lessonForm.package_id || ''}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    label="Pacchetto"
                    disabled={context === 'packageDetail'}
                  >
                    <MenuItem value="">
                      <em>Seleziona un pacchetto</em>
                    </MenuItem>
                    {studentPackages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>
                        Pacchetto #{pkg.id} - {pkg.remaining_hours} ore rimanenti
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Mostra ore disponibili se un pacchetto è stato selezionato */}
                {selectedPackage && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Ore disponibili: {availableHours}
                  </Typography>
                )}
              </Grid>
            )}

            {/* Pagamento (per lezioni singole) */}
            {!lessonForm.is_package && (
              <>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
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

                {lessonForm.is_paid && (
                  <Grid item xs={12}>
                    <DatePicker
                      label="Data di pagamento"
                      value={lessonForm.payment_date}
                      onChange={(date) => setLessonForm({...lessonForm, payment_date: date})}
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Annulla
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary"
            variant="contained"
            disabled={submitting || formSubmitting}
          >
            {submitting || formSubmitting ? (
              <CircularProgress size={24} />
            ) : (
              'Salva'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per le sovrapposizioni */}
      <LessonOverlapDialog
        open={overlapDialogOpen}
        onClose={handleCloseOverlapDialog}
        overlappingLesson={overlappingLesson}
      />
    </>
  );
}

export default AddLessonDialog;