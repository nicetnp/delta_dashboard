import { useEffect } from 'react';

interface ToastProps {
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ type, title, message, onClose, duration = 3200 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-500'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠'
  };

  return (
    <div className={`fade-in ${colors[type]} text-white px-4 py-3 rounded-lg shadow flex items-start gap-3`}>
      <span className="w-5 h-5 mt-0.5 flex items-center justify-center">
        {icons[type]}
      </span>
      <div>
        <div className="font-semibold">{title}</div>
        {message && <div className="text-sm opacity-90">{message}</div>}
      </div>
    </div>
  );
}
