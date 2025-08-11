import axios from 'axios';
import { Task, CreateTaskRequest, UpdateTaskRequest, OpenTasksSummaryResponse, CompletedTasksResponse } from '../types/Task';

// API base URL - will be replaced during build with actual API Gateway URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.amazonaws.com/prod';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class TaskAPI {
  // Create a new task
  static async createTask(taskData: CreateTaskRequest): Promise<Task> {
    const response = await api.post('/tasks', taskData);
    return response.data.task;
  }

  // Get all tasks
  static async getAllTasks(): Promise<Task[]> {
    const response = await api.get('/tasks');
    return response.data.tasks;
  }

  // Update a task
  static async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    const response = await api.put(`/tasks/${taskId}`, updates);
    return response.data.task;
  }

  // Delete a task
  static async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  }

  // Get open tasks summary by priority
  static async getOpenTasksSummary(): Promise<OpenTasksSummaryResponse> {
    const response = await api.get('/summary/open-tasks');
    return response.data;
  }

  // Get completed tasks by date
  static async getCompletedTasks(limit: number = 50): Promise<CompletedTasksResponse> {
    const response = await api.get(`/summary/completed-tasks?limit=${limit}`);
    return response.data;
  }
}

// Error handling interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);
