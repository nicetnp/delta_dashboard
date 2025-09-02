
import { memo, forwardRef } from 'react';

interface InputProps {
  label?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  icon?: string;
  error?: string;
  disabled?: boolean;
}

const Input = memo(forwardRef<HTMLInputElement, InputProps>(function Input({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  className = '',
  icon,
  error,
  disabled = false
}, ref) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-slate-200 tracking-tight">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-slate-400 text-lg">{icon}</span>
          </div>
        )}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-4 py-3.5 bg-slate-800/60 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm ${
            icon ? 'pl-12' : ''
          } ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500/70'
          }`}
        />
      </div>
      {error && (
        <p className="text-red-400 text-sm font-medium flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
}));

export default Input;
