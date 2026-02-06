import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Bell
} from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  duration?: number; // in milliseconds, default 12000 (12 seconds)
  persistent?: boolean; // if true, won't auto-dismiss
}

interface NotificationSystemProps {
  theme: 'light' | 'dark';
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  theme: 'light' | 'dark';
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss,
  theme
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notification.persistent) {
      const duration = notification.duration || 12000; // 12 seconds default
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300); // Match exit animation duration
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    const baseStyles = `relative overflow-hidden rounded-lg shadow-lg border backdrop-blur-sm transition-all duration-300 ${
      isVisible && !isExiting 
        ? 'translate-x-0 opacity-100' 
        : 'translate-x-full opacity-0'
    }`;

    switch (notification.type) {
      case 'success':
        return `${baseStyles} ${
          theme === 'dark'
            ? 'bg-green-900/20 border-green-500/30 text-green-100'
            : 'bg-green-50/90 border-green-200 text-green-800'
        }`;
      case 'warning':
        return `${baseStyles} ${
          theme === 'dark'
            ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-100'
            : 'bg-yellow-50/90 border-yellow-200 text-yellow-800'
        }`;
      case 'error':
        return `${baseStyles} ${
          theme === 'dark'
            ? 'bg-red-900/20 border-red-500/30 text-red-100'
            : 'bg-red-50/90 border-red-200 text-red-800'
        }`;
      case 'info':
      default:
        return `${baseStyles} ${
          theme === 'dark'
            ? 'bg-blue-900/20 border-blue-500/30 text-blue-100'
            : 'bg-blue-50/90 border-blue-200 text-blue-800'
        }`;
    }
  };

  return (
    <div className={`${getStyles()} p-4 mb-3 min-w-80 max-w-md`}>
      {/* Progress bar for auto-dismiss */}
      {!notification.persistent && (
        <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 animate-shrink-width" 
             style={{ 
               animationDuration: `${notification.duration || 12000}ms`,
               animationTimingFunction: 'linear'
             }} />
      )}
      
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
          <p className="text-sm opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const NotificationSystem: React.FC<NotificationSystemProps> = ({ theme }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 12000
    };
    
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Expose methods globally for easy access
  useEffect(() => {
    (window as any).showNotification = addNotification;
    return () => {
      delete (window as any).showNotification;
    };
  }, [addNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-6 z-50 space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
          theme={theme}
        />
      ))}
    </div>
  );
};

// Helper functions for easy notification creation
export const showNotification = {
  success: (title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({ type: 'success', title, message, ...options });
  },
  warning: (title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({ type: 'warning', title, message, ...options });
  },
  error: (title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({ type: 'error', title, message, ...options });
  },
  info: (title: string, message: string, options?: Partial<Notification>) => {
    (window as any).showNotification?.({ type: 'info', title, message, ...options });
  }
};

export default NotificationSystem;