import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';

const CategoryQuickModal = ({ isOpen, onClose, onCategorySelected }) => {
    const [loading, setLoading] = useState(false);
    const { notify } = useNotification();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        calculation_type: 1
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: '',
                description: '',
                calculation_type: 1
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            notify('warning', 'Informe o nome da categoria.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                calculation_type: parseInt(formData.calculation_type, 10)
            };
            const response = await axios.post('/api/v1/categories', payload);
            const savedCategory = response.data.data || response.data;
            notify('success', 'Categoria cadastrada e selecionada com sucesso!');
            if (onCategorySelected) {
                onCategorySelected(savedCategory);
            }
            onClose();
        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            const msg = error.response?.data?.message || 'Erro ao cadastrar categoria. Verifique os dados.';
            notify('error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                            +
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest">Nova Categoria Rápida</h3>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition text-lg font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-slate-50/50">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 tracking-wider">
                            Nome da Categoria <span className="text-rose-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ex: Molduras de Madeira"
                            className="w-full border-slate-200 rounded-lg text-sm font-bold h-10 focus:ring-primary-500 focus:border-primary-500" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 tracking-wider">
                            Tipo de Cálculo <span className="text-rose-500">*</span>
                        </label>
                        <select 
                            className="w-full border-slate-200 rounded-lg text-sm font-bold h-10 focus:ring-primary-500 focus:border-primary-500"
                            value={formData.calculation_type}
                            onChange={(e) => setFormData({...formData, calculation_type: parseInt(e.target.value, 10)})}
                        >
                            <option value={1}>Absoluto (Unitário - Por Peça/Unidade)</option>
                            <option value={2}>Linear (Perímetro / Moldura ao Metro)</option>
                            <option value={3}>M² (Metro Quadrado - Vidros / Fundos)</option>
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                            {formData.calculation_type === 1 && 'Preço aplicado diretamente à quantidade unitária do produto.'}
                            {formData.calculation_type === 2 && 'Exige largura e mede o perímetro para cálculo de corte em molduras.'}
                            {formData.calculation_type === 3 && 'Calculado com base em área (largura × altura), comum para vidros e passe-partout.'}
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-600 mb-1 tracking-wider">
                            Descrição (Opcional)
                        </label>
                        <textarea 
                            rows="2"
                            placeholder="Breve resumo sobre os produtos desta categoria..."
                            className="w-full border-slate-200 rounded-lg text-xs p-2 focus:ring-primary-500 focus:border-primary-500 font-medium" 
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-200/60">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 px-4 py-2 border border-slate-300 text-slate-600 rounded-lg font-bold text-xs uppercase hover:bg-white transition"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-xs uppercase hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
                        >
                            {loading ? 'Gravando...' : 'Gravar e Selecionar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CategoryQuickModal;
