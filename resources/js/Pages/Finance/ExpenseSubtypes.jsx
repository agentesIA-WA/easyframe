import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import Pagination from '../../Components/Pagination';

const ExpenseSubtypes = () => {
    const [subtypes, setSubtypes] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubtype, setEditingSubtype] = useState(null);
    const { notify } = useNotification();

    const [formData, setFormData] = useState({
        name: '',
        expense_type_id: ''
    });

    const fetchData = async (page = 1, searchTerm = search, field = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const [typesRes, subtypesRes] = await Promise.all([
                axios.get('/api/v1/finance/expense-types'),
                axios.get(`/api/v1/finance/expense-subtypes?page=${page}&search=${searchTerm}&sort_by=${field}&sort_direction=${direction}`)
            ]);
            setTypes(typesRes.data.data || typesRes.data);
            setSubtypes(subtypesRes.data.data);
            setMeta(subtypesRes.data);
        } catch (error) {
            notify('error', 'Falha ao carregar dados de despesas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchData(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, sortBy, sortDir]);

    const handleSort = (field) => {
        const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(field);
        setSortDir(newDir);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-400 ml-1 opacity-50 font-normal">↕</span>;
        return sortDir === 'asc' ? <span className="text-primary-400 ml-1 font-normal">↑</span> : <span className="text-primary-400 ml-1 font-normal">↓</span>;
    };

    const handleOpenModal = (subtype = null) => {
        if (subtype) {
            setEditingSubtype(subtype);
            setFormData({
                name: subtype.name,
                expense_type_id: subtype.expense_type_id
            });
        } else {
            setEditingSubtype(null);
            setFormData({
                name: '',
                expense_type_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSubtype) {
                await axios.put(`/api/v1/finance/expense-subtypes/${editingSubtype.id}`, formData);
                notify('success', 'Subtipo atualizado com sucesso.');
            } else {
                await axios.post('/api/v1/finance/expense-subtypes', formData);
                notify('success', 'Subtipo cadastrado com sucesso.');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            notify('error', 'Erro ao salvar subtipo de despesa.');
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja remover este subtipo?')) {
            try {
                await axios.delete(`/api/v1/finance/expense-subtypes/${id}`);
                notify('success', 'Subtipo removido.');
                fetchData();
            } catch (error) {
                notify('error', 'Não foi possível remover o subtipo.');
            }
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Subtipos de Despesa</h1>
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
                            + NOVO SUBTIPO
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center">
                                        Subtipo
                                        <SortIcon field="name" />
                                    </div>
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('type.name')}>
                                    <div className="flex items-center">
                                        Tipo Pai (Categoria)
                                        <SortIcon field="type.name" />
                                    </div>
                                </th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Status</th>
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="4" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : subtypes.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-8 text-xs text-slate-500">Nenhum subtipo cadastrado.</td></tr>
                            ) : subtypes.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 text-xs font-bold text-slate-800 uppercase">{s.name}</td>
                                    <td className="px-4 py-2 text-xs">
                                        <span className="font-bold text-slate-600 uppercase">{s.type?.name}</span>
                                        <span className="ml-2 text-[10px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">
                                            {s.type?.category === 'store' ? 'Loja' : 'Particular'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-xs">
                                        <span className="px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-100 rounded text-[10px] font-black uppercase tracking-tighter">Ativo</span>
                                    </td>
                                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button onClick={() => handleOpenModal(s)} title="Editar Subtipo" className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 hover:text-amber-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} title="Excluir Subtipo" className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination meta={meta} onPageChange={fetchData} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                                {editingSubtype ? 'Editar Subtipo' : 'Novo Subtipo de Despesa'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-rose-500 transition-colors text-2xl">✕</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Descrição do Subtipo</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: ENERGIA ELÉTRICA"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Tipo / Grupo Pai</label>
                                <select 
                                    required
                                    className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500"
                                    value={formData.expense_type_id}
                                    onChange={(e) => setFormData({...formData, expense_type_id: e.target.value})}
                                >
                                    <option value="">Selecione o Tipo...</option>
                                    {types.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.group_name} - {t.name} ({t.category === 'store' ? 'Loja' : 'Particular'})
                                        </option>
                                    ))}
                                </select>
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
                                    {editingSubtype ? 'ATUALIZAR' : 'CADASTRAR'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-sm text-blue-700 italic flex gap-4 items-center">
                <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>A hierarquia de despesas permite a classificação granular para os relatórios de DRE e Movimento Diário conforme a regra de paridade legada.</span>
            </div>
        </div>
    );
};

export default ExpenseSubtypes;
