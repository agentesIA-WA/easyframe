import React, { useState } from 'react';
import axios from 'axios';

const PaymentMethodQuickModal = ({ isOpen, onClose, onSaved }) => {
    const [formData, setFormData] = useState({
        description: '',
        commission_rate: 0,
        is_cash: false,
        is_active: true
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post('/api/v1/core/payment-methods', formData);
            if (onSaved) {
                // Return the newly created method
                onSaved(response.data.data || response.data);
            }
            onClose();
        } catch (error) {
            console.error('Erro ao salvar forma de pagamento:', error);
            alert('Erro ao salvar. Verifique se já existe uma forma com este nome.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                {/* HEADER */}
                <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-widest">Nova Forma de Pagamento</h2>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition text-lg font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>

                {/* CONTENT */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Descrição</label>
                        <input 
                            type="text" 
                            required
                            autoFocus
                            className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500 text-sm py-2 px-3"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value.toUpperCase()})}
                            placeholder="Ex: PIX ITAU"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Taxa de Comissão (%)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            required
                            className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500 text-sm py-2 px-3"
                            value={formData.commission_rate}
                            onChange={(e) => setFormData({...formData, commission_rate: parseFloat(e.target.value) || 0})}
                        />
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 mt-2">
                        <input 
                            type="checkbox" 
                            id="is_cash_quick"
                            className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                            checked={formData.is_cash}
                            onChange={(e) => setFormData({...formData, is_cash: e.target.checked})}
                        />
                        <label htmlFor="is_cash_quick" className="cursor-pointer">
                            <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider block">Pagamento à Vista</span>
                            <span className="text-[10px] font-medium text-emerald-700 block mt-0.5">
                                Gera vencimento para hoje (PIX, Dinheiro).
                            </span>
                        </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-50 hover:text-slate-600 transition uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-black text-xs hover:bg-primary-700 transition uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PaymentMethodQuickModal;
