// frontend/src/pages/lessons/components/LessonForm.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { parseISO, format, addHours } from 'date-fns';
import InfoIcon from '@mui/icons-material/Info';
import OnlineIcon from '@mui/icons-material/Wifi'; // Icona per lezione online

// Validation schema
const LessonSchema = Yup.object().shape({
  professor_id: Yup.number().required('Il professore è obbligatorio'),
  student_id: Yup.number().required('Lo studente è obbligatorio'),
  lesson_date: Yup.date().required('La data è obbligatoria'),
  start_time: Yup.date().nullable(),
  duration: Yup.number()
    .required('La durata è obbligatoria')
    .positive('La durata deve essere positiva')
    .max(24, 'La durata non può superare 24 ore'),
  is_package: Yup.boolean(),
  package_id: Yup.number().when('is_package', {
    is: true,
    then: (schema) => schema.required('Il pacchetto è obbligatorio'),
    otherwise: (schema) => schema.nullable(),
  }),
  hourly_rate: Yup.number()
    .required('La tariffa oraria è obbligatoria')
    .min(0, 'La tariffa non può essere negativa'),
  is_paid: Yup.boolean(),
  payment_date: Yup.date().nullable().when('is_paid', {
    is: true,
    then: (schema) => schema.required('La data di pagamento è obbligatoria'),
    otherwise: (schema) => schema.nullable(),
  }),
  is_online: Yup.boolean(),  // Aggiunto validatore per il nuovo campo
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
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPackage, setCurrentPackage] = useState(null);

  // Find current package
  useEffect(() => {
    if (initialValues.package_id && packages.length > 0) {
      const pkg = packages.find(pkg => pkg.id === parseInt(initialValues.package_id));
      setCurrentPackage(pkg || null);
    } else {
      setCurrentPackage(null);
    }
  }, [initialValues.package_id, packages]);

  // Handle form submission
  const handleFormSubmit = async (values, { setSubmitting, resetForm }) => {
    setIsSubmitting(true);
    const success = await onSubmit(values);
    setIsSubmitting(false);
    setSubmitting(false);
    if (success) {
      resetForm();
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={LessonSchema}
      onSubmit={handleFormSubmit}
      enableReinitialize
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        setFieldValue,
        isValid,
        dirty,
      }) => {
        // Calculate package hours
        const { availableHours = 0, totalAvailable = 0 } = values.package_id
          ? calculatePackageHours(values.package_id, currentPackage?.total_hours)
          : { availableHours: 0, totalAvailable: 0 };

        // Check if duration exceeds available hours
        const durationExceedsAvailable = values.is_package &&
          values.package_id &&
          parseFloat(values.duration) > parseFloat(totalAvailable);

        return (
          <Form>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Informazioni Generali
                </Typography>
              </Grid>

              {/* Student & Professor Selection */}
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  error={touched.student_id && Boolean(errors.student_id)}
                >
                  <InputLabel id="student-select-label">Studente</InputLabel>
                  <Select
                    labelId="student-select-label"
                    id="student_id"
                    name="student_id"
                    value={values.student_id}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      setFieldValue('student_id', studentId);
                      onStudentChange(studentId, setFieldValue);
                    }}
                    onBlur={handleBlur}
                    label="Studente"
                    required
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
                  <FormHelperText>
                    {touched.student_id && errors.student_id}
                  </FormHelperText>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  error={touched.professor_id && Boolean(errors.professor_id)}
                >
                  <InputLabel id="professor-select-label">Professore</InputLabel>
                  <Select
                    labelId="professor-select-label"
                    id="professor_id"
                    name="professor_id"
                    value={values.professor_id}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    label="Professore"
                    required
                  >
                    <MenuItem value="">
                      <em>Seleziona un professore</em>
                    </MenuItem>
                    {professors.map((professor) => (
                      <MenuItem key={professor.id} value={professor.id}>
                        {professor.first_name} {professor.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {touched.professor_id && errors.professor_id}
                  </FormHelperText>
                </FormControl>
              </Grid>

              {/* Date & Time */}
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
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: touched.start_time && Boolean(errors.start_time),
                      helperText: touched.start_time && errors.start_time,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="duration"
                  name="duration"
                  label="Durata (ore)"
                  type="number"
                  value={values.duration}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.duration && Boolean(errors.duration) || durationExceedsAvailable}
                  helperText={(touched.duration && errors.duration) ||
                    (durationExceedsAvailable ? `Supera le ore disponibili (${totalAvailable})` : '')}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">ore</InputAdornment>
                    ),
                    inputProps: { step: 0.5, min: 0.5 }
                  }}
                  required
                />
              </Grid>

              {/* Online Lesson Toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.is_online}
                      onChange={(e) => setFieldValue('is_online', e.target.checked)}
                      name="is_online"
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center">
                      <OnlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography>Lezione Online</Typography>
                    </Box>
                  }
                />
              </Grid>

              {/* Package Toggle & Selection */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Tipo di Lezione
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.is_package}
                      onChange={(e) => {
                        const isPackage = e.target.checked;
                        setFieldValue('is_package', isPackage);
                        if (!isPackage) {
                          setFieldValue('package_id', null);
                        }
                      }}
                      name="is_package"
                      color="primary"
                    />
                  }
                  label="Lezione da pacchetto"
                />
              </Grid>

              {values.is_package && (
                <Grid item xs={12} md={6}>
                  <FormControl
                    fullWidth
                    error={touched.package_id && Boolean(errors.package_id)}
                  >
                    <InputLabel id="package-select-label">Pacchetto</InputLabel>
                    <Select
                      labelId="package-select-label"
                      id="package_id"
                      name="package_id"
                      value={values.package_id || ''}
                      onChange={(e) => {
                        const packageId = e.target.value;
                        setFieldValue('package_id', packageId);
                        onPackageChange(packageId, setFieldValue);
                      }}
                      onBlur={handleBlur}
                      label="Pacchetto"
                      required={values.is_package}
                    >
                      <MenuItem value="">
                        <em>Seleziona un pacchetto</em>
                      </MenuItem>
                      {packages.map((pkg) => (
                        <MenuItem key={pkg.id} value={pkg.id}>
                          Pacchetto #{pkg.id} - {pkg.remaining_hours} ore rimanenti
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>
                      {touched.package_id && errors.package_id}
                    </FormHelperText>
                  </FormControl>
                </Grid>
              )}

              {values.is_package && values.package_id && (
                <Grid item xs={12} md={6}>
                  <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, boxShadow: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Informazioni Pacchetto
                    </Typography>
                    <Typography variant="body2">
                      Ore totali: {currentPackage?.total_hours || 0}
                    </Typography>
                    <Typography variant="body2">
                      Ore utilizzate: {parseFloat(currentPackage?.total_hours || 0) - parseFloat(availableHours)}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      Ore disponibili: {totalAvailable}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {/* Payment Section */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" gutterBottom>
                  Informazioni Pagamento
                </Typography>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  id="hourly_rate"
                  name="hourly_rate"
                  label="Tariffa Oraria"
                  type="number"
                  value={values.hourly_rate}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={touched.hourly_rate && Boolean(errors.hourly_rate)}
                  helperText={touched.hourly_rate && errors.hourly_rate}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">€</InputAdornment>,
                    inputProps: { step: 0.5, min: 0 }
                  }}
                  required
                />
              </Grid>

              {!values.is_package && isAdmin && (
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    id="price"
                    name="price"
                    label="Prezzo lezione"
                    type="number"
                    value={values.price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.price && Boolean(errors.price)}
                    helperText={touched.price && errors.price || "Prezzo pagato dallo studente"}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">€</InputAdornment>,
                      inputProps: { step: 0.5, min: 0 }
                    }}
                  />
                </Grid>
              )}

              {!values.is_package && (
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.is_paid}
                        onChange={(e) => {
                          const isPaid = e.target.checked;
                          setFieldValue('is_paid', isPaid);
                          if (isPaid && !values.payment_date) {
                            setFieldValue('payment_date', new Date());
                          }
                        }}
                        name="is_paid"
                        color="primary"
                      />
                    }
                    label="Lezione pagata"
                  />
                </Grid>
              )}

              {!values.is_package && values.is_paid && (
                <Grid item xs={12} md={4}>
                  <DatePicker
                    label="Data pagamento"
                    value={values.payment_date}
                    onChange={(date) => setFieldValue('payment_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: values.is_paid,
                        error: touched.payment_date && Boolean(errors.payment_date),
                        helperText: touched.payment_date && errors.payment_date,
                      },
                    }}
                  />
                </Grid>
              )}

              {/* Actions */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
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
                    {isSubmitting ? <CircularProgress size={24} /> : isEditMode ? 'Aggiorna' : 'Crea'}
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