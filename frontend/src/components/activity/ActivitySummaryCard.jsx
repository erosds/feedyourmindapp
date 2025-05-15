// src/components/activity/ActivitySummaryCard.jsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Button,
  Avatar,
  Link
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format, formatDistance } from 'date-fns';
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

function getActionLabel(actionType) {
  switch (actionType) {
    case 'create':
      return 'ha creato';
    case 'update':
      return 'ha modificato';
    case 'delete':
      return 'ha cancellato';
    default:
      return 'ha interagito con';
  }
}

function getEntityLabel(entityType) {
  switch (entityType) {
    case 'professor':
      return 'il professore';
    case 'student':
      return 'lo studente';
    case 'lesson':
      return 'la lezione';
    case 'package':
      return 'il pacchetto';
    default:
      return "l'elemento";
  }
}

function getActionColor(actionType) {
  switch (actionType) {
    case 'create':
      return 'success';
    case 'update':
      return 'primary';
    case 'delete':
      return 'error';
    default:
      return 'default';
  }
}

function ActivityItem({ activity }) {
  const entityUrl = `/${activity.entity_type}s/${activity.entity_id}`;
  const actionColor = getActionColor(activity.action_type);
  const formattedTime = formatDistance(new Date(activity.timestamp), new Date(), {
    addSuffix: true,
    locale: it
  });
  const navigate = useNavigate();

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
        <Box flexGrow={1}>
          <Typography variant="body2" noWrap>
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

function ActivitySummaryCard({ activityData, title, showViewAll = true, maxItems = 3 }) {
  const navigate = useNavigate();

  if (!activityData) return null;

  const {
    professor_id,
    professor_name,
    last_activity_time,
    activities_count,
    recent_activities
  } = activityData;

  const displayActivities = recent_activities.slice(0, maxItems);
  const hasMoreActivities = activities_count > maxItems;

  const handleViewAll = () => {
    navigate(`/activities/user/${professor_id}`);
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
            label={`${activities_count} attività`}
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

        {hasMoreActivities && showViewAll && (
          <Box mt={1} display="flex" justifyContent="center">
            <Button
              variant="text"
              size="small"
              onClick={handleViewAll}
            >
              Visualizza tutte ({activities_count})
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivitySummaryCard;