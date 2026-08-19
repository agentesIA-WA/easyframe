import React, { useState, useEffect } from 'react';

const AdminPasswordModal = ({ isOpen, onClose, onConfirm, title = "Autorização do Administrador", message = "Por favor, insira a senha de um administrador para continuar." }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('A senha é obrigatória.');
            return;
        }
        onConfirm(password);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-red-600 bg-red-50">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">{message}</p>
                        
                        <div>
                            <input 
                                type="password" 
                                className="w-full border-slate-200 rounded-xl focus:border-primary-500 focus:ring-primary-500 text-sm bg-slate-50 font-bold px-4 py-2"
                                placeholder="Senha do Administrador"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                            {error && <p className="text-xs text-rose-500 font-bold mt-1">{error}</p>}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 flex gap-3 justify-end border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-700 uppercase tracking-widest transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 text-xs font-black text-white rounded-lg uppercase tracking-widest transition-all shadow-lg bg-red-600 hover:bg-red-700 shadow-red-900/20"
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminPasswordModal;
