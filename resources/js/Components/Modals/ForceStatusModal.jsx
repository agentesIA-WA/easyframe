import React, { useState, useEffect } from 'react';

const ForceStatusModal = ({ isOpen, onClose, onConfirm, currentStatus }) => {
    const [password, setPassword] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [error, setError] = useState('');

    const statusOptions = [
        { value: 'draft', label: 'Rascunho' },
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'production', label: 'Em Produção' },
        { value: 'ready', label: 'Pronto para Entrega' },
        { value: 'delivered', label: 'Entregue' },
        { value: 'delivered_unpaid', label: 'Entregue (Não Pago)' },
        { value: 'finished', label: 'Finalizado' },
        { value: 'canceled', label: 'Cancelado' },
    ];

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setNewStatus(currentStatus || '');
            setError('');
        }
    }, [isOpen, currentStatus]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!newStatus) {
            setError('Selecione um status.');
            return;
        }
        if (!password.trim()) {
            setError('A senha é obrigatória.');
            return;
        }
        onConfirm(newStatus, password);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-amber-600 bg-amber-50">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Forçar Status</h3>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Alterar livremente o status do pedido exige senha de um administrador.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest">Novo Status</label>
                                <select 
                                    className="w-full border-slate-200 rounded-xl focus:border-amber-500 focus:ring-amber-500 text-sm font-bold bg-slate-50 px-4 py-2 h-10"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-1 tracking-widest">Senha do Administrador</label>
                                <input 
                                    type="password" 
                                    className="w-full border-slate-200 rounded-xl focus:border-amber-500 focus:ring-amber-500 text-sm bg-slate-50 font-bold px-4 py-2 h-10"
                                    placeholder="Digite a senha..."
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                {error && <p className="text-xs text-rose-500 font-bold mt-1">{error}</p>}
                            </div>
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
                            className="px-6 py-2 text-xs font-black text-white rounded-lg uppercase tracking-widest transition-all shadow-lg bg-amber-500 hover:bg-amber-600 shadow-amber-900/20"
                        >
                            Confirmar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForceStatusModal;
