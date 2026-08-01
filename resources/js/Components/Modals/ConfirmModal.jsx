import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' }) => {
    if (!isOpen) return null;

    const colors = {
        warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20',
        danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20',
        primary: 'bg-primary-600 hover:bg-primary-700 shadow-primary-900/20',
    };

    const iconColors = {
        warning: 'text-amber-600 bg-amber-50',
        danger: 'text-rose-600 bg-rose-50',
        primary: 'text-primary-600 bg-primary-50',
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconColors[type]}`}>
                            {type === 'warning' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                            {type === 'danger' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            )}
                            {type === 'primary' && (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                            <p className="text-sm text-slate-500 mt-1">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 p-4 flex gap-3 justify-end">
                    {cancelText && (
                        <button 
                            onClick={onCancel}
                            className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest transition-colors"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button 
                        onClick={onConfirm}
                        className={`px-6 py-2 text-xs font-black text-white rounded-lg uppercase tracking-widest transition-all shadow-lg ${colors[type]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
