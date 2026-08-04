import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';
import ProductQuickModal from '../../Components/Modals/ProductQuickModal';

const PurchasesPage = () => {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingPurchase, setViewingPurchase] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const { notify } = useNotification();

    const emptyForm = {
        supplier_id: '',
        purchase_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        items: []
    };

    // Estado para o formulário
    const [formData, setFormData] = useState(emptyForm);

    // Estado para o item sendo adicionado
    const [currentItem, setCurrentItem] = useState({
        product_id: '',
        product_name: '',
        quantity: 0,
        unit_cost: 0
    });

    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [sortBy, setSortBy] = useState('purchase_date');
    const [sortDir, setSortDir] = useState('desc');

    const fetchPurchases = async (page = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/inventory/purchases?page=${page}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setPurchases(response.data.data);
            setMeta(response.data);
        } catch (error) {
            notify('error', 'Falha ao carregar lista de compras.');
            setPurchases([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPurchases(1, search, sortBy, sortDir);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, sortBy, sortDir]);

    const handleSort = (field) => {
        const isAsc = sortBy === field && sortDir === 'asc';
        setSortBy(field);
        setSortDir(isAsc ? 'desc' : 'asc');
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-300 ml-1">↕</span>;
        return sortDir === 'asc' ? <span className="text-primary-600 ml-1">↑</span> : <span className="text-primary-600 ml-1">↓</span>;
    };

    const getUnitInfo = (calcType) => {
        const type = parseInt(calcType || 1, 10);
        switch (type) {
            case 2:
                return { short: 'm', name: 'Metro Linear', fullLabel: 'Metro Linear (m)', badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200' };
            case 3:
                return { short: 'm²', name: 'Metro Quadrado', fullLabel: 'Metro Quadrado (m²)', badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200' };
            case 1:
            default:
                return { short: 'un', name: 'Unitário', fullLabel: 'Unidade (un)', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' };
        }
    };

    const fetchInitialData = async () => {
        try {
            const [suppliersRes, productsRes] = await Promise.all([
                axios.get('/api/v1/suppliers'),
                axios.get('/api/v1/products')
            ]);
            setSuppliers(suppliersRes.data.data || suppliersRes.data);
            setProducts(productsRes.data.data || productsRes.data);
        } catch (error) {
            notify('error', 'Erro ao carregar dados auxiliares.');
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleEdit = (purchase) => {
        setEditingId(purchase.id);
        setFormData({
            supplier_id: purchase.supplier_id,
            purchase_date: purchase.purchase_date ? purchase.purchase_date.split('T')[0] : '',
            invoice_number: purchase.invoice_number,
            items: (purchase.items || []).map(item => {
                const prod = products.find(p => p.id === item.product_id) || item.product;
                return {
                    product_id: item.product_id,
                    product_name: item.product?.name || prod?.name || 'Produto',
                    calculation_type: prod?.category?.calculation_type || item.product?.category?.calculation_type || 1,
                    quantity: parseFloat(item.quantity),
                    unit_cost: parseFloat(item.unit_cost),
                    total_cost: parseFloat(item.total_cost)
                };
            })
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja realmente excluir esta nota de compra? O estoque será revertido.')) return;

        try {
            await axios.delete(`/api/v1/inventory/purchases/${id}`);
            notify('success', 'Compra excluída com sucesso!');
            fetchPurchases();
        } catch (error) {
            notify('error', 'Erro ao excluir a compra.');
        }
    };

    const handleAddItem = () => {
        if (!currentItem.product_id || currentItem.quantity <= 0 || currentItem.unit_cost <= 0) {
            notify('warning', 'Informe produto, quantidade e valor válidos.');
            return;
        }

        // Regra Legada: Verifica se o produto já está na lista
        if (formData.items.find(i => i.product_id === currentItem.product_id)) {
            notify('error', 'O Produto informado já consta nesta nota!');
            return;
        }

        const selectedProduct = products.find(p => p.id == currentItem.product_id);

        setFormData({
            ...formData,
            items: [...formData.items, { 
                ...currentItem, 
                calculation_type: selectedProduct?.category?.calculation_type || 1,
                total_cost: currentItem.quantity * currentItem.unit_cost 
            }]
        });

        setCurrentItem({ product_id: '', product_name: '', quantity: 0, unit_cost: 0 });
    };

    const selectedProduct = products.find(p => p.id == currentItem.product_id);
    const currentUnitInfo = getUnitInfo(selectedProduct?.category?.calculation_type);

    const handleRemoveItem = (productId) => {
        setFormData({
            ...formData,
            items: formData.items.filter(i => i.product_id !== productId)
        });
    };

    const handleEditItem = (item) => {
        // Remove da lista e joga de volta para o formulário de inclusão
        setFormData({
            ...formData,
            items: formData.items.filter(i => i.product_id !== item.product_id)
        });
        setCurrentItem({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_cost: item.unit_cost
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.supplier_id || formData.items.length === 0) {
            notify('error', 'Selecione um fornecedor e adicione ao menos um item.');
            return;
        }

        try {
            const totalAmount = formData.items.reduce((acc, item) => acc + item.total_cost, 0);
            const dataToSend = { ...formData, total_amount: totalAmount };
            
            if (editingId) {
                await axios.put(`/api/v1/inventory/purchases/${editingId}`, dataToSend);
                notify('success', 'Nota de compra atualizada com sucesso!');
            } else {
                await axios.post('/api/v1/inventory/purchases', dataToSend);
                notify('success', 'Nota de compra cadastrada com sucesso!');
            }
            
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(emptyForm);
            fetchPurchases();
        } catch (error) {
            notify('error', 'Erro ao gravar a nota de compra.');
        }
    };

    return (
        <>
            <div className="max-w-[1400px] mx-auto space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                        <h1 className="text-xs font-black uppercase tracking-widest">SCR-009: Entrada de Compras</h1>
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
                                onClick={() => {
                                    setEditingId(null);
                                    setFormData(emptyForm);
                                    setIsModalOpen(true);
                                }}
                                className="w-full md:w-auto bg-primary-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-primary-700 transition"
                            >
                                + Registrar Compra
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                    <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('purchase_date')}>
                                        Data <SortIcon field="purchase_date" />
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('invoice_number')}>
                                        Nota Fiscal <SortIcon field="invoice_number" />
                                    </th>
                                    <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('supplier.name')}>
                                        Fornecedor <SortIcon field="supplier.name" />
                                    </th>
                                    <th className="px-4 py-2 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('total_amount')}>
                                        Valor Total <SortIcon field="total_amount" />
                                    </th>
                                    <th className="px-4 py-2 font-bold">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic text-xs">Carregando...</td></tr>
                                ) : purchases.length === 0 ? (
                                    <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic text-xs">Nenhuma compra registrada.</td></tr>
                                ) : purchases.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 text-xs">{formatDate(p.purchase_date)}</td>
                                        <td className="px-4 py-2 text-xs font-mono">{p.invoice_number}</td>
                                        <td className="px-4 py-2 text-xs font-bold uppercase">{p.supplier?.name}</td>
                                        <td className="px-4 py-2 text-right text-xs font-bold text-primary-600">{formatCurrency(p.total_amount)}</td>
                                        <td className="px-4 py-2 text-xs whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                <button 
                                                    onClick={() => setViewingPurchase(p)}
                                                    title="Visualizar Detalhes"
                                                    className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(p)}
                                                    title="Editar Compra"
                                                    className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 hover:text-amber-800 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(p.id)}
                                                    title="Excluir Compra"
                                                    className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 hover:text-rose-800 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <Pagination meta={meta} onPageChange={fetchPurchases} />
            </div>

            {/* Modal de Registro de Compra (Fiel ao Fluxo Legado) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-800 flex justify-between items-center text-white">
                            <h3 className="text-xs font-black uppercase tracking-widest">
                                {editingId ? 'Editar Nota de Compra' : 'Registrar Nota de Compra'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors text-xl">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Cabeçalho da Nota */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded border border-slate-200">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Fornecedor</label>
                                    <select 
                                        className="w-full border-slate-200 rounded text-xs font-bold h-9"
                                        value={formData.supplier_id}
                                        onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                                    >
                                        <option value="">Selecione...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Data da Compra</label>
                                    <input 
                                        type="date" 
                                        className="w-full border-slate-200 rounded text-xs font-bold h-9"
                                        value={formData.purchase_date}
                                        onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Nº Documento / NF</label>
                                    <input 
                                        type="text" 
                                        className="w-full border-slate-200 rounded text-xs font-bold font-mono h-9"
                                        value={formData.invoice_number}
                                        onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Adicionar Itens */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Adicionar Itens</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-indigo-50/30 p-4 rounded border border-indigo-100">
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold text-indigo-700 mb-1 uppercase">Produto</label>
                                        <div className="flex gap-1.5 items-center">
                                            <select 
                                                className="w-full border-indigo-200 rounded text-xs h-9 font-bold"
                                                value={currentItem.product_id}
                                                onChange={(e) => {
                                                    const p = products.find(x => x.id == e.target.value);
                                                    setCurrentItem({
                                                        ...currentItem, 
                                                        product_id: e.target.value, 
                                                        product_name: p?.name || '',
                                                        unit_cost: parseFloat(p?.unit_price || currentItem.unit_cost || 0)
                                                    });
                                                }}
                                            >
                                                <option value="">Selecione...</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setIsProductModalOpen(true)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 h-9 rounded text-[10px] font-black uppercase tracking-tight transition shrink-0 shadow-sm flex items-center justify-center"
                                                title="Cadastrar ou Pesquisar Produto no Catalogo"
                                            >
                                                + Novo
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-indigo-700 mb-1 uppercase flex items-center justify-between">
                                            <span>Quantidade</span>
                                            {selectedProduct && (
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${currentUnitInfo.badgeClass}`}>
                                                    {currentUnitInfo.fullLabel}
                                                </span>
                                            )}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" step="0.01"
                                                className="w-full border-indigo-200 rounded text-xs h-9 font-bold pr-8"
                                                value={currentItem.quantity}
                                                onChange={(e) => setCurrentItem({...currentItem, quantity: parseFloat(e.target.value)})}
                                            />
                                            {selectedProduct && (
                                                <span className="absolute right-2.5 top-2.5 text-[10px] font-black text-slate-400 uppercase pointer-events-none">
                                                    {currentUnitInfo.short}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-indigo-700 mb-1 uppercase">Valor Unitário</label>
                                        <input 
                                            type="number" step="0.001"
                                            className="w-full border-indigo-200 rounded text-xs h-9"
                                            value={currentItem.unit_cost}
                                            onChange={(e) => setCurrentItem({...currentItem, unit_cost: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={handleAddItem}
                                        className="bg-indigo-600 text-white h-9 rounded font-black text-[10px] uppercase tracking-tighter hover:bg-indigo-700 transition shadow-lg shadow-indigo-900/20"
                                    >
                                        ADICIONAR ITEM
                                    </button>
                                </div>
                            </div>

                            {/* Lista de Itens Adicionados */}
                            <div className="border rounded overflow-hidden border-slate-200">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                            <th className="px-4 py-2">Produto</th>
                                            <th className="px-4 py-2 text-right">Qtd. / Unidade</th>
                                            <th className="px-4 py-2 text-right">Valor Unit.</th>
                                            <th className="px-4 py-2 text-right">Total</th>
                                            <th className="px-4 py-2 text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {formData.items.length === 0 ? (
                                            <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic text-xs">Nenhum item adicionado à nota ainda.</td></tr>
                                        ) : formData.items.map(item => (
                                            <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2 text-xs font-bold uppercase">{item.product_name}</td>
                                                <td className="px-4 py-2 text-right font-mono text-xs">
                                                    <span className="font-bold">{item.quantity.toFixed(2)}</span>
                                                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${getUnitInfo(item.calculation_type).badgeClass}`}>
                                                        {getUnitInfo(item.calculation_type).short}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono text-xs text-slate-500">{formatCurrency(item.unit_cost)}</td>
                                                <td className="px-4 py-2 text-right font-black text-primary-600 font-mono text-xs">{formatCurrency(item.total_cost)}</td>
                                                <td className="px-4 py-2 text-center flex justify-center gap-2">
                                                    <button 
                                                        onClick={() => handleEditItem(item)} 
                                                        className="text-primary-600 hover:text-primary-800"
                                                        title="Editar Item"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveItem(item.product_id)} 
                                                        className="text-rose-500 hover:text-rose-700"
                                                        title="Remover Item"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {formData.items.length > 0 && (
                                        <tfoot className="bg-slate-50 font-black border-t-2 border-slate-200">
                                            <tr>
                                                <td className="px-4 py-3 text-right uppercase text-[10px] text-slate-500" colSpan="3">Valor Total da Nota:</td>
                                                <td className="px-4 py-3 text-right text-sm text-primary-700">
                                                    {formatCurrency(formData.items.reduce((acc, i) => acc + i.total_cost, 0))}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded font-black text-[10px] uppercase tracking-widest hover:bg-white transition"
                            >
                                CANCELAR
                            </button>
                            <button 
                                type="button" 
                                onClick={handleSubmit}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-900/20 transition transform active:scale-95"
                            >
                                {editingId ? 'ATUALIZAR NOTA DE COMPRA' : 'GRAVAR NOTA DE COMPRA'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingPurchase} 
                onClose={() => setViewingPurchase(null)} 
                title="Detalhes da Compra" 
                data={viewingPurchase} 
                fields={[
                    { key: 'purchase_date', label: 'Data da Compra', format: (val) => formatDate(val) },
                    { key: 'invoice_number', label: 'Nota Fiscal' },
                    { key: 'supplier', label: 'Fornecedor', format: (sup) => sup ? sup.name : 'N/A' },
                    { key: 'total_amount', label: 'Valor Total', format: (val) => formatCurrency(val) },
                    { key: 'items', label: 'Itens', format: (items) => (
                        <div className="mt-2 space-y-1">
                            {items && items.map((item, i) => {
                                const unit = getUnitInfo(item.product?.category?.calculation_type || item.calculation_type);
                                return (
                                    <div key={i} className="text-xs flex justify-between items-center border-b border-slate-100 pb-1">
                                        <span className="flex items-center gap-1.5">
                                            <strong className="font-mono">{parseFloat(item.quantity).toFixed(2)} {unit.short}</strong>
                                            <span className="text-slate-800 font-bold">{item.product?.name || 'Produto'}</span>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${unit.badgeClass}`}>
                                                {unit.name}
                                            </span>
                                        </span>
                                        <span className="font-mono text-slate-600 font-bold">{formatCurrency(item.total_cost)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                ]}
            />

            <ProductQuickModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                defaultTab="register"
                onProductSelected={(prod) => {
                    setProducts(prev => {
                        const exists = prev.find(p => p.id === prod.id);
                        return exists ? prev : [...prev, prod];
                    });
                    setCurrentItem(prev => ({
                        ...prev,
                        product_id: prod.id,
                        product_name: prod.name || '',
                        unit_cost: parseFloat(prod.unit_price || 0)
                    }));
                }}
            />
        </>
    );
};

export default PurchasesPage;
