import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  theme?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  theme = 'dark',
  size = 'md',
  message = 'Loading...'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-8 h-8';
      case 'lg':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className={`${getSizeClasses()} animate-spin ${
        theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
      }`} />
      <p className={`text-sm font-medium ${
        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
      }`}>
        {message}
      </p>
    </div>
  );
};

export default LoadingSpinner;