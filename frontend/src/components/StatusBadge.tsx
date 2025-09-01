import { memo } from 'react';

interface StatusBadgeProps {
  status: 'connected' | 'disconnected' | 'loading' | 'error';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge = memo(function StatusBadge({ 
  status, 
  className = '', 
  size = 'md' 
}: StatusBadgeProps) {
  const statusConfig = {
    connected: {
      text: 'Connected',
      icon: '🟢',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/20'
    },
    disconnected: {
      text: 'Disconnected',
      icon: '🔴',
      className: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/20'
    },
    loading: {
      text: 'Loading',
      icon: '🟡',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/20'
    },
    error: {
      text: 'Error',
      icon: '🔴',
      className: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-red-500/20'
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center space-x-2 rounded-full border shadow-lg backdrop-blur-sm transition-all duration-300 font-semibold ${config.className} ${sizeClasses[size]} ${className}`}>
      <span className="text-xs">{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
});

export default StatusBadge;
