import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { maskCPFCNPJ, maskPhone, maskCEP } from '../../utils/masks';
import CustomerForm from './CustomerForm';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';

const CustomerList = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const fetchCustomers = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/customers?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setCustomers(response.data.data);
            setMeta(response.data);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers(1, search, sortBy, sortDir);
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

    const handleOpenModal = (customer = null) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Deseja realmente excluir este cliente?')) {
            try {
                await axios.delete(`/api/v1/customers/${id}`);
                fetchCustomers(1, search);
            } catch (error) {
                alert('Erro ao excluir cliente.');
            }
        }
    };

    const handleSaved = () => {
        setIsModalOpen(false);
        fetchCustomers(1, search);
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Gestão de Clientes</h1>
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
                            + Novo Cliente
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cliente <SortIcon field="name" />
                                </th>
                                <th onClick={() => handleSort('tax_id')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    CPF/CNPJ <SortIcon field="tax_id" />
                                </th>
                                <th onClick={() => handleSort('phone')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Contato <SortIcon field="phone" />
                                </th>
                                <th onClick={() => handleSort('city')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cidade/UF <SortIcon field="city" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500 italic">Carregando clientes...</td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500">Nenhum cliente encontrado.</td></tr>
                            ) : customers.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-slate-800 uppercase whitespace-nowrap">{c.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{maskCPFCNPJ(c.tax_id)}</td>
                                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 whitespace-nowrap">{maskPhone(c.phone || '') || '-'}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600 uppercase whitespace-nowrap">{c.city}/{c.uf}</td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button onClick={() => setViewingCustomer(c)} title="Visualizar Detalhes" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                            <button onClick={() => handleOpenModal(c)} title="Editar Cliente" className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 hover:text-amber-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} title="Excluir Cliente" className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors">
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
                    <Pagination meta={meta} onPageChange={(page) => fetchCustomers(page, search)} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex justify-between items-center z-10">
                            <h3 className="text-lg font-bold">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <CustomerForm 
                            customer={editingCustomer} 
                            onSaved={handleSaved} 
                            onCancel={() => setIsModalOpen(false)}
                            embedded={true}
                        />
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingCustomer} 
                onClose={() => setViewingCustomer(null)} 
                title="Detalhes do Cliente" 
                data={viewingCustomer} 
                fields={[
                    { key: 'name', label: 'Nome Completo' },
                    { key: 'tax_id', label: 'CPF/CNPJ', format: (val) => maskCPFCNPJ(val || '') },
                    { key: 'email', label: 'E-mail de Contato' },
                    { key: 'phone', label: 'Telefone de Contato', format: (val) => maskPhone(val || '') },
                    { key: 'cep', label: 'CEP', format: (val) => maskCEP(val || '') },
                    { key: 'uf', label: 'UF' },
                    { key: 'city', label: 'Cidade' },
                    { key: 'address', label: 'Logradouro' },
                    { key: 'notes', label: 'Observação' }
                ]}
            />
        </div>
    );
};

export default CustomerList;
