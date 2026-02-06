/**
 * HYPERION TASK MANAGER
 * Manages background processes that persist across tab switches
 */

export interface BackgroundTask {
  id: string;
  type: 'AD_FETCH' | 'CLOUD_SYNC' | 'BULK_ACTION' | 'TERMINAL_EXEC';
  status: 'running' | 'completed' | 'error' | 'cancelled';
  progress: number;
  message: string;
  startTime: number;
  result?: any;
  error?: string;
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

class TaskManager {
  private tasks = new Map<string, BackgroundTask>();
  private listeners = new Set<(tasks: BackgroundTask[]) => void>();

  createTask(type: BackgroundTask['type'], onProgress?: BackgroundTask['onProgress'], onComplete?: BackgroundTask['onComplete'], onError?: BackgroundTask['onError']): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: BackgroundTask = {
      id,
      type,
      status: 'running',
      progress: 0,
      message: 'Initializing...',
      startTime: Date.now(),
      onProgress,
      onComplete,
      onError
    };

    this.tasks.set(id, task);
    this.notifyListeners();
    
    console.log(`[TASK] Created ${type} task: ${id}`);
    return id;
  }

  updateTask(id: string, updates: Partial<BackgroundTask>) {
    const task = this.tasks.get(id);
    if (!task) return;

    Object.assign(task, updates);
    
    // Call callbacks
    if (updates.progress !== undefined && task.onProgress) {
      task.onProgress(updates.progress, updates.message || task.message);
    }
    
    if (updates.status === 'completed' && task.onComplete && updates.result !== undefined) {
      task.onComplete(updates.result);
    }
    
    if (updates.status === 'error' && task.onError && updates.error) {
      task.onError(updates.error);
    }

    this.notifyListeners();
    
    // Auto-cleanup completed/error tasks after 30 seconds
    if (updates.status === 'completed' || updates.status === 'error') {
      setTimeout(() => {
        this.removeTask(id);
      }, 30000);
    }
  }

  getTask(id: string): BackgroundTask | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.startTime - a.startTime);
  }

  getRunningTasks(): BackgroundTask[] {
    return this.getAllTasks().filter(task => task.status === 'running');
  }

  removeTask(id: string) {
    if (this.tasks.delete(id)) {
      console.log(`[TASK] Removed task: ${id}`);
      this.notifyListeners();
    }
  }

  cancelTask(id: string) {
    const task = this.tasks.get(id);
    if (task && task.status === 'running') {
      this.updateTask(id, { 
        status: 'cancelled', 
        message: 'Task cancelled by user' 
      });
    }
  }

  // Subscribe to task updates
  subscribe(listener: (tasks: BackgroundTask[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const tasks = this.getAllTasks();
    this.listeners.forEach(listener => listener(tasks));
  }

  // Cleanup old tasks
  cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, task] of this.tasks) {
      if (task.status !== 'running' && (now - task.startTime) > maxAge) {
        this.removeTask(id);
      }
    }
  }
}

// Global task manager instance
export const taskManager = new TaskManager();

// Cleanup old tasks every minute
setInterval(() => {
  taskManager.cleanup();
}, 60000);