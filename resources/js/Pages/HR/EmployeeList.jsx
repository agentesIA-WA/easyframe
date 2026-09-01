import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { maskCPF, unmask } from '../../utils/masks';
import { useNotification } from '../../Contexts/NotificationContext';
import { formatDate } from '../../utils/formatters';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { notify } = useNotification();
    const [formData, setFormData] = useState({
        name: '',
        tax_id: '',
        role: '',
        store_id: '',
        store_ids: [],
        hired_at: '',
        can_sell: false,
        is_molder: false
    });

    const fetchStores = async () => {
        try {
            const response = await axios.get('/api/v1/core/stores');
            if (Array.isArray(response.data)) {
                setStores(response.data);
            }
        } catch (error) {
            console.error('Erro ao buscar lojas:', error);
        }
    };

    const fetchEmployees = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir, incDeleted = includeDeleted) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/hr/employees?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}&include_deleted=${incDeleted}`);
            setEmployees(response.data.data);
            setMeta(response.data);
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
            notify('error', 'Não foi possível carregar a lista de funcionários.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployees(1, search, sortBy, sortDir, includeDeleted);
        }, 500);

        return () => clearTimeout(timer);
    }, [search, sortBy, sortDir, includeDeleted]);

    const handleSort = (field) => {
        const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(field);
        setSortDir(newDir);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-300 ml-1">⇅</span>;
        return sortDir === 'asc' ? <span className="text-primary-600 ml-1">↑</span> : <span className="text-primary-600 ml-1">↓</span>;
    };

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            const initialStoreIds = employee.stores && employee.stores.length > 0 
                ? employee.stores.map(s => Number(s.id)) 
                : (employee.store_id ? [Number(employee.store_id)] : []);
            setFormData({
                name: employee.name,
                tax_id: maskCPF(employee.tax_id),
                role: employee.role || '',
                store_id: employee.store_id || '',
                store_ids: initialStoreIds,
                hired_at: employee.hired_at ? employee.hired_at.split('T')[0] : '',
                can_sell: !!employee.can_sell,
                is_molder: !!employee.is_molder
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                name: '',
                tax_id: '',
                role: '',
                store_id: stores.length > 0 ? Number(stores[0].id) : '',
                store_ids: stores.map(s => Number(s.id)),
                hired_at: '',
                can_sell: false,
                is_molder: false
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Deseja realmente remover este funcionário?')) {
            try {
                await axios.delete(`/api/v1/hr/employees/${id}`);
                notify('success', 'Funcionário removido com sucesso.');
                fetchEmployees(1, search, sortBy, sortDir, includeDeleted);
            } catch (error) {
                notify('error', 'Ocorreu um erro ao tentar remover o funcionário.');
            }
        }
    };

    const handleRestore = async (id) => {
        if (confirm('Deseja restaurar este funcionário?')) {
            try {
                await axios.put(`/api/v1/hr/employees/${id}/restore`);
                notify('success', 'Funcionário restaurado com sucesso.');
                fetchEmployees(1, search, sortBy, sortDir, includeDeleted);
            } catch (error) {
                notify('error', 'Ocorreu um erro ao tentar restaurar o funcionário.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            tax_id: unmask(formData.tax_id),
            store_ids: formData.store_ids,
            store_id: formData.store_ids && formData.store_ids.length > 0 ? formData.store_ids[0] : null
        };
        try {
            if (editingEmployee) {
                await axios.put(`/api/v1/hr/employees/${editingEmployee.id}`, dataToSave);
                notify('success', 'Cadastro atualizado com sucesso.');
            } else {
                await axios.post('/api/v1/hr/employees', dataToSave);
                notify('success', 'Novo funcionário cadastrado.');
            }
            setIsModalOpen(false);
            fetchEmployees(1, search, sortBy, sortDir, includeDeleted);
        } catch (error) {
            if (error.response && error.response.status === 422 && error.response.data && error.response.data.errors) {
                const errorMessages = Object.values(error.response.data.errors).flat();
                errorMessages.forEach(msg => notify('error', msg));
            } else {
                notify('error', 'Erro ao salvar funcionário. Verifique os dados inseridos.');
            }
        }
    };

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Gestão de RH (Funcionários)</h1>
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
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition-colors bg-slate-700/50 px-3 py-1.5 rounded border border-slate-600">
                            <input 
                                type="checkbox" 
                                checked={includeDeleted} 
                                onChange={(e) => setIncludeDeleted(e.target.checked)} 
                                className="rounded bg-slate-800 border-slate-500 text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-800 h-3.5 w-3.5"
                            />
                            Mostrar Inativos
                        </label>
                        <button 
                            onClick={() => handleOpenModal()}
                            className="w-full md:w-auto bg-primary-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-primary-700 transition"
                        >
                            + Adicionar Funcionário
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full text-left border-collapse table-auto">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Nome <SortIcon field="name" />
                                </th>
                                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    Unidade / Loja
                                </th>
                                <th onClick={() => handleSort('role')} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cargo <SortIcon field="role" />
                                </th>
                                <th onClick={() => handleSort('tax_id')} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    CPF <SortIcon field="tax_id" />
                                </th>
                                <th onClick={() => handleSort('hired_at')} className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Admissão <SortIcon field="hired_at" />
                                </th>
                                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Permissões</th>
                                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-8 text-xs text-slate-500">Nenhum funcionário cadastrado.</td></tr>
                            ) : employees.map(e => (
                                <tr key={e.id} className={`transition-colors ${e.deleted_at ? 'bg-red-50/50 hover:bg-red-50 opacity-80' : 'hover:bg-slate-50/80'}`}>
                                    <td className="px-3 py-2.5 text-xs font-bold text-slate-800 uppercase min-w-[130px] max-w-[200px] truncate" title={e.name}>
                                        <div className="flex items-center gap-2">
                                            {e.name}
                                            {e.deleted_at && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">Inativo</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs min-w-[150px] max-w-[260px]">
                                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                                            {e.stores && e.stores.length > 0 ? (
                                                e.stores.map(s => (
                                                    <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                                                        🏢 {s.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                                    🏢 {e.store?.name || 'Matriz / Geral'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-slate-600 uppercase min-w-[100px] max-w-[160px] truncate" title={e.role}>{e.role}</td>
                                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">{maskCPF(e.tax_id)}</td>
                                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(e.hired_at)}</td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                        <div className="flex justify-center gap-1 whitespace-nowrap">
                                            {e.can_sell && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-blue-100 shadow-sm">Venda</span>}
                                            {e.is_molder && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-orange-100 shadow-sm">Produção</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                                            <button onClick={() => setViewingEmployee(e)} title="Visualizar Detalhes" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                            {!e.deleted_at ? (
                                                <>
                                                    <button onClick={() => handleOpenModal(e)} title="Editar Funcionário" className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 hover:text-amber-800 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(e.id)} title="Excluir Funcionário" className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => handleRestore(e.id)} title="Restaurar Funcionário" className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 hover:text-emerald-800 transition-colors flex items-center gap-1 font-bold">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination meta={meta} onPageChange={(page) => fetchEmployees(page, search)} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome Completo</label>
                                <input type="text" required className="w-full border-slate-200 rounded-lg text-sm" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Unidades de Atuação (Lojas)</label>
                                <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                                    {stores.map(store => {
                                        const storeIdNum = Number(store.id);
                                        const isChecked = formData.store_ids?.some(id => Number(id) === storeIdNum);
                                        return (
                                            <label key={store.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        const currentIds = (formData.store_ids || []).map(Number);
                                                        const newStoreIds = e.target.checked
                                                            ? [...new Set([...currentIds, storeIdNum])]
                                                            : currentIds.filter(id => id !== storeIdNum);
                                                        setFormData({
                                                            ...formData,
                                                            store_ids: newStoreIds,
                                                            store_id: newStoreIds[0] || ''
                                                        });
                                                    }}
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span>🏢 {store.name} {store.code ? `(${store.code})` : ''}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CPF</label>
                                    <input type="text" required className="w-full border-slate-200 rounded-lg text-sm" value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: maskCPF(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Cargo</label>
                                    <input type="text" className="w-full border-slate-200 rounded-lg text-sm" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Data de Admissão</label>
                                <input type="date" className="w-full border-slate-200 rounded-lg text-sm" value={formData.hired_at} onChange={(e) => setFormData({...formData, hired_at: e.target.value})} />
                            </div>
                            <div className="flex gap-6 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" checked={formData.can_sell} onChange={(e) => setFormData({...formData, can_sell: e.target.checked})} />
                                    <span className="text-sm font-medium text-slate-700">Pode Realizar Vendas</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" checked={formData.is_molder} onChange={(e) => setFormData({...formData, is_molder: e.target.checked})} />
                                    <span className="text-sm font-medium text-slate-700">É Moldurista</span>
                                </label>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-lg">Salvar Funcionário</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingEmployee} 
                onClose={() => setViewingEmployee(null)} 
                title="Detalhes do Funcionário" 
                data={viewingEmployee} 
                fields={[
                    { key: 'name', label: 'Nome Completo' },
                    { key: 'stores', label: 'Unidades de Atuação', format: (val, row) => row?.stores?.length ? row.stores.map(s => s.name).join(', ') : (row?.store?.name || 'Matriz / Geral') },
                    { key: 'tax_id', label: 'CPF', format: (val) => maskCPF(val || '') },
                    { key: 'role', label: 'Cargo' },
                    { key: 'hired_at', label: 'Data de Admissão', format: (val) => formatDate(val) },
                    { key: 'can_sell', label: 'Pode Realizar Vendas', format: (val) => val ? 'Sim' : 'Não' },
                    { key: 'is_molder', label: 'É Moldurista', format: (val) => val ? 'Sim' : 'Não' }
                ]}
            />
        </div>
    );
};

export default EmployeeList;
