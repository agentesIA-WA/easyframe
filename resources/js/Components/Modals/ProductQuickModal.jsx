import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import CategoryQuickModal from './CategoryQuickModal';

const ProductQuickModal = ({ isOpen, onClose, onProductSelected, defaultTab = 'search' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab); // 'search' | 'register'
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const searchRef = useRef(null);
    const { notify } = useNotification();

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        unit_price: '',
        width: 0,
        category_id: '',
        allow_margin: false
    });

    // Carrega produtos e categorias ao abrir
    useEffect(() => {
        if (isOpen) {
            setActiveTab(defaultTab);
            setSearchTerm('');
            fetchProducts();
            fetchCategories();
            resetForm();
            setTimeout(() => searchRef.current?.focus(), 200);
        }
    }, [isOpen]);

    // Filtragem local conforme digita
    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults(allProducts);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = allProducts.filter(p =>
            p.name?.toLowerCase().includes(term) ||
            p.code?.toLowerCase().includes(term)
        );
        setResults(filtered);
    }, [searchTerm, allProducts]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/products');
            const data = response.data.data || response.data;
            const list = Array.isArray(data) ? data : [];
            setAllProducts(list);
            setResults(list);
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get('/api/v1/categories');
            const data = response.data.data || response.data;
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            unit_price: '',
            width: 0,
            category_id: '',
            allow_margin: false
        });
    };

    const getSelectedCategoryCalcType = (catId) => {
        const cat = categories.find(c => c.id == catId);
        return cat?.calculation_type || 1;
    };

    const handleSelect = (product) => {
        onProductSelected(product);
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const selectedCalcType = getSelectedCategoryCalcType(formData.category_id);
            const unitPriceParsed = parseFloat((formData.unit_price || '0').toString().replace(',', '.'));
            const payload = {
                ...formData,
                width: selectedCalcType === 2 ? parseFloat(formData.width || 0) : 0,
                unit_price: isNaN(unitPriceParsed) ? 0 : unitPriceParsed,
                category_id: formData.category_id || null,
                allow_margin: Boolean(formData.allow_margin)
            };
            const response = await axios.post('/api/v1/products', payload);
            const savedProduct = response.data;
            notify('success', 'Material cadastrado e selecionado com sucesso!');
            onProductSelected(savedProduct);
            onClose();
        } catch (error) {
            console.error('Erro ao criar produto:', error);
            console.error('Validation errors:', error.response?.data?.errors);
            const msg = error.response?.data?.message || 'Erro ao cadastrar material. Verifique se o código já está em uso.';
            notify('error', msg);
        } finally {
            setLoading(false);
        }
    };

    const calcTypeLabel = (type) => {
        const types = { 1: 'Absoluto', 2: 'Linear', 3: 'M²', 4: 'Legado: M² Área' };
        return types[type] || 'Outro';
    };

    const calcTypeLabelForCategory = (catId) => {
        return calcTypeLabel(getSelectedCategoryCalcType(catId));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* HEADER */}
                <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-widest">Selecionar Material / Insumo</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition text-lg font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 shrink-0">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                            ${activeTab === 'search' 
                                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50/50' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Pesquisar Material
                    </button>
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                            ${activeTab === 'register' 
                                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Cadastrar Novo
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {activeTab === 'search' ? (
                        <>
                            {/* SEARCH BAR */}
                            <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-slate-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 text-sm font-bold transition-all outline-none"
                                        placeholder="Digite o código ou descrição do material..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-wider">
                                    {loading ? 'Carregando catálogo...' : `${results.length} materiais encontrados`}
                                </p>
                            </div>

                            {/* RESULTS LIST */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 bg-slate-50/40">
                                {loading && initialLoad ? (
                                    <div className="text-center py-12 text-slate-400 font-bold uppercase text-xs">Carregando catálogo...</div>
                                ) : results.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400 font-bold uppercase text-xs">Nenhum material encontrado.</div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {results.map(product => (
                                            <div 
                                                key={product.id}
                                                onClick={() => handleSelect(product)}
                                                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-primary-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start gap-2">
                                                        <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-black font-mono border border-slate-200">
                                                            {product.code}
                                                        </span>
                                                        <span className="bg-primary-50 text-primary-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                                            {calcTypeLabel(product.category?.calculation_type || 1)}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-slate-800 text-sm mt-2">{product.name}</h4>
                                                    {product.category && (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block mt-1">
                                                            Cat: {product.category.name}
                                                        </span>
                                                    )}
                                                    {(product.category?.calculation_type === 2) && product.width > 0 && (
                                                        <span className="text-[10px] text-primary-600 font-bold uppercase block mt-0.5">
                                                            Largura: {product.width} cm
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                                                    <span className="text-[9px] font-black uppercase text-slate-400">Preço Base</span>
                                                    <span className="text-sm font-black text-slate-900">
                                                        R$ {parseFloat(product.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* REGISTER FORM */
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-slate-50/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Código do Material</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: MOD001"
                                        className="w-full border-slate-200 rounded-lg text-sm font-bold h-10 uppercase font-mono"
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nome / Descrição</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: Moldura Alumínio Escovado"
                                        className="w-full border-slate-200 rounded-lg text-sm font-bold h-10"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Preço Unitário (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                        className="w-full border-slate-200 rounded-lg text-sm font-bold h-10"
                                        value={formData.unit_price}
                                        onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Categoria</label>
                                    <div className="flex gap-1.5 items-center">
                                        <select
                                            className="w-full border-slate-200 rounded-lg text-sm font-bold h-10"
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
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 h-10 rounded-lg text-[10px] font-black uppercase tracking-tight transition shrink-0 shadow-sm flex items-center justify-center"
                                            title="Cadastrar Nova Categoria"
                                        >
                                            + Nova
                                        </button>
                                    </div>
                                </div>

                                {getSelectedCategoryCalcType(formData.category_id) === 2 && (
                                    <div className="md:col-span-2 bg-primary-50/30 p-3 rounded-lg border border-primary-100/60 animate-in slide-in-from-top-2">
                                        <label className="block text-[10px] font-black text-primary-700 uppercase mb-1">Largura da Moldura (cm)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Ex: 5,00"
                                            className="w-full border-primary-200 rounded-lg text-sm font-bold h-10"
                                            value={formData.width}
                                            onChange={(e) => setFormData({...formData, width: e.target.value})}
                                        />
                                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold italic">Usado para calcular o acréscimo no perímetro</p>
                                    </div>
                                )}

                                {formData.category_id && (
                                    <div className="md:col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Tipo de cálculo herdado:</span>
                                        <span className="bg-primary-100 text-primary-700 text-[10px] px-2 py-0.5 rounded font-black uppercase">
                                            {calcTypeLabelForCategory(formData.category_id)}
                                        </span>
                                    </div>
                                )}

                                <div className="md:col-span-2 pt-2 border-t border-slate-100">
                                    <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/70 transition-all select-none">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                            checked={formData.allow_margin}
                                            onChange={(e) => setFormData({...formData, allow_margin: e.target.checked})}
                                        />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight flex flex-col">
                                            Permite indicação de margem no orçamento?
                                            <span className="text-[10px] font-medium text-slate-400 normal-case">Habilita a digitação do acréscimo de medidas (cm) ao vincular o item</span>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setActiveTab('search')} 
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold text-xs uppercase hover:bg-slate-50"
                                >
                                    Voltar
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs uppercase hover:bg-emerald-700 shadow-lg"
                                >
                                    {loading ? 'Processando...' : 'Gravar e Selecionar'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

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

export default ProductQuickModal;
