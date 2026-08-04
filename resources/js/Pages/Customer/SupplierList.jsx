import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { maskCNPJ, maskPhone, unmask } from '../../utils/masks';
import { useNotification } from '../../Contexts/NotificationContext';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';

const SupplierList = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingSupplier, setViewingSupplier] = useState(null);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const { notify } = useNotification();
    const [formData, setFormData] = useState({
        name: '',
        tax_id: '',
        contact_name: '',
        contact_email: '',
        phone1: '',
        city: '',
        uf: '',
        address: '',
        notes: ''
    });

    const fetchSuppliers = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/suppliers?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setSuppliers(response.data.data);
            setMeta(response.data);
        } catch (error) {
            console.error('Erro ao buscar fornecedores:', error);
            notify('error', 'Falha ao carregar lista de fornecedores.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSuppliers(1, search, sortBy, sortDir);
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

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name,
                tax_id: maskCNPJ(supplier.tax_id),
                contact_name: supplier.contact_name || '',
                contact_email: supplier.contact_email || '',
                phone1: maskPhone(supplier.phone1 || ''),
                city: supplier.city || '',
                uf: supplier.uf || '',
                address: supplier.address || '',
                notes: supplier.notes || ''
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: '',
                tax_id: '',
                contact_name: '',
                contact_email: '',
                phone1: '',
                city: '',
                uf: '',
                address: '',
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Deseja realmente excluir este fornecedor?')) {
            try {
                await axios.delete(`/api/v1/suppliers/${id}`);
                notify('success', 'Fornecedor removido com sucesso.');
                fetchSuppliers(1, search);
            } catch (error) {
                notify('error', 'Erro ao tentar excluir the fornecedor.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            tax_id: unmask(formData.tax_id),
            phone1: unmask(formData.phone1)
        };
        try {
            if (editingSupplier) {
                await axios.put(`/api/v1/suppliers/${editingSupplier.id}`, dataToSave);
                notify('success', 'Cadastro do fornecedor atualizado.');
            } else {
                await axios.post('/api/v1/suppliers', dataToSave);
                notify('success', 'Novo fornecedor cadastrado com sucesso.');
            }
            setIsModalOpen(false);
            fetchSuppliers(1, search);
        } catch (error) {
            notify('error', 'Erro ao salvar fornecedor. Verifique os dados inseridos.');
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Gestão de Fornecedores</h1>
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
                            + Novo Fornecedor
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Fornecedor <SortIcon field="name" />
                                </th>
                                <th onClick={() => handleSort('tax_id')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    CNPJ <SortIcon field="tax_id" />
                                </th>
                                <th onClick={() => handleSort('contact_name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Contato <SortIcon field="contact_name" />
                                </th>
                                <th onClick={() => handleSort('city')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cidade/UF <SortIcon field="city" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : suppliers.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500">Nenhum fornecedor cadastrado.</td></tr>
                            ) : suppliers.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-slate-800 uppercase whitespace-nowrap">{s.name}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{maskCNPJ(s.tax_id)}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600 uppercase whitespace-nowrap">{s.contact_name}</td>
                                    <td className="px-4 py-3 text-xs text-slate-500 uppercase whitespace-nowrap">{s.city}/{s.uf}</td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button onClick={() => setViewingSupplier(s)} title="Visualizar Detalhes" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                            <button onClick={() => handleOpenModal(s)} title="Editar Fornecedor" className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 hover:text-amber-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                            <button onClick={() => handleDelete(s.id)} title="Excluir Fornecedor" className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors">
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
                    <Pagination meta={meta} onPageChange={(page) => fetchSuppliers(page, search)} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-800 text-white px-5 py-3.5 flex justify-between items-center shrink-0 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-xs font-bold">
                                    🏢
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-widest">
                                    {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                                </h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)} 
                                className="text-slate-400 hover:text-white transition text-lg font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="p-5 overflow-y-auto space-y-4 flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Nome / Razão Social *</label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-bold focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})} 
                                            placeholder="Razão social do fornecedor" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">CNPJ *</label>
                                        <input 
                                            type="text" 
                                            required 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-mono focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.tax_id} 
                                            onChange={(e) => setFormData({...formData, tax_id: maskCNPJ(e.target.value)})} 
                                            placeholder="00.000.000/0000-00" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Contato</label>
                                        <input 
                                            type="text" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-medium focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.contact_name} 
                                            onChange={(e) => setFormData({...formData, contact_name: e.target.value})} 
                                            placeholder="Nome do representante" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">E-mail do Contato</label>
                                        <input 
                                            type="email" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-medium focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.contact_email} 
                                            onChange={(e) => setFormData({...formData, contact_email: e.target.value})} 
                                            placeholder="email@exemplo.com" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Telefone</label>
                                        <input 
                                            type="text" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-medium focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.phone1} 
                                            onChange={(e) => setFormData({...formData, phone1: maskPhone(e.target.value)})} 
                                            placeholder="(00) 00000-0000" 
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Logradouro / Endereço</label>
                                        <input 
                                            type="text" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-medium focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.address} 
                                            onChange={(e) => setFormData({...formData, address: e.target.value})} 
                                            placeholder="Rua, número, bairro..." 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Cidade</label>
                                        <input 
                                            type="text" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-medium focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.city} 
                                            onChange={(e) => setFormData({...formData, city: e.target.value})} 
                                            placeholder="Cidade" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">UF</label>
                                        <input 
                                            type="text" 
                                            maxLength="2" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-mono font-bold uppercase focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.uf} 
                                            onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})} 
                                            placeholder="UF" 
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Observação</label>
                                        <textarea 
                                            rows="2" 
                                            className="w-full border-slate-200 rounded-lg text-xs py-2 font-medium resize-none focus:ring-primary-500 focus:border-primary-500" 
                                            value={formData.notes} 
                                            onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                                            placeholder="Anotações livres sobre o fornecedor..." 
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-black text-[11px] uppercase tracking-wider hover:bg-white transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-black text-[11px] uppercase tracking-wider hover:bg-primary-700 shadow-md transition transform active:scale-95"
                                >
                                    {editingSupplier ? 'Atualizar Fornecedor' : 'Salvar Fornecedor'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingSupplier} 
                onClose={() => setViewingSupplier(null)} 
                title="Detalhes do Fornecedor" 
                data={viewingSupplier} 
                fields={[
                    { key: 'name', label: 'Nome / Razão Social' },
                    { key: 'tax_id', label: 'CNPJ', format: (val) => maskCNPJ(val || '') },
                    { key: 'contact_name', label: 'Nome do Contato' },
                    { key: 'contact_email', label: 'E-mail do Contato' },
                    { key: 'phone1', label: 'Telefone', format: (val) => maskPhone(val || '') },
                    { key: 'city', label: 'Cidade' },
                    { key: 'uf', label: 'UF' },
                    { key: 'address', label: 'Logradouro' },
                    { key: 'notes', label: 'Observações' }
                ]}
            />
        </div>
    );
};

export default SupplierList;
