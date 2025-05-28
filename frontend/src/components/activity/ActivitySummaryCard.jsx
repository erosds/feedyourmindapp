// src/components/activity/ActivitySummaryCard.jsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  Divider,
  Chip,
  Button,
  Avatar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Add as CreateIcon,
  Edit as UpdateIcon,
  Delete as DeleteIcon,
  AccountCircle as AccountIcon,
  School as SchoolIcon,
  MenuBook as LessonIcon,
  Book as PackageIcon
} from '@mui/icons-material';

function getActionIcon(actionType) {
  switch (actionType) {
    case 'create':
      return <CreateIcon fontSize="small" sx={{ color: 'success.main' }} />;
    case 'update':
      return <UpdateIcon fontSize="small" sx={{ color: 'primary.main' }} />;
    case 'delete':
      return <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />;
    default:
      return null;
  }
}

function getEntityIcon(entityType) {
  switch (entityType) {
    case 'professor':
      return <AccountIcon fontSize="small" />;
    case 'student':
      return <SchoolIcon fontSize="small" />;
    case 'lesson':
      return <LessonIcon fontSize="small" />;
    case 'package':
      return <PackageIcon fontSize="small" />;
    default:
      return null;
  }
}

function ActivityItem({ activity }) {
  const entityUrl = `/${activity.entity_type}s/${activity.entity_id}`;
  const formattedTime = formatDistance(new Date(activity.timestamp), new Date(), {
    addSuffix: true,
    locale: it
  });

  const handleClick = (e) => {
    e.preventDefault();
    window.location.href = entityUrl;
  };

  return (
    <ListItem
      alignItems="flex-start"
      sx={{
        p: 1,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover',
        }
      }}
      onClick={handleClick}
    >
      <Box display="flex" alignItems="center" width="100%">
        <Box display="flex" alignItems="center" mr={1.5}>
          {getActionIcon(activity.action_type)}
          {getEntityIcon(activity.entity_type)}
        </Box>
        <Box flexGrow={1} sx={{ maxWidth: { xs: '180px', sm: '100%' } }}>
          <Typography
            variant="body2"
            sx={{
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {activity.description}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" ml={1}>
          {formattedTime}
        </Typography>
      </Box>
    </ListItem>
  );
}

function ActivitySummaryCard({
  activityData,
  title,
  showViewAll = true,
  maxItems = 3,
  isSearchActive = false,
  searchFilters = {}
}) {
  const navigate = useNavigate();

  if (!activityData) return null;

  const {
    professor_id,
    professor_name,
    last_activity_time,
    activities_count, // Questo è già il conteggio filtrato
    recent_activities // Queste sono già le attività filtrate
  } = activityData;

  const displayActivities = recent_activities.slice(0, maxItems);
  const hasMoreActivities = recent_activities.length > maxItems;

  const handleViewAll = () => {
    if (isSearchActive) {
      // Se siamo in modalità ricerca, costruisci l'URL con i filtri
      const queryParams = new URLSearchParams();

      if (searchFilters.searchTerm) {
        queryParams.append('search', searchFilters.searchTerm);
      }
      if (searchFilters.actionTypeFilter && searchFilters.actionTypeFilter !== 'all') {
        queryParams.append('action', searchFilters.actionTypeFilter);
      }
      if (searchFilters.entityTypeFilter && searchFilters.entityTypeFilter !== 'all') {
        queryParams.append('entity', searchFilters.entityTypeFilter);
      }
      if (searchFilters.timeRange) {
        queryParams.append('days', searchFilters.timeRange);
      }

      const queryString = queryParams.toString();
      const url = queryString
        ? `/activities/user/${professor_id}?${queryString}`
        : `/activities/user/${professor_id}`;

      navigate(url);
    } else {
      // Modalità normale, vai alla pagina senza filtri
      navigate(`/activities/user/${professor_id}`);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 2, pb: 1, flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center" flexGrow={1}>
            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
              {professor_name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ display: 'inline' }}>
                {title || professor_name}
              </Typography>
              {last_activity_time && (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'inline', ml: 1 }}>
                  (ultima attività: {formatDistance(new Date(last_activity_time), new Date(), { addSuffix: true, locale: it })})
                </Typography>
              )}
            </Box>
          </Box>
          <Chip
            label={`${activityData.filtered_activities_count || activities_count} attività${activityData.filtered_activities_count ? ` (di ${activities_count})` : ''}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {displayActivities.length > 0 ? (
          <List disablePadding>
            {displayActivities.map((activity, index) => (
              <React.Fragment key={activity.id}>
                <ActivityItem activity={activity} />
                {index < displayActivities.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box py={2} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Nessuna attività recente
            </Typography>
          </Box>
        )}

        {/* CORREZIONE: Mostra il pulsante solo se ci sono effettivamente più attività da visualizzare */}
        {showViewAll && (hasMoreActivities || isSearchActive) && (
          <Box mt={1} display="flex" justifyContent="center">
            <Button
              variant="text"
              size="small"
              onClick={handleViewAll}
            >
              {isSearchActive
                ? `Visualizza tutte le ${activityData.filtered_activities_count || activities_count} attività filtrate`
                : hasMoreActivities
                  ? `Visualizza tutte (${activities_count})`
                  : 'Visualizza dettagli'
              }
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitySummaryCard;