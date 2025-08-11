import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Check, Undo } from '@mui/icons-material';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../types/Task';
import { TaskAPI } from '../services/api';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksData = await TaskAPI.getAllTasks();
      setTasks(tasksData);
      setError(null);
    } catch (err) {
      setError('Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      await TaskAPI.createTask(formData);
      setOpenDialog(false);
      setFormData({ description: '', priority: 'medium' });
      loadTasks();
    } catch (err) {
      setError('Failed to create task');
      console.error('Error creating task:', err);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      const updates: UpdateTaskRequest = {
        description: formData.description,
        priority: formData.priority,
      };
      await TaskAPI.updateTask(editingTask.taskId, updates);
      setOpenDialog(false);
      setEditingTask(null);
      setFormData({ description: '', priority: 'medium' });
      loadTasks();
    } catch (err) {
      setError('Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updates: UpdateTaskRequest = {
        completed: task.completionStatus === 'open',
      };
      await TaskAPI.updateTask(task.taskId, updates);
      loadTasks();
    } catch (err) {
      setError('Failed to update task status');
      console.error('Error updating task status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await TaskAPI.deleteTask(taskId);
      loadTasks();
    } catch (err) {
      setError('Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setFormData({ description: '', priority: 'medium' });
    setOpenDialog(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      description: task.description,
      priority: task.priority,
    });
    setOpenDialog(true);
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          All Tasks
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreateDialog}
        >
          Add Task
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <List>
          {tasks.length === 0 ? (
            <ListItem>
              <ListItemText primary="No tasks found. Create your first task!" />
            </ListItem>
          ) : (
            tasks.map((task) => (
              <ListItem key={task.taskId} divider>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="body1"
                        sx={{
                          textDecoration: task.completionStatus === 'completed' ? 'line-through' : 'none',
                        }}
                      >
                        {task.description}
                      </Typography>
                      <Chip
                        label={task.priority.toUpperCase()}
                        size="small"
                        color={getPriorityColor(task.priority) as any}
                      />
                      {task.completionStatus === 'completed' && (
                        <Chip label="COMPLETED" size="small" color="success" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="caption" display="block">
                        Created: {new Date(task.createdDate).toLocaleDateString()}
                      </Typography>
                      {task.completionDate && (
                        <Typography variant="caption" display="block">
                          Completed: {new Date(task.completionDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleToggleComplete(task)}
                    color={task.completionStatus === 'completed' ? 'warning' : 'success'}
                  >
                    {task.completionStatus === 'completed' ? <Undo /> : <Check />}
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => openEditDialog(task)}
                    sx={{ ml: 1 }}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteTask(task.taskId)}
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTask ? 'Edit Task' : 'Create New Task'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth variant="outlined">
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              label="Priority"
            >
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="low">Low</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={editingTask ? handleUpdateTask : handleCreateTask}
            variant="contained"
            disabled={!formData.description.trim()}
          >
            {editingTask ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskList;
