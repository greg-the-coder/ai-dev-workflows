export interface Task {
  taskId: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completionDate?: string;
  completionStatus: 'open' | 'completed';
  createdDate: string;
  updatedDate: string;
}

export interface CreateTaskRequest {
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UpdateTaskRequest {
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  completed?: boolean;
}

export interface TaskSummary {
  high: {
    count: number;
    tasks: Task[];
  };
  medium: {
    count: number;
    tasks: Task[];
  };
  low: {
    count: number;
    tasks: Task[];
  };
}

export interface OpenTasksSummaryResponse {
  summary: TaskSummary;
  totalOpenTasks: number;
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface CompletedTasksResponse {
  completedTasks: Task[];
  tasksByDate: { [date: string]: Task[] };
  sortedDates: string[];
  totalCompleted: number;
  limit: number;
}
