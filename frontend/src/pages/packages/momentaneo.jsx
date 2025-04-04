<Grid item xs={12}>
                  <Divider /> {/* Divisore aggiunto */}
                  <Box display="flex" flexDirection="column" >
                    <Box display="flex" justifyContent="space-between" sx={{ mt: 13.5 }}>
                      <Typography variant="h6">Completamento:</Typography>
                      <Typography variant="h5" fontWeight="medium">
                        {completionPercentage.toFixed(0)}%
                      </Typography>
                    </Box>

                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={completionPercentage}
                    color={packageData.status === 'completed' ? 'success' : 'primary'}
                    sx={{
                      height: 10,
                      borderRadius: 1,
                      backgroundImage: `repeating-linear-gradient(to right, transparent, transparent 24.5%, 
                      #fff 24.5%, #fff 25%, transparent 25%, transparent 49.5%, #fff 49.5%, #fff 50%, 
                      transparent 50%, transparent 74.5%, #fff 74.5%, #fff 75%, transparent 75%)`,
                      backgroundSize: '100% 100%',
                    }}
                  />

                </Grid>



