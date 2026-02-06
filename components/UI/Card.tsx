import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  theme?: 'light' | 'dark';
  hover?: boolean;
  glass?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  theme = 'dark',
  hover = false,
  glass = true
}) => {
  const baseStyles = `rounded-xl border transition-all duration-300 ${
    glass ? 'glass' : ''
  } ${hover ? 'card-hover' : ''}`;

  const themeStyles = theme === 'dark'
    ? 'border-slate-700/50 bg-slate-800/30'
    : 'border-slate-200/50 bg-white/50';

  return (
    <div className={`${baseStyles} ${themeStyles} ${className}`}>
      {children}
    </div>
  );
};

export default Card;