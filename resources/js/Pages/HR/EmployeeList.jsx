import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { maskCPF, unmask } from '../../utils/masks';
import { useNotification } from '../../Contexts/NotificationContext';
import { formatDate } from '../../utils/formatters';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';

const EmployeeList = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingEmployee, setViewingEmployee] = useState(null);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { notify } = useNotification();
    const [formData, setFormData] = useState({
        name: '',
        tax_id: '',
        role: '',
        hired_at: '',
        can_sell: false,
        is_molder: false
    });

    const fetchEmployees = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/hr/employees?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
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
        const timer = setTimeout(() => {
            fetchEmployees(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(timer);
    }, [search, sortBy, sortDir]);

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
            setFormData({
                name: employee.name,
                tax_id: maskCPF(employee.tax_id),
                role: employee.role || '',
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
                fetchEmployees(1, search);
            } catch (error) {
                notify('error', 'Ocorreu um erro ao tentar remover o funcionário.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            tax_id: unmask(formData.tax_id)
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
            fetchEmployees(1, search);
        } catch (error) {
            notify('error', 'Erro ao salvar funcionário. Verifique os dados inseridos.');
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
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
                        <button 
                            onClick={() => handleOpenModal()}
                            className="w-full md:w-auto bg-primary-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-primary-700 transition"
                        >
                            + Adicionar Funcionário
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Nome <SortIcon field="name" />
                                </th>
                                <th onClick={() => handleSort('role')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cargo <SortIcon field="role" />
                                </th>
                                <th onClick={() => handleSort('tax_id')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    CPF <SortIcon field="tax_id" />
                                </th>
                                <th onClick={() => handleSort('hired_at')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Admissão <SortIcon field="hired_at" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Permissões</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-xs text-slate-500">Nenhum funcionário cadastrado.</td></tr>
                            ) : employees.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-slate-800 uppercase whitespace-nowrap">{e.name}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600 uppercase whitespace-nowrap">{e.role}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{maskCPF(e.tax_id)}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(e.hired_at)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex justify-center gap-1 whitespace-nowrap">
                                            {e.can_sell && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-blue-100 shadow-sm">Venda</span>}
                                            {e.is_molder && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-orange-100 shadow-sm">Produção</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button onClick={() => setViewingEmployee(e)} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-blue-100 transition-colors">Visualizar</button>
                                            <button onClick={() => handleOpenModal(e)} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200 transition-colors">Editar</button>
                                            <button onClick={() => handleDelete(e.id)} className="bg-red-50 text-red-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-red-100 transition-colors">Remover</button>
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
                                <input type="text" required className="w-full border-slate-200 rounded-lg" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CPF</label>
                                    <input type="text" required className="w-full border-slate-200 rounded-lg" value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: maskCPF(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Cargo</label>
                                    <input type="text" className="w-full border-slate-200 rounded-lg" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Data de Admissão</label>
                                <input type="date" className="w-full border-slate-200 rounded-lg" value={formData.hired_at} onChange={(e) => setFormData({...formData, hired_at: e.target.value})} />
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
