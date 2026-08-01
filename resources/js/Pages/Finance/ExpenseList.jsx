import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate } from '../../utils/formatters';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';

const ExpenseList = () => {
    const [expenses, setExpenses] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('due_date');
    const [sortDir, setSortDir] = useState('desc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingExpense, setViewingExpense] = useState(null);
    const [editingExpense, setEditingExpense] = useState(null);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        due_date: '',
        expense_type_id: '',
        status: 'pending'
    });

    const fetchExpenses = async (page = 1, searchTerm = search, field = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/finance/expenses?page=${page}&search=${searchTerm}&sort_by=${field}&sort_direction=${direction}`);
            setExpenses(response.data.data);
            setMeta(response.data);
            
            if (types.length === 0) {
                const typesRes = await axios.get('/api/v1/finance/expense-types');
                setTypes(typesRes.data.data || typesRes.data);
            }
        } catch (error) {
            console.error('Erro ao buscar despesas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchExpenses(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, sortBy, sortDir]);

    const handleSort = (field) => {
        const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(field);
        setSortDir(newDir);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-300 ml-1">↕</span>;
        return sortDir === 'asc' ? <span className="text-primary-600 ml-1">↑</span> : <span className="text-primary-600 ml-1">↓</span>;
    };

    const handleOpenModal = (expense = null) => {
        if (expense) {
            setEditingExpense(expense);
            setFormData({
                description: expense.description,
                amount: expense.amount,
                due_date: expense.due_date ? expense.due_date.split('T')[0] : '',
                expense_type_id: expense.expense_type_id,
                status: expense.status
            });
        } else {
            setEditingExpense(null);
            setFormData({
                description: '',
                amount: '',
                due_date: '',
                expense_type_id: types[0]?.id || '',
                status: 'pending'
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Deseja excluir esta despesa?')) {
            try {
                await axios.delete(`/api/v1/finance/expenses/${id}`);
                fetchExpenses();
            } catch (error) {
                alert('Erro ao excluir despesa.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingExpense) {
                await axios.put(`/api/v1/finance/expenses/${editingExpense.id}`, formData);
            } else {
                await axios.post('/api/v1/finance/expenses', formData);
            }
            setIsModalOpen(false);
            fetchExpenses();
        } catch (error) {
            alert('Erro ao salvar despesa.');
        }
    };

    const statusBadge = (status) => {
        const styles = {
            paid: 'bg-emerald-100 text-emerald-700',
            pending: 'bg-amber-100 text-amber-700',
            cancelled: 'bg-rose-100 text-rose-700'
        };
        const labels = {
            paid: 'Pago',
            pending: 'Pendente',
            cancelled: 'Cancelado'
        };
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap inline-block shadow-sm ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{labels[status] || status}</span>;
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Controle de Despesas</h1>
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
                            + Nova Despesa
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full min-w-[750px] text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('due_date')}>
                                    Vencimento <SortIcon field="due_date" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('description')}>
                                    Descrição <SortIcon field="description" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('type.name')}>
                                    Categoria <SortIcon field="type.name" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                                    Status <SortIcon field="status" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('amount')}>
                                    Valor <SortIcon field="amount" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : expenses.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-xs text-slate-500">Nenhuma despesa registrada.</td></tr>
                            ) : expenses.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                                    <td className="px-4 py-3 font-mono text-slate-500 font-bold uppercase whitespace-nowrap">{formatDate(e.due_date)}</td>
                                    <td className="px-4 py-3 font-bold text-slate-800 uppercase whitespace-nowrap">{e.description}</td>
                                    <td className="px-4 py-3 whitespace-nowrap"><span className="text-slate-500 uppercase text-[10px] font-bold">{e.type?.name}</span></td>
                                    <td className="px-4 py-3 whitespace-nowrap">{statusBadge(e.status)}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-900 text-xs whitespace-nowrap">R$ {parseFloat(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button onClick={() => setViewingExpense(e)} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-blue-100 transition-colors">Visualizar</button>
                                            <button onClick={() => handleOpenModal(e)} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200 transition-colors">Editar</button>
                                            <button onClick={() => handleDelete(e.id)} className="bg-red-50 text-red-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-red-100 transition-colors">Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination meta={meta} onPageChange={fetchExpenses} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 font-bold text-slate-800">
                            {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Descrição</label>
                                <input type="text" required className="w-full border-slate-200 rounded-lg" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Valor</label>
                                    <input type="number" step="0.01" required className="w-full border-slate-200 rounded-lg" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Vencimento</label>
                                    <input type="date" required className="w-full border-slate-200 rounded-lg" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tipo de Despesa</label>
                                <select required className="w-full border-slate-200 rounded-lg" value={formData.expense_type_id} onChange={(e) => setFormData({...formData, expense_type_id: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Status</label>
                                <select className="w-full border-slate-200 rounded-lg" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago</option>
                                    <option value="cancelled">Cancelado</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingExpense} 
                onClose={() => setViewingExpense(null)} 
                title="Detalhes da Despesa" 
                data={viewingExpense} 
                fields={[
                    { key: 'description', label: 'Descrição' },
                    { key: 'amount', label: 'Valor', format: (val) => `R$ ${parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                    { key: 'due_date', label: 'Vencimento', format: (val) => formatDate(val) },
                    { key: 'type.name', label: 'Tipo de Despesa', format: (_, data) => data?.type?.name || 'N/A' },
                    { key: 'status', label: 'Status', render: (val) => statusBadge(val) }
                ]}
            />
        </div>
    );
};

export default ExpenseList;
