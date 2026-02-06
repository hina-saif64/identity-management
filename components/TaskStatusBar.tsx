import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown } from 'lucide-react';
import { taskManager, BackgroundTask } from '../services/taskManager';

const TaskStatusBar: React.FC = () => {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = taskManager.subscribe(setTasks);
    return () => {
      unsubscribe();
    };
  }, []);

  const runningTasks = tasks.filter(task => task.status === 'running');
  const recentTasks = tasks.slice(0, 5); // Show last 5 tasks

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-0 left-52 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl">
      {/* Header Bar */}
      <div 
        className="h-12 px-6 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {runningTasks.length > 0 ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
            <span className="text-sm font-bold text-white">
              {runningTasks.length > 0 
                ? `${runningTasks.length} task${runningTasks.length > 1 ? 's' : ''} running`
                : 'All tasks completed'
              }
            </span>
          </div>
          
          {runningTasks.length > 0 && (
            <div className="flex items-center gap-2">
              {runningTasks.slice(0, 2).map(task => (
                <div key={task.id} className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-lg">
                  <span className="text-xs text-blue-400 font-medium">{task.type.replace('_', ' ')}</span>
                  <span className="text-xs text-slate-400">{task.progress}%</span>
                </div>
              ))}
              {runningTasks.length > 2 && (
                <span className="text-xs text-slate-500">+{runningTasks.length - 2} more</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </div>

      {/* Expanded Task List */}
      {isExpanded && (
        <div className="max-h-64 overflow-y-auto border-t border-slate-800">
          <div className="p-4 space-y-3">
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    {task.status === 'running' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {task.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {task.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {task.status === 'cancelled' && <X className="w-4 h-4 text-orange-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {task.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(task.startTime).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-400 truncate">{task.message}</p>
                    
                    {task.status === 'running' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {task.status === 'running' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      taskManager.cancelTask(task.id);
                    }}
                    className="ml-3 p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskStatusBar;