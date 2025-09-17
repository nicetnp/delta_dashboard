import type {ReactNode} from 'react';
import {memo} from 'react';

interface CardProps {
    children: ReactNode,
    className?: string,
    title?: string,
    subtitle?: string,
    icon?: string,
    variant?: 'default' | 'elevated' | 'glass' | 'minimal',
    style?: { display: string }
}

const Card = memo(function Card({
                                    children,
                                    className = '',
                                    title,
                                    subtitle,
                                    icon,
                                    variant = 'default'
                                }: CardProps) {
    const getVariantClasses = () => {
        switch (variant) {
            case 'elevated':
                return 'bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-slate-900/50';
            case 'glass':
                return 'bg-slate-900/20 backdrop-blur-2xl border border-slate-600/30 shadow-xl';
            case 'minimal':
                return 'bg-slate-800/40 border border-slate-700/40 shadow-lg';
            default:
                return 'bg-slate-800/60 backdrop-blur-lg border border-slate-600/40 shadow-xl shadow-slate-900/30';
        }
    };

    return (
        <div
            className={`${getVariantClasses()} rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-900/40 hover:border-slate-500/50 ${className}`}>
            {(title || subtitle || icon) && (
                <div className="flex items-center space-x-4 mb-6">
                    {icon && (
                        <div
                            className="w-14 h-14 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg border border-slate-500/30">
                            <span className="text-2xl filter drop-shadow-sm">{icon}</span>
                        </div>
                    )}
                    <div className="flex-1">
                        {title && <h3 className="text-xl font-semibold text-slate-100 tracking-tight">{title}</h3>}
                        {subtitle && <p className="text-slate-400 text-sm mt-1 leading-relaxed">{subtitle}</p>}
                    </div>
                </div>
            )}
            <div className="text-slate-200">
                {children}
            </div>
        </div>
    );
});

export default Card;

