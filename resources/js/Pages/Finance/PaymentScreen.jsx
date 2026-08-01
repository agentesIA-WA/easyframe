import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../../Components/Pagination';
import { formatDate } from '../../utils/formatters';

const PaymentScreen = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('due_date');
    const [sortDir, setSortDir] = useState('asc');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [payAmount, setPayAmount] = useState(0);

    const fetchPayments = async (page = 1, searchTerm = '', field = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/finance/payments?status=A&page=${page}&search=${searchTerm}&sort_by=${field}&sort_direction=${direction}`);
            setPayments(response.data.data);
            setMeta(response.data);
        } catch (error) {
            console.error('Erro ao buscar pagamentos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPayments(1, search, sortBy, sortDir);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, sortBy, sortDir]);

    const handleSort = (field) => {
        const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(field);
        setSortDir(newDir);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-400 ml-1 opacity-50 font-normal">↕</span>;
        return sortDir === 'asc' ? <span className="text-primary-500 ml-1 font-normal">↑</span> : <span className="text-primary-500 ml-1 font-normal">↓</span>;
    };

    const handlePayment = async () => {
        if (!selectedPayment) return;

        try {
            await axios.post(`/api/v1/finance/payments/${selectedPayment.id}/pay`, {
                amount: payAmount,
                method: 'ESP'
            });

            alert('Recebimento registrado com sucesso!');
            setSelectedPayment(null);
            fetchPayments();
        } catch (error) {
            alert('Erro ao processar recebimento.');
        }
    };

    return (
        <>
            <div className="max-w-[1400px] mx-auto space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                        <h1 className="text-xs font-black uppercase tracking-widest whitespace-nowrap">SCR-007: Baixa Financeira (Contas a Receber)</h1>
                        
                        <div className="relative w-full md:w-auto">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </span>
                            <input 
                                type="text" 
                                placeholder="Pesquisar..." 
                                className="pl-8 pr-4 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-xs focus:ring-primary-500 focus:border-primary-500 w-full md:w-80 text-white placeholder-slate-400"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 divide-x divide-slate-100">
                        <div className="lg:col-span-2 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('due_date')}>
                                            Vencimento <SortIcon field="due_date" />
                                        </th>
                                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('order_id')}>
                                            Pedido <SortIcon field="order_id" />
                                        </th>
                                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('order.customer.name')}>
                                            Cliente <SortIcon field="order.customer.name" />
                                        </th>
                                        <th className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('value')}>
                                            Valor <SortIcon field="value" />
                                        </th>
                                        <th className="px-4 py-2 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic text-xs">Carregando pendências...</td></tr>
                                    ) : payments.length === 0 ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic text-xs">Nenhuma conta a receber pendente.</td></tr>
                                    ) : payments.map(p => (
                                        <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${selectedPayment?.id === p.id ? 'bg-indigo-50' : ''}`}>
                                            <td className="px-4 py-2 text-xs font-bold text-slate-600">{formatDate(p.due_date)}</td>
                                            <td className="px-4 py-2 text-xs font-mono text-indigo-600 font-bold">ORD-{p.order_id}</td>
                                            <td className="px-4 py-2 text-xs font-bold text-slate-700 uppercase">{p.order?.customer?.name || 'N/A'}</td>
                                            <td className="px-4 py-2 text-xs font-black text-slate-900">R$ {parseFloat(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button 
                                                    onClick={() => { setSelectedPayment(p); setPayAmount(p.value); }}
                                                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded font-black uppercase tracking-tighter transition-colors"
                                                >
                                                    Receber
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Pagination meta={meta} onPageChange={fetchPayments} />
                        </div>

                        <div className="p-6 bg-slate-50">
                            {selectedPayment ? (
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded border border-indigo-100 shadow-sm">
                                        <h2 className="text-[10px] font-black text-indigo-600 uppercase mb-4 tracking-widest">Confirmar Recebimento</h2>
                                        <p className="text-xs font-bold text-slate-700 uppercase mb-1">Pedido ORD-{selectedPayment.order_id}</p>
                                        <p className="text-[10px] text-slate-400 font-bold mb-4 uppercase">{selectedPayment.order?.customer?.name}</p>
                                        
                                        <div className="mb-4">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Valor do Recebimento (R$)</label>
                                            <input 
                                                type="number" 
                                                className="w-full border-slate-200 rounded text-sm font-black h-10"
                                                value={payAmount}
                                                onChange={(e) => setPayAmount(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={handlePayment}
                                            className="w-full bg-indigo-600 text-white py-3 rounded font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-900/20"
                                        >
                                            Confirmar Baixa
                                        </button>
                                        <button 
                                            onClick={() => setSelectedPayment(null)}
                                            className="w-full mt-2 text-[10px] text-slate-400 font-bold uppercase hover:text-slate-600"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-lg">
                                    <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione uma conta na lista para processar a baixa</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PaymentScreen;
