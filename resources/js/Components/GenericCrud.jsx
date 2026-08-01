import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../Contexts/NotificationContext';
import Pagination from './Pagination';
import ViewModal from './Modals/ViewModal';

const GenericCrud = ({ title, apiUrl, columns }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingItem, setViewingItem] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const { notify } = useNotification();

    const fetchItems = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const separator = apiUrl.includes('?') ? '&' : '?';
            let url = `${apiUrl}${separator}page=${page}&sort_by=${sortField}&sort_direction=${direction}`;
            if (searchTerm) {
                url += `&search=${searchTerm}`;
            }
            const response = await axios.get(url);
            
            if (response.data.data && Array.isArray(response.data.data)) {
                setItems(response.data.data);
                setMeta(response.data);
            } else {
                setItems(Array.isArray(response.data) ? response.data : []);
                setMeta(null);
            }
        } catch (error) {
            console.error(`Erro ao buscar ${title}:`, error);
            notify('error', `Não foi possível carregar os registros de ${title}.`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchItems(1, search, sortBy, sortDir);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, apiUrl, sortBy, sortDir]);

    const handleSort = (key) => {
        if (sortBy === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <svg className="w-3 h-3 ml-1 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>;
        return sortDir === 'asc' 
            ? <svg className="w-3 h-3 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 11l5-5m0 0l5 5m-5-5v12"/></svg>
            : <svg className="w-3 h-3 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 13l-5 5m0 0l-5-5m5 5V6"/></svg>;
    };

    useEffect(() => {
        // Inicializa formData com as colunas
        const initialForm = {};
        columns.forEach(col => initialForm[col.key] = col.defaultValue ?? '');
        setFormData(initialForm);
    }, [apiUrl]);

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            const editData = {};
            columns.forEach(col => editData[col.key] = item[col.key] || '');
            setFormData(editData);
        } else {
            setEditingItem(null);
            const initialForm = {};
            columns.forEach(col => initialForm[col.key] = col.defaultValue ?? '');
            setFormData(initialForm);
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm(`Excluir este item de ${title}?`)) {
            try {
                await axios.delete(`${apiUrl}/${id}`);
                notify('success', 'Registro removido com sucesso.');
                fetchItems();
            } catch (error) {
                notify('error', 'Ocorreu um erro ao tentar excluir o registro.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await axios.put(`${apiUrl}/${editingItem.id}`, formData);
                notify('success', 'As alterações foram salvas com sucesso.');
            } else {
                await axios.post(apiUrl, formData);
                notify('success', 'Novo registro criado com sucesso.');
            }
            setIsModalOpen(false);
            fetchItems();
        } catch (error) {
            notify('error', 'Erro ao salvar. Verifique se os dados são válidos.');
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">{title}</h1>
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
                            + Novo Registro
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {columns.map(col => (
                                    <th 
                                        key={col.key} 
                                        className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => handleSort(col.key)}
                                    >
                                        <div className="flex items-center">
                                            {col.label}
                                            <SortIcon field={col.key} />
                                        </div>
                                    </th>
                                ))}
                                <th className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={columns.length + 1} className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={columns.length + 1} className="text-center py-8 text-xs text-slate-500">Nenhum registro encontrado.</td></tr>
                            ) : items.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    {columns.map(col => (
                                        <td key={col.key} className="px-4 py-2 text-xs text-slate-700">
                                            {col.render ? col.render(item[col.key], item) : item[col.key]}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2 text-xs">
                                        <div className="flex gap-2">
                                            <button onClick={() => setViewingItem(item)} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-blue-100">Visualizar</button>
                                            <button onClick={() => handleOpenModal(item)} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200">Editar</button>
                                            <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-red-100">Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination meta={meta} onPageChange={fetchItems} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 font-bold text-slate-800">
                            {editingItem ? 'Editar' : 'Novo'} {title}
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {columns.map(col => (
                                <div key={col.key}>
                                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1">{col.label}</label>
                                    {col.type === 'textarea' ? (
                                        <textarea 
                                            className="w-full border-slate-200 rounded-lg" 
                                            rows="3"
                                            value={formData[col.key]}
                                            onChange={(e) => setFormData({...formData, [col.key]: e.target.value})}
                                        />
                                    ) : col.type === 'select' ? (
                                        <select
                                            required={col.required}
                                            className="w-full border-slate-200 rounded-lg"
                                            value={formData[col.key]}
                                            onChange={(e) => setFormData({...formData, [col.key]: col.parseValue ? col.parseValue(e.target.value) : e.target.value})}
                                        >
                                            {col.options?.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input 
                                            type="text" 
                                            required={col.required}
                                            className="w-full border-slate-200 rounded-lg" 
                                            value={formData[col.key]}
                                            onChange={(e) => setFormData({...formData, [col.key]: e.target.value})}
                                        />
                                    )}
                                </div>
                            ))}
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingItem} 
                onClose={() => setViewingItem(null)} 
                title={`Detalhes de ${title}`} 
                data={viewingItem}
                fields={columns}
            />
        </div>
    );
};

export default GenericCrud;
