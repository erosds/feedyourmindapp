{/* First Card: Period-based Statistics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statistiche per Periodo
          </Typography>

          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{ mb: 2 }}
          >
            <Tab label="Riepilogo" />
            <Tab label="Dettaglio" />
          </Tabs>

          {currentTab === 0 ? (
            <Box>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel id="period-filter-label">Periodo</InputLabel>
                <Select
                  labelId="period-filter-label"
                  value={periodFilter}
                  label="Periodo"
                  onChange={handlePeriodChange}
                >
                  <MenuItem value="week">Settimana Selezionata</MenuItem>
                  <MenuItem value="month">Mese Corrente</MenuItem>
                  <MenuItem value="lastMonth">Mese Scorso</MenuItem>
                  <MenuItem value="year">Anno Corrente</MenuItem>
                </Select>
              </FormControl>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Financial details */}
                <ClickableStatBlock
                  icon={<MoneyIcon />}
                  label="Entrate"
                  value={`€${totalIncome.toFixed(2)}`}
                  color="primary.main"
                />

                <ClickableStatBlock
                  icon={<PaymentIcon />}
                  label="Pagamenti"
                  value={`€${totalExpenses.toFixed(2)}`}
                  color="secondary.main"
                />

                <ClickableStatBlock
                  icon={<TrendingUpIcon />}
                  label="Ricavi"
                  value={`€${netProfit.toFixed(2)}`}
                  color={netProfit >= 0 ? 'success.main' : 'error.main'}
                />

                {/* Active professors */}
                <ClickableStatBlock
                  icon={<PersonIcon />}
                  label="Professori attivi"
                  value={activeProfessorsCount}
                />

                {/* Lessons in period */}
                <ClickableStatBlock
                  icon={<LessonIcon />}
                  label="Lezioni nel periodo"
                  value={totalLessonsCount}
                />

                {/* Total lesson hours */}
                <ClickableStatBlock
                  icon={<LessonIcon />}
                  label="Ore di lezione"
                  value={totalLessonHours.toFixed(1)}
                />
              </Grid>
            </Box>
          ) : (
            <Box>
              <Grid container spacing={2}>
                {/* Single Lessons column */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Lezioni Singole
                  </Typography>
                  <List dense>
                    <ListItem>
                      {(() => {
                        const paidSingleLessons = paymentsData.lessons;
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);
                        const paidLessonsCount = paidSingleLessons.length;
                        const totalLessonsCount = singleLessons.length;

                        return (
                          <ListItemText
                            primary="Numero lezioni"
                            secondary={
                              <Typography variant="body2">
                                {totalLessonsCount} <Typography component="span" variant="caption" color="text.secondary">(di cui pagate: {paidLessonsCount})</Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        const paidLessonsHours = paymentsData.hours.lessons;
                        const totalHours = periodLessons
                          .filter(lesson => !lesson.is_package)
                          .reduce((total, lesson) => total + parseFloat(lesson.duration), 0);

                        return (
                          <ListItemText
                            primary="Ore di lezione"
                            secondary={
                              <Typography variant="body2">
                                {totalHours.toFixed(1)} <Typography component="span" variant="caption" color="text.secondary">(di cui pagate: {paidLessonsHours.toFixed(1)})</Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        // Get all single lessons in the period
                        const singleLessons = periodLessons.filter(lesson => !lesson.is_package);

                        // Actual income (only paid lessons with price > 0)
                        const actualIncome = paymentsData.totals.lessons;

                        // Theoretical income (sum of all lesson prices, even if not paid)
                        const theoreticalIncome = singleLessons.reduce((total, lesson) =>
                          total + parseFloat(lesson.price || 0), 0);

                        // Check if there are lessons with zero price
                        const zeroPrice = paymentsData.lessons.some(lesson =>
                          (!lesson.price || parseFloat(lesson.price) === 0) && lesson.is_paid);

                        return (
                          <ListItemText
                            primary="Entrate lezioni"
                            secondary={
                              <Box>
                                <Typography variant="body2" component="span">
                                  €{actualIncome.toFixed(2)}/{theoreticalIncome.toFixed(2)}
                                </Typography>
                                {zeroPrice && (
                                  <Typography
                                    variant="caption"
                                    component="div"
                                    color="error.main"
                                    sx={{ mt: 0.5 }}
                                  >
                                    * Esistono lezioni pagate senza prezzo impostato
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                  </List>
                </Grid>

                {/* Package Lessons column */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Lezioni da Pacchetti
                  </Typography>
                  <List dense>
                    <ListItem>
                      {(() => {
                        // Get unique package IDs used in this period
                        const packageLessons = periodLessons.filter(lesson => lesson.is_package);
                        const uniquePackageIds = [...new Set(packageLessons.map(lesson => lesson.package_id))];
                        const totalPackages = uniquePackageIds.length;

                        // Count paid packages in the period
                        const paidPackagesCount = paymentsData.packages.length;

                        return (
                          <ListItemText
                            primary="Numero pacchetti"
                            secondary={
                              <Typography variant="body2">
                                {totalPackages} {totalPackages === 1 ? 'pacchetto' : 'pacchetti'} in uso
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {paidPackagesCount > 0 ? 
                                    ` (${paidPackagesCount} pagat${paidPackagesCount === 1 ? 'o' : 'i'} nel periodo)` : 
                                    ''}
                                </Typography>
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      {(() => {
                        const packageLessons = periodLessons.filter(lesson => lesson.is_package);
                        const totalHours = packageLessons
                          .reduce((total, lesson) => total + parseFloat(lesson.duration), 0);

                        return (
                          <ListItemText
                            primary="Ore di lezione"
                            secondary={
                              <Typography variant="body2">
                                {totalHours.toFixed(1)}
                              </Typography>
                            }
                          />
                        );
                      })()}
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Entrate pacchetti"
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              €{paymentsData.totals.packages.toFixed(2)}
                            </Typography>
                            {paymentsData.packages.some(pkg => (!pkg.package_cost || parseFloat(pkg.package_cost) === 0) && pkg.is_paid) && (
                              <Typography
                                variant="caption"
                                component="div"
                                color="error.main"
                                sx={{ mt: 0.5 }}
                              >
                                * Esistono pacchetti pagati con prezzo a zero
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>