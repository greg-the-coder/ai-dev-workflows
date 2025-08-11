import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { CheckCircle, ExpandMore, CalendarToday } from '@mui/icons-material';
import { CompletedTasksResponse } from '../types/Task';
import { TaskAPI } from '../services/api';

const CompletedTasks: React.FC = () => {
  const [completedData, setCompletedData] = useState<CompletedTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadCompletedTasks();
  }, [limit]);

  const loadCompletedTasks = async () => {
    try {
      setLoading(true);
      const data = await TaskAPI.getCompletedTasks(limit);
      setCompletedData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load completed tasks');
      console.error('Error loading completed tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!completedData) {
    return (
      <Alert severity="error">
        Failed to load completed tasks data
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <CheckCircle sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Completed Tasks
          </Typography>
        </Box>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Limit</InputLabel>
          <Select
            value={limit}
            label="Limit"
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Summary
        </Typography>
        <Typography variant="body1">
          Total completed tasks: <strong>{completedData.totalCompleted}</strong>
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Showing {Math.min(limit, completedData.totalCompleted)} most recent completions
        </Typography>
      </Paper>

      {/* Tasks grouped by completion date */}
      {completedData.sortedDates.length === 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center' }}>
            No completed tasks found
          </Typography>
        </Paper>
      ) : (
        <Box>
          {completedData.sortedDates.map((date) => {
            const tasksForDate = completedData.tasksByDate[date];
            return (
              <Accordion key={date} defaultExpanded={completedData.sortedDates.indexOf(date) < 3}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box display="flex" alignItems="center" width="100%">
                    <CalendarToday sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {formatDate(date)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {tasksForDate.length} task{tasksForDate.length !== 1 ? 's' : ''} completed
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {tasksForDate.map((task) => (
                      <ListItem key={task.taskId} divider>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body1">
                                {task.description}
                              </Typography>
                              <Chip
                                label={task.priority.toUpperCase()}
                                size="small"
                                color={getPriorityColor(task.priority) as any}
                              />
                              <Chip
                                label="COMPLETED"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                Created: {new Date(task.createdDate).toLocaleDateString()}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Completed: {new Date(task.completionDate!).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default CompletedTasks;
