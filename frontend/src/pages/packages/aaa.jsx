// Reorganized Grid layout section for PackageFormPage.jsx
// This replaces the Grid items in the form

<Grid container spacing={3}>
  <Grid item xs={12}>
    <Typography variant="h6">
      Dettagli Pacchetto
    </Typography>
  </Grid>

  {/* Create two columns */}
  <Grid container item xs={12} spacing={3}>
    {/* Left column for students */}
    <Grid item xs={12} md={6}>
      <Grid container spacing={3}>
        {/* First Student - Always visible and required */}
        <Grid item xs={12}>
          <StudentAutocomplete
            value={values.student_id_1}
            onChange={(studentId) => setFieldValue('student_id_1', studentId)}
            error={touched.student_id_1 && Boolean(errors.student_id_1)}
            helperText={(touched.student_id_1 && errors.student_id_1) || "Studente principale"}
            disabled={isEditMode}
            required={true}
            students={students}
          />
        </Grid>
        
        {/* Second Student - Show only if first is selected */}
        {values.student_id_1 && (
          <Grid item xs={12}>
            <StudentAutocomplete
              value={values.student_id_2}
              onChange={(studentId) => setFieldValue('student_id_2', studentId)}
              error={touched.student_id_2 && Boolean(errors.student_id_2)}
              helperText={(touched.student_id_2 && errors.student_id_2) || "Secondo studente (opzionale)"}
              disabled={isEditMode}
              required={false}
              students={students.filter(student => 
                student.id !== values.student_id_1 && 
                student.id !== values.student_id_3
              )}
            />
          </Grid>
        )}

        {/* Third Student - Show only if second is selected */}
        {values.student_id_1 && values.student_id_2 && (
          <Grid item xs={12}>
            <StudentAutocomplete
              value={values.student_id_3}
              onChange={(studentId) => setFieldValue('student_id_3', studentId)}
              error={touched.student_id_3 && Boolean(errors.student_id_3)}
              helperText={(touched.student_id_3 && errors.student_id_3) || "Terzo studente (opzionale)"}
              disabled={isEditMode}
              required={false}
              students={students.filter(student => 
                student.id !== values.student_id_1 && 
                student.id !== values.student_id_2
              )}
            />
          </Grid>
        )}
      </Grid>
    </Grid>

    {/* Right column for dates and hours - always the same height */}
    <Grid item xs={12} md={6}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DatePicker
            label="Data di Inizio"
            value={values.start_date}
            onChange={(date) => {
              setFieldValue('start_date', date);
            }}
            slotProps={{
              textField: {
                fullWidth: true,
                required: true,
                error: touched.start_date && Boolean(errors.start_date),
                helperText: touched.start_date && errors.start_date,
              },
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <DatePicker
            label="Data di Scadenza"
            value={calculateExpiryDate(values.start_date)}
            readOnly
            disabled
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: "Il pacchetto scade al termine della 4ᵃ settimana",
              },
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            name="total_hours"
            label="Ore totali pacchetto"
            type="number"
            value={values.total_hours}
            onChange={handleChange}
            onBlur={handleBlur}
            error={touched.total_hours && Boolean(errors.total_hours)}
            helperText={
              (touched.total_hours && errors.total_hours) ||
              (isEditMode ? `Ore già utilizzate: ${hoursUsed}` : '')
            }
            inputProps={{
              min: 0.5,
              step: 0.5,
            }}
            required
          />
        </Grid>
      </Grid>
    </Grid>
  </Grid>

  {/* Package Cost - only show for admins */}
  {isAdmin() && (
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        name="package_cost"
        label="Prezzo Pacchetto"
        type="number"
        value={values.package_cost}
        onChange={handleChange}
        onBlur={handleBlur}
        error={touched.package_cost && Boolean(errors.package_cost)}
        helperText={touched.package_cost && errors.package_cost}
        InputProps={{
          startAdornment: <InputAdornment position="start">€</InputAdornment>,
        }}
        inputProps={{
          min: 0,
          step: 0.5,
        }}
        required={values.is_paid}
      />
    </Grid>
  )}

  {/* Notes Field */}
  <Grid item xs={12}>
    <Divider sx={{ my: 2 }} />
    <Typography variant="subtitle1" gutterBottom>
      Annotazioni
    </Typography>
    <TextField
      fullWidth
      name="notes"
      label="Note sul pacchetto"
      placeholder="Aggiungi qui eventuali note sul pacchetto"
      value={values.notes || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      multiline
      rows={4}
      variant="outlined"
    />
  </Grid>

  {/* Payment section */}
  <Grid item xs={12}>
    <Divider sx={{ my: 2 }} />
  </Grid>

  <Grid item xs={12} md={4}>
    <FormControlLabel
      control={
        <Switch
          name="is_paid"
          checked={values.is_paid}
          onChange={(e) => {
            const isPaid = e.target.checked;
            setFieldValue('is_paid', isPaid);
            if (isPaid && !values.payment_date) {
              setFieldValue('payment_date', new Date());
            } else if (!isPaid) {
              setFieldValue('payment_date', null);
            }
          }}
        />
      }
      label="Pacchetto Pagato"
    />
  </Grid>

  {values.is_paid && (
    <Grid item xs={12} md={4}>
      <DatePicker
        label="Data del Pagamento"
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

  <Grid item xs={12}>
    <Alert severity="info" sx={{ mt: 1 }}>
      <Typography variant="body2">
        Lo stato del pacchetto verrà aggiornato automaticamente:
        <ul>
          <li><strong>In corso</strong>: non è ancora arrivata la data di scadenza</li>
          <li><strong>Terminato</strong>: la data di scadenza è passata, ma il pacchetto è stato saldato</li>
          <li><strong>Scaduto</strong>: la data odierna è successiva alla data di scadenza e il pacchetto non è pagato</li>
        </ul>
      </Typography>
    </Alert>
  </Grid>

  {/* Action Buttons */}
  <Grid item xs={12}>
    <Box display="flex" justifyContent="flex-end" gap={2}>
      <Button 
        variant="outlined" 
        onClick={() => navigate('/packages')} 
        disabled={isSubmitting}
      >
        Cancella
      </Button>
      <Button 
        type="submit" 
        variant="contained" 
        color="primary" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 
          <CircularProgress size={24} /> : 
          isEditMode ? 'Aggiorna modifiche' : 'Crea Pacchetto'
        }
      </Button>
    </Box>
  </Grid>
</Grid>