import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CustomerForm from '../../Pages/Customer/CustomerForm';
import { maskCPFCNPJ } from '../../utils/masks';

const CustomerQuickModal = ({ isOpen, onClose, onCustomerSelected }) => {
    const [activeTab, setActiveTab] = useState('search'); // 'search' | 'register'
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [allCustomers, setAllCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const searchRef = useRef(null);

    // Carrega clientes ao abrir
    useEffect(() => {
        if (isOpen) {
            setActiveTab('search');
            setSearchTerm('');
            fetchCustomers();
            setTimeout(() => searchRef.current?.focus(), 200);
        }
    }, [isOpen]);

    // Filtragem local conforme digita
    useEffect(() => {
        if (!searchTerm.trim()) {
            setResults(allCustomers);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = allCustomers.filter(c =>
            c.name?.toLowerCase().includes(term) ||
            c.tax_id?.toLowerCase().includes(term) ||
            c.city?.toLowerCase().includes(term)
        );
        setResults(filtered);
    }, [searchTerm, allCustomers]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/customers?per_page=500');
            const data = response.data.data || response.data;
            const list = Array.isArray(data) ? data : [];
            setAllCustomers(list);
            setResults(list);
        } catch (error) {
            console.error('Erro ao buscar clientes:', error);
        } finally {
            setLoading(false);
            setInitialLoad(false);
        }
    };

    const handleSelect = (customer) => {
        onCustomerSelected(customer);
        onClose();
    };

    const handleCustomerCreated = (savedCustomer) => {
        if (savedCustomer) {
            onCustomerSelected(savedCustomer);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                {/* HEADER */}
                <div className="bg-slate-800 text-white px-5 py-3 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-widest">Selecionar Cliente</h2>
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
                        Pesquisar Cliente
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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
                                        placeholder="Digite o nome, CPF/CNPJ ou cidade do cliente..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
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
                                <p className="text-[10px] text-slate-400 mt-2 font-bold">
                                    {loading ? 'Carregando...' : `${results.length} cliente(s) encontrado(s)`}
                                    {searchTerm && !loading && results.length === 0 && (
                                        <span className="ml-1">
                                            — <button 
                                                onClick={() => setActiveTab('register')} 
                                                className="text-emerald-600 hover:text-emerald-700 underline"
                                            >
                                                cadastrar novo cliente
                                            </button>
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* RESULTS LIST */}
                            <div className="flex-1 overflow-y-auto">
                                {loading && initialLoad ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-600 rounded-full animate-spin"></div>
                                        <p className="text-xs text-slate-400 mt-3 font-bold uppercase">Carregando clientes...</p>
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">Nenhum cliente encontrado</p>
                                        <p className="text-xs text-slate-400 mt-1">Tente outra pesquisa ou cadastre um novo cliente</p>
                                        <button 
                                            onClick={() => setActiveTab('register')}
                                            className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-emerald-700 transition shadow-md"
                                        >
                                            + Cadastrar Novo Cliente
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {results.map(customer => (
                                            <button
                                                key={customer.id}
                                                onClick={() => handleSelect(customer)}
                                                className="w-full text-left px-5 py-3 hover:bg-primary-50 transition-colors group flex items-center gap-4"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                                                    <span className="text-sm font-black text-slate-400 group-hover:text-primary-600 transition-colors">
                                                        {customer.name?.charAt(0)?.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-700 uppercase truncate group-hover:text-primary-700 transition-colors">
                                                        {customer.name}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-0.5">
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {maskCPFCNPJ(customer.tax_id || '')}
                                                        </span>
                                                        {customer.city && (
                                                            <span className="text-[10px] text-slate-400">
                                                                {customer.city}{customer.uf ? `/${customer.uf}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[10px] font-black text-primary-600 uppercase bg-primary-50 px-2 py-1 rounded">
                                                        Selecionar
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* REGISTER TAB */
                        <div className="flex-1 overflow-y-auto">
                            <CustomerForm 
                                embedded={true} 
                                onSaved={handleCustomerCreated} 
                                onCancel={() => setActiveTab('search')} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerQuickModal;
