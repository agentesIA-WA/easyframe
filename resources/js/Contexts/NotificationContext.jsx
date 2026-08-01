import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const notify = useCallback((type, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
        
        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const remove = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            {/* Overlay de Notificações */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm">
                {notifications.map(n => (
                    <div 
                        key={n.id} 
                        className={`p-4 rounded-xl shadow-2xl border-l-4 transform transition-all duration-300 animate-slide-in flex items-center justify-between ${
                            n.type === 'success' ? 'bg-white border-emerald-500 text-slate-800' :
                            n.type === 'error' ? 'bg-white border-rose-500 text-slate-800' :
                            'bg-white border-amber-500 text-slate-800'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className={
                                n.type === 'success' ? 'text-emerald-500' :
                                n.type === 'error' ? 'text-rose-500' :
                                'text-amber-500'
                            }>
                                {n.type === 'success' && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                                {n.type === 'error' && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>}
                                {n.type === 'warning' && <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
                            </span>
                            <div>
                                <p className="font-bold text-sm leading-tight">{n.type === 'success' ? 'Sucesso' : n.type === 'error' ? 'Erro' : 'Aviso'}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                            </div>
                        </div>
                        <button onClick={() => remove(n.id)} className="text-slate-300 hover:text-slate-500 transition-colors">
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes slide-in {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in { animation: slide-in 0.3s ease-out forwards; }
            `}</style>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
