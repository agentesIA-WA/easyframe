import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';
import CategoryQuickModal from '../../Components/Modals/CategoryQuickModal';

const CALC_TYPES = { 1: 'Absoluto', 2: 'Linear', 3: 'M²', 4: 'Mão de Obra', 5: 'Perímetro', 6: 'Unidade' };

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const { notify } = useNotification();
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        width: 0,
        unit_price: '',
        category_id: '',
        allow_margin: false
    });
    const [categories, setCategories] = useState([]);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/v1/categories');
            const data = response.data.data || response.data;
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
        }
    };

    const getSelectedCategoryCalcType = (catId) => {
        const cat = categories.find(c => c.id == catId);
        return cat?.calculation_type || 1;
    };

    const fetchProducts = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/products?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            const data = response.data.data || response.data;
            setProducts(Array.isArray(data) ? data : []);
            setMeta(response.data.data ? response.data : null);
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            notify('error', 'Falha ao carregar a lista de produtos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, sortBy, sortDir]);

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleSort = (field) => {
        const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(field);
        setSortDir(newDir);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-300 ml-1">⇅</span>;
        return sortDir === 'asc' ? <span className="text-primary-600 ml-1">↑</span> : <span className="text-primary-600 ml-1">↓</span>;
    };

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                code: product.code,
                name: product.name,
                width: product.width || 0,
                unit_price: product.unit_price,
                category_id: product.category_id || '',
                allow_margin: !!product.allow_margin
            });
        } else {
            setEditingProduct(null);
            setFormData({
                code: '',
                name: '',
                width: 0,
                unit_price: '',
                category_id: '',
                allow_margin: false
            });
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                await axios.delete(`/api/v1/products/${id}`);
                notify('success', 'Produto removido do catálogo.');
                fetchProducts();
            } catch (error) {
                notify('error', 'Não foi possível excluir o produto.');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const unitPriceParsed = parseFloat((formData.unit_price || '0').toString().replace(',', '.'));
        const payload = {
            ...formData,
            category_id: formData.category_id || null,
            unit_price: isNaN(unitPriceParsed) ? 0 : unitPriceParsed,
            width: parseFloat(formData.width || 0),
            allow_margin: Boolean(formData.allow_margin)
        };
        try {
            if (editingProduct) {
                await axios.put(`/api/v1/products/${editingProduct.id}`, payload);
                notify('success', 'Produto atualizado com sucesso.');
            } else {
                await axios.post('/api/v1/products', payload);
                notify('success', 'Novo produto cadastrado.');
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (error) {
            console.error('Validation errors:', error.response?.data?.errors);
            const msg = error.response?.data?.message || 'Erro ao salvar produto. Verifique se o código já existe.';
            notify('error', msg);
        }
    };

    const calcTypeLabel = (type) => {
        return CALC_TYPES[type] || 'Outro';
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">Catálogo de Produtos</h1>
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
                            + Novo Produto
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('code')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Código <SortIcon field="code" />
                                </th>
                                <th onClick={() => handleSort('name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Nome do Produto <SortIcon field="name" />
                                </th>
                                <th onClick={() => handleSort('calculation_type')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cálculo <SortIcon field="calculation_type" />
                                </th>
                                <th onClick={() => handleSort('unit_price')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                    Preço Un. <SortIcon field="unit_price" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500 italic">Carregando...</td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-xs text-slate-500">Nenhum produto cadastrado.</td></tr>
                            ) : products.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500 font-bold whitespace-nowrap">{p.code}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-slate-800 uppercase whitespace-nowrap">{p.name}</td>
                                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{calcTypeLabel(p.category?.calculation_type || 1)}</td>
                                    <td className="px-4 py-3 text-right font-black text-slate-900 text-xs whitespace-nowrap">R$ {parseFloat(p.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button onClick={() => setViewingProduct(p)} title="Visualizar Detalhes" className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                            <button onClick={() => handleOpenModal(p)} title="Editar Produto" className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 hover:text-amber-800 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} title="Excluir Produto" className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors">
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
                    <Pagination meta={meta} onPageChange={fetchProducts} />
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Código</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border-slate-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
                                    value={formData.code}
                                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Nome</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full border-slate-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Preço Unitário</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    className="w-full border-slate-200 rounded-lg focus:ring-primary-500 focus:border-primary-500" 
                                    value={formData.unit_price}
                                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Categoria</label>
                                <div className="flex gap-1.5 items-center">
                                    <select 
                                        className="w-full border-slate-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 h-10 font-bold text-sm"
                                        value={formData.category_id}
                                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                                    >
                                        <option value="">Nenhuma Categoria</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name} — {calcTypeLabel(cat.calculation_type)}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setIsCategoryModalOpen(true)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 h-10 rounded-lg text-[11px] font-black uppercase tracking-tighter transition shrink-0 shadow-sm flex items-center justify-center gap-1"
                                        title="Criar Nova Categoria Rápida"
                                    >
                                        + Nova
                                    </button>
                                </div>
                            </div>

                            {getSelectedCategoryCalcType(formData.category_id) === 2 && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold uppercase text-primary-600 mb-1 tracking-widest">Largura da Moldura (cm)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        className="w-full border-primary-100 bg-primary-50/30 rounded-lg focus:ring-primary-500 focus:border-primary-500 font-bold" 
                                        value={formData.width}
                                        onChange={(e) => setFormData({...formData, width: e.target.value})}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold italic">Usado para calcular o acréscimo no perímetro</p>
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 mt-2">
                                <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/70 transition-all select-none shadow-2xs">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
                                        checked={formData.allow_margin}
                                        onChange={(e) => setFormData({...formData, allow_margin: e.target.checked})}
                                    />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex flex-col">
                                        Permite indicação de margem no orçamento
                                        <span className="text-[10px] font-medium text-slate-400 normal-case">Exibirá o campo para digitação de centímetros na tabela de composição</span>
                                    </span>
                                </label>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-lg">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingProduct} 
                onClose={() => setViewingProduct(null)} 
                title="Detalhes do Produto" 
                data={viewingProduct} 
                fields={[
                    { key: 'code', label: 'Código do Produto' },
                    { key: 'name', label: 'Nome do Produto' },
                    { key: 'category', label: 'Categoria', format: (cat) => cat ? cat.name : 'N/A' },
                    { key: 'width', label: 'Largura Padrão (cm)' },
                    { key: 'allow_margin', label: 'Permite Margem no Orçamento', format: (val) => val ? 'Sim (Habilitado)' : 'Não (Desabilitado)' },
                    { key: 'unit_price', label: 'Preço de Venda', format: (val) => `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` }
                ]}
            />

            <CategoryQuickModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onCategorySelected={(newCat) => {
                    setCategories(prev => {
                        const exists = prev.find(c => c.id === newCat.id);
                        return exists ? prev : [...prev, newCat];
                    });
                    setFormData(prev => ({
                        ...prev,
                        category_id: newCat.id
                    }));
                }}
            />
        </div>
    );
};

export default ProductList;
