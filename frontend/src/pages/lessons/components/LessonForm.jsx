// src/pages/lessons/components/LessonForm.jsx
import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
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
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import EntityAutocomplete from '../../../components/common/EntityAutocomplete';
import PackageStudentSelector from '../../../components/common/PackageStudentSelector';
import { studentService, professorService } from '../../../services/api';

// Schema di validazione
const LessonSchema = Yup.object().shape({
  professor_id: Yup.number().required('Professore obbligatorio'),
  student_id: Yup.number().required('Studente obbligatorio'),
  lesson_date: Yup.date().required('Data obbligatoria'),
  start_time: Yup.date().required('Orario di inizio obbligatorio'),
  duration: Yup.number().positive('La durata deve essere positiva').required('Durata obbligatoria'),
  is_package: Yup.boolean(),
  package_id: Yup.number().nullable().when('is_package', {
    is: true,
    then: () => Yup.number().required('Hai scelto parte di un pacchetto, ora seleziona il pacchetto'),
    otherwise: () => Yup.number().nullable(),
  }),
  hourly_rate: Yup.number().positive('La tariffa oraria deve essere positiva').required('Tariffa oraria obbligatoria'),
  is_paid: Yup.boolean(),
  payment_date: Yup.date().nullable().when('is_paid', {
    is: true,
    then: () => Yup.date().required('Data di pagamento obbligatoria'),
    otherwise: () => Yup.date().nullable(),
  }),
});

function LessonForm({
  initialValues,
  professors,
  students,
  packages,
  isEditMode,
  isAdmin,
  onSubmit,
  onCancel,
  onStudentChange,
  onPackageChange,
  calculatePackageHours,
  originalLesson,
  // New props for package context
  context = 'default', // 'default' or 'packageDetail'
  fixedPackageId = null,
  packageStudents = [] // Students associated with the current package when coming from package detail
}) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={LessonSchema}
      onSubmit={async (values, { setSubmitting }) => {
        const success = await onSubmit(values);
        if (!success) {
          setSubmitting(false);
        }
      }}
      enableReinitialize
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        isSubmitting,
      }) => {
        // Trova il pacchetto selezionato
        const selectedPackage = values.package_id ?
          packages.find(pkg => pkg.id === parseInt(values.package_id)) : null;

        // Calcola le ore disponibili
        const { availableHours, totalAvailable } = selectedPackage ?
          calculatePackageHours(values.package_id, selectedPackage.total_hours) :
          { availableHours: 0, totalAvailable: 0 };

        // Determine if we're in package detail context and should use the specialized student selector
        const isPackageDetailContext = context === 'packageDetail' && fixedPackageId && packageStudents.length > 0;

        return (
          <Form>
            <Grid container spacing={3}>
              {/* Studente - Using either PackageStudentSelector or EntityAutocomplete based on context */}
              <Grid item xs={12} md={4}>
                {isPackageDetailContext ? (
                  // Use specialized selector when in package detail context
                  <PackageStudentSelector
                    packageStudents={packageStudents}
                    value={values.student_id}
                    onChange={(studentId) => {
                      setFieldValue('student_id', studentId);
                      if (onStudentChange) {
                        onStudentChange(studentId, setFieldValue);
                      }
                    }}
                    error={touched.student_id && Boolean(errors.student_id)}
                    helperText={touched.student_id && errors.student_id}
                    required={true}
                  />
                ) : (
                  // Use regular student autocomplete in other contexts
                  <EntityAutocomplete
                    value={values.student_id}
                    onChange={(studentId) => {
                      setFieldValue('student_id', studentId);
                      if (onStudentChange) {
                        onStudentChange(studentId, setFieldValue);
                      }
                    }}
                    label="Studente"
                    fetchEntities={studentService.getAll}
                    items={students}
                    error={touched.student_id && Boolean(errors.student_id)}
                    helperText={touched.student_id && errors.student_id}
                    required={true}
                  />
                )}
              </Grid>

              {/* Professore */}
              <Grid item xs={12} md={4}>
                <EntityAutocomplete
                  value={values.professor_id}
                  onChange={(professorId) => {
                    setFieldValue('professor_id', professorId);
                  }}
                  label="Professore"
                  fetchEntities={professorService.getAll}
                  items={professors}
                  error={touched.professor_id && Boolean(errors.professor_id)}
                  helperText={touched.professor_id && errors.professor_id}
                  required={true}
                  disabled={!isAdmin}
                />
              </Grid>

              {/* Data lezione */}
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Data lezione"
                  value={values.lesson_date}
                  onChange={(date) => {
                    // Imposta la data della lezione
                    setFieldValue('lesson_date', date);

                    // Se la lezione è pagata e non fa parte di un pacchetto, aggiorna anche la data di pagamento
                    if (values.is_paid && !values.is_package) {
                      setFieldValue('payment_date', date);
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: touched.lesson_date && Boolean(errors.lesson_date),
                      helperText: touched.lesson_date && errors.lesson_date,
                    },
                  }}
                />
              </Grid>

              {/* Orario inizio */}
              <Grid item xs={12} md={6}>
                <TimePicker
                  label="Orario inizio"
                  value={values.start_time}
                  onChange={(time) => setFieldValue('start_time', time)}
                  ampm={false}
                  minutesStep={30}
                  views={['hours', 'minutes']}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                    },
                  }}
                />
              </Grid>

              {/* Durata */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="duration"
                  label="Durata (ore)"
                  type="number"
                  value={values.duration}
                  onChange={(e) => {
                    const newDuration = parseFloat(e.target.value) || 0;
                    handleChange(e);

                    // Se non è una lezione da pacchetto, aggiorna automaticamente il prezzo
                    if (!values.is_package) {
                      setFieldValue('price', newDuration * 20);
                    }
                  }}
                  onBlur={handleBlur}
                  error={touched.duration && Boolean(errors.duration)}
                  helperText={touched.duration && errors.duration}
                  inputProps={{
                    min: 0.5,
                    step: 0.5,
                  }}
                  required
                />
                {selectedPackage && values.is_package && (
                  <FormHelperText>
                    Ore disponibili:
                    {isEditMode && originalLesson?.is_package &&
                      originalLesson?.package_id === parseInt(values.package_id)
                      ? totalAvailable.toFixed(1)
                      : `${availableHours.toFixed(1)} di ${selectedPackage.total_hours}`}

                    {((isEditMode && parseFloat(values.duration) > totalAvailable) ||
                      (!isEditMode && parseFloat(values.duration) > availableHours)) && (
                        <span style={{ color: 'red' }}> (La durata supera le ore disponibili)</span>
                      )}
                  </FormHelperText>
                )}
              </Grid>

              {/* Tariffa oraria */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="hourly_rate"
                  label="Tariffa oraria"
                  type="number"
                  value={values.hourly_rate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.hourly_rate && Boolean(errors.hourly_rate)}
                  helperText={touched.hourly_rate && errors.hourly_rate}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>,
                  }}
                  required
                />
              </Grid>

              {/* Totale calcolato automaticamente */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Totale lezione"
                  value={`€ ${(values.duration * values.hourly_rate).toFixed(2) || '0.00'}`}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>

              {/* Toggle per lezione online */}
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      name="is_online"
                      checked={values.is_online || false}
                      onChange={(e) => {
                        setFieldValue('is_online', e.target.checked);
                      }}
                    />
                  }
                  label="Lezione online"
                />
              </Grid>

              {/* Checkbox pacchetto - Hide in package detail context since it's always a package lesson */}
              {!isPackageDetailContext && (
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="is_package"
                        checked={values.is_package}
                        onChange={(e) => {
                          setFieldValue('is_package', e.target.checked);
                          if (!e.target.checked) {
                            setFieldValue('package_id', null);
                          }
                        }}
                      />
                    }
                    label="Parte di un pacchetto"
                  />
                  {values.student_id && packages.length > 0 && (
                    <FormHelperText sx={{ color: 'primary.main', ml: 2 }}>
                      {packages.length} pacchetto{packages.length !== 1 ? 'i' : ''} disponibile{packages.length !== 1 ? 'i' : ''}
                    </FormHelperText>
                  )}
                </Grid>
              )}

              {/* Stato pagamento (solo per lezioni singole) */}
              {!values.is_package && (
                <>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="is_paid"
                          checked={values.is_paid}
                          onChange={(e) => {
                            const isPaid = e.target.checked;
                            setFieldValue('is_paid', isPaid);
                            if (isPaid) {
                              setFieldValue('payment_date', new Date());
                              if (!values.price) {
                                setFieldValue('price', 20 * values.duration);
                              }
                            } else {
                              setFieldValue('price', 20 * values.duration);
                              setFieldValue('payment_date', null);
                            }
                          }}
                        />
                      }
                      label="Lezione pagata"
                    />
                  </Grid>

                  {/* Data di pagamento e prezzo (solo se pagata) */}
                  {values.is_paid && (
                    <>
                      <Grid item xs={12} md={6}>
                        <DatePicker
                          label="Data pagamento"
                          value={values.payment_date}
                          onChange={(date) => setFieldValue('payment_date', date)}
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              required: true,
                              error: touched.payment_date && Boolean(errors.payment_date),
                              helperText: touched.payment_date && errors.payment_date,
                            },
                          }}
                        />
                      </Grid>

                      {/* Prezzo (solo per admin) */}
                      {isAdmin && (
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            name="price"
                            label="Prezzo studente"
                            type="number"
                            value={values.price || 20 * values.duration}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">€</InputAdornment>,
                            }}
                            inputProps={{
                              min: 0,
                              step: 0.5,
                            }}
                          />
                          <FormHelperText>
                            Prezzo pagato dallo studente all'associazione
                          </FormHelperText>
                        </Grid>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Selezione pacchetto - Hide in package detail context or show but disabled */}
              {values.is_package && !isPackageDetailContext ? (
                <Grid item xs={12}>
                  <FormControl
                    fullWidth
                    error={touched.package_id && Boolean(errors.package_id)}
                  >
                    <InputLabel id="package-label">Pacchetto</InputLabel>
                    <Select
                      labelId="package-label"
                      name="package_id"
                      value={values.package_id || ''}
                      onChange={(e) => onPackageChange(e.target.value, setFieldValue)}
                      onBlur={handleBlur}
                      label="Pacchetto"
                    >
                      {packages.length === 0 ? (
                        <MenuItem disabled>
                          Nessun pacchetto attivo per questo studente
                        </MenuItem>
                      ) : (
                        packages.map((pkg) => (
                          <MenuItem key={pkg.id} value={pkg.id}>
                            {`Pacchetto #${pkg.id} - ${pkg.remaining_hours} ore rimanenti`}
                            {pkg.status === 'completed' && ' (Completato)'}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    {touched.package_id && errors.package_id && (
                      <FormHelperText>{errors.package_id}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
              ) : isPackageDetailContext ? (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="package-label">Pacchetto</InputLabel>
                    <Select
                      labelId="package-label"
                      name="package_id"
                      value={fixedPackageId}
                      disabled={true}
                      label="Pacchetto"
                    >
                      <MenuItem value={fixedPackageId}>
                        {`Pacchetto #${fixedPackageId}`}
                      </MenuItem>
                    </Select>
                    <FormHelperText>
                      Pacchetto selezionato automaticamente
                    </FormHelperText>
                  </FormControl>
                </Grid>
              ) : null}

              {/* Pulsanti di azione */}
              <Grid item xs={12}>
                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Aggiorna' : 'Crea')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Form>
        );
      }}
    </Formik>
  );
}

export default LessonForm;