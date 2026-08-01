import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import Pagination from '../../Components/Pagination';

const PaymentMethods = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('description');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState(null);
    const { notify } = useNotification();

    const [formData, setFormData] = useState({
        description: '',
        commission_rate: 0,
        is_cash: false,
        is_active: true
    });

    const fetchMethods = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/core/payment-methods?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setMethods(res.data.data);
            setMeta(res.data);
        } catch (error) {
            notify('error', 'Falha ao carregar formas de pagamento.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchMethods(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, sortBy, sortDir]);

    const handleSort = (field) => {
        const isAsc = sortBy === field && sortDir === 'asc';
        setSortBy(field);
        setSortDir(isAsc ? 'desc' : 'asc');
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <svg className="w-3 h-3 ml-1 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>;
        return sortDir === 'asc' 
            ? <svg className="w-3 h-3 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>
            : <svg className="w-3 h-3 ml-1 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>;
    };

    const handleOpenModal = (method = null) => {
        if (method) {
            setEditingMethod(method);
            setFormData({
                description: method.description,
                commission_rate: method.commission_rate,
                is_cash: !!method.is_cash,
                is_active: method.is_active
            });
        } else {
            setEditingMethod(null);
            setFormData({
                description: '',
                commission_rate: 0,
                is_cash: false,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingMethod) {
                await axios.put(`/api/v1/core/payment-methods/${editingMethod.id}`, formData);
                notify('success', 'Forma de pagamento atualizada.');
            } else {
                await axios.post('/api/v1/core/payment-methods', formData);
                notify('success', 'Nova forma de pagamento cadastrada.');
            }
            setIsModalOpen(false);
            fetchMethods();
        } catch (error) {
            notify('error', 'Erro ao salvar forma de pagamento.');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja remover esta forma de pagamento?')) {
            try {
                await axios.delete(`/api/v1/core/payment-methods/${id}`);
                notify('success', 'Forma de pagamento removida.');
                fetchMethods();
            } catch (error) {
                notify('error', 'Não foi possível remover.');
            }
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Formas de Pagamento</h1>
                    <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </span>
                            <input 
                                type="text" 
                                placeholder="Pesquisar..." 
                                className="pl-9 pr-4 py-1.5 bg-slate-700/50 border-slate-600 rounded text-xs text-white placeholder-slate-400 focus:ring-primary-500 focus:border-primary-500 w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => handleOpenModal()}
                            className="w-full md:w-auto bg-primary-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-primary-700 transition"
                        >
                            + NOVA FORMA
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('description')}>
                                    Descrição <SortIcon field="description" />
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('is_cash')}>
                                    Vencimento / Tipo <SortIcon field="is_cash" />
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('commission_rate')}>
                                    Taxa (%) <SortIcon field="commission_rate" />
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('is_active')}>
                                    Status <SortIcon field="is_active" />
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : methods.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500">Nenhuma forma cadastrada.</td></tr>
                            ) : methods.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 text-xs font-bold text-slate-800 uppercase">{m.description}</td>
                                    <td className="px-4 py-2 text-xs">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${m.is_cash ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                            {m.is_cash ? '⚡ À Vista (No Dia)' : '📅 A Prazo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-xs font-mono font-bold text-primary-600">{m.commission_rate}%</td>
                                    <td className="px-4 py-2 text-xs">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter border ${m.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                            {m.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenModal(m)} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200">Editar</button>
                                            <button onClick={() => handleDelete(m.id)} className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-red-100">Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination meta={meta} onPageChange={fetchMethods} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                                {editingMethod ? 'Editar Forma' : 'Nova Forma de Pagamento'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-rose-500 transition-colors text-2xl">✕</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Descrição</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Ex: CARTÃO DE CRÉDITO VISA"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Taxa de Comissão (%)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500"
                                    value={formData.commission_rate}
                                    onChange={(e) => setFormData({...formData, commission_rate: parseFloat(e.target.value) || 0})}
                                />
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                <input 
                                    type="checkbox" 
                                    id="is_cash"
                                    className="w-5 h-5 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                    checked={formData.is_cash}
                                    onChange={(e) => setFormData({...formData, is_cash: e.target.checked})}
                                />
                                <label htmlFor="is_cash" className="cursor-pointer">
                                    <span className="text-xs font-black uppercase text-emerald-900 tracking-wider block">Pagamento à Vista (Vencimento no dia)</span>
                                    <span className="text-[11px] font-medium text-emerald-700 block mt-0.5">
                                        Quando marcado, o vencimento financeiro será gerado automaticamente para a data atual (hoje, ex: PIX, Dinheiro, Débito).
                                    </span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="is_active"
                                    className="w-5 h-5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-slate-600">Forma Ativa</label>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-xs hover:bg-white hover:text-slate-600 transition uppercase tracking-widest"
                                >
                                    CANCELAR
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl font-black text-xs hover:bg-primary-700 shadow-2xl shadow-primary-900/40 transition transform active:scale-95 uppercase tracking-widest"
                                >
                                    {editingMethod ? 'ATUALIZAR' : 'CADASTRAR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethods;
