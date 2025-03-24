// src/pages/lessons/components/LessonForm.jsx
import React from 'react';
import {
  Box,
  Button,
  Checkbox,
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

// Schema di validazione
const LessonSchema = Yup.object().shape({
  professor_id: Yup.number().required('Professore obbligatorio'),
  student_id: Yup.number().required('Studente obbligatorio'),
  lesson_date: Yup.date().required('Data obbligatoria'),
  start_time: Yup.date().required('Orario di inizio obbligatorio'),
  duration: Yup.number()
    .positive('La durata deve essere positiva')
    .required('Durata obbligatoria'),
  is_package: Yup.boolean(),
  package_id: Yup.number().nullable().when('is_package', {
    is: true,
    then: () => Yup.number().required('Pacchetto obbligatorio quando si seleziona un pacchetto'),
    otherwise: () => Yup.number().nullable(),
  }),
  hourly_rate: Yup.number()
    .positive('La tariffa oraria deve essere positiva')
    .required('Tariffa oraria obbligatoria'),
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
  originalLesson
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

        return (
          <Form>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={touched.professor_id && Boolean(errors.professor_id)}>
                  <InputLabel id="professor-label">Professore</InputLabel>
                  <Select
                    labelId="professor-label"
                    name="professor_id"
                    value={values.professor_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    label="Professore"
                    disabled={!isAdmin || isEditMode}
                  >
                    {professors.map((professor) => (
                      <MenuItem key={professor.id} value={professor.id}>
                        {professor.first_name} {professor.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.professor_id && errors.professor_id && (
                    <FormHelperText>{errors.professor_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={touched.student_id && Boolean(errors.student_id)}>
                  <InputLabel id="student-label">Studente</InputLabel>
                  <Select
                    labelId="student-label"
                    name="student_id"
                    value={values.student_id}
                    onChange={(e) => onStudentChange(e.target.value, setFieldValue)}
                    onBlur={handleBlur}
                    label="Studente"
                  >
                    {students.map((student) => (
                      <MenuItem key={student.id} value={student.id}>
                        {student.first_name} {student.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                  {touched.student_id && errors.student_id && (
                    <FormHelperText>{errors.student_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Data lezione"
                  value={values.lesson_date}
                  onChange={(date) => setFieldValue('lesson_date', date)}
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

              <Grid item xs={12} md={4}>
                <TimePicker
                  label="Orario inizio"
                  value={values.start_time}
                  onChange={(time) => setFieldValue('start_time', time)}
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
                  value={values.duration}
                  onChange={handleChange}
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
                    {isEditMode && originalLesson && originalLesson.is_package &&
                      originalLesson.package_id === parseInt(values.package_id) ? (
                      <>
                        Ore disponibili all'inserimento: {totalAvailable.toFixed(1)}
                      </>
                    ) : (
                      <>
                        Ore disponibili all'inserimento: {availableHours.toFixed(1)} di {selectedPackage.total_hours}
                      </>
                    )}

                    {((isEditMode && parseFloat(values.duration) > totalAvailable) ||
                      (!isEditMode && parseFloat(values.duration) > availableHours)) && (
                        <span style={{ color: 'red' }}>
                          {' '}(Attenzione: la durata supera le ore disponibili)
                        </span>
                      )}
                  </FormHelperText>
                )}
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
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
              </Grid>

              {values.is_package && (
                <Grid item xs={12} md={6}>
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
              )}

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

              {/* Campo per indicare se la lezione è stata pagata (solo per lezioni singole) */}
              {!values.is_package && (
                <>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="is_paid"
                          checked={values.is_paid}
                          onChange={(e) => {
                            const isPaid = e.target.checked;
                            setFieldValue('is_paid', isPaid);

                            // Se abilitiamo il pagamento, imposta data corrente come default
                            if (isPaid && !values.payment_date) {
                              setFieldValue('payment_date', new Date());
                            }
                          }}
                        />
                      }
                      label="Lezione pagata"
                    />
                  </Grid>

                  {/* Data di pagamento (mostrata solo se la lezione è pagata) */}
                  {values.is_paid && (
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
                  )}
                </>
              )}

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
                    {isSubmitting ? (
                      <CircularProgress size={24} />
                    ) : isEditMode ? (
                      'Aggiorna'
                    ) : (
                      'Crea'
                    )}
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