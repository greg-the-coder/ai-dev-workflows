import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Assessment, PriorityHigh, Warning, CheckCircleOutline } from '@mui/icons-material';
import { OpenTasksSummaryResponse } from '../types/Task';
import { TaskAPI } from '../services/api';

const OpenTasksSummary: React.FC = () => {
  const [summary, setSummary] = useState<OpenTasksSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const summaryData = await TaskAPI.getOpenTasksSummary();
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError('Failed to load open tasks summary');
      console.error('Error loading summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <PriorityHigh color="error" />;
      case 'medium': return <Warning color="warning" />;
      case 'low': return <CheckCircleOutline color="success" />;
      default: return null;
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Alert severity="error">
        Failed to load summary data
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" mb={3}>
        <Assessment sx={{ mr: 2, fontSize: 32 }} />
        <Typography variant="h4" component="h1">
          Open Tasks Summary
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Open Tasks
              </Typography>
              <Typography variant="h4" component="div">
                {summary.totalOpenTasks}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PriorityHigh color="error" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    High Priority
                  </Typography>
                  <Typography variant="h4" component="div">
                    {summary.priorityBreakdown.high}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Warning color="warning" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Medium Priority
                  </Typography>
                  <Typography variant="h4" component="div">
                    {summary.priorityBreakdown.medium}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircleOutline color="success" sx={{ mr: 1 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Low Priority
                  </Typography>
                  <Typography variant="h4" component="div">
                    {summary.priorityBreakdown.low}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Task Lists by Priority */}
      <Grid container spacing={3}>
        {(['high', 'medium', 'low'] as const).map((priority) => (
          <Grid item xs={12} md={4} key={priority}>
            <Paper sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" mb={2}>
                {getPriorityIcon(priority)}
                <Typography variant="h6" sx={{ ml: 1, textTransform: 'capitalize' }}>
                  {priority} Priority Tasks ({summary.summary[priority].count})
                </Typography>
              </Box>
              
              {summary.summary[priority].tasks.length === 0 ? (
                <Typography color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  No {priority} priority tasks
                </Typography>
              ) : (
                <List dense>
                  {summary.summary[priority].tasks.map((task) => (
                    <ListItem key={task.taskId} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              {task.description}
                            </Typography>
                            <Chip
                              label={priority.toUpperCase()}
                              size="small"
                              color={getPriorityColor(priority) as any}
                            />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption">
                            Created: {new Date(task.createdDate).toLocaleDateString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default OpenTasksSummary;
