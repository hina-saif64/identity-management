import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ComponentType<any>;
  theme?: 'light' | 'dark';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  theme = 'dark',
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 border-transparent';
      case 'secondary':
        return theme === 'dark'
          ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
          : 'bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200';
      case 'outline':
        return theme === 'dark'
          ? 'border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white'
          : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900';
      case 'ghost':
        return theme === 'dark'
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-transparent'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent';
      case 'danger':
        return 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:shadow-red-500/20 border-transparent';
      default:
        return '';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs';
      case 'md':
        return 'px-4 py-2 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return '';
    }
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg border
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;