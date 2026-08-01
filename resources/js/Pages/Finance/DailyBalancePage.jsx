import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const DailyBalancePage = () => {
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { notify } = useNotification();

    // Denominações conforme legado
    const denominations = [
        { label: 'R$ 0,05', value: 0.05, key: 'qty_005' },
        { label: 'R$ 0,10', value: 0.10, key: 'qty_010' },
        { label: 'R$ 0,25', value: 0.25, key: 'qty_025' },
        { label: 'R$ 0,50', value: 0.50, key: 'qty_050' },
        { label: 'R$ 1,00', value: 1.00, key: 'qty_100' },
        { label: 'R$ 2,00', value: 2.00, key: 'qty_200' },
        { label: 'R$ 5,00', value: 5.00, key: 'qty_500' },
        { label: 'R$ 10,00', value: 10.00, key: 'qty_1000' },
        { label: 'R$ 20,00', value: 20.00, key: 'qty_2000' },
        { label: 'R$ 50,00', value: 50.00, key: 'qty_5000' },
        { label: 'R$ 100,00', value: 100.00, key: 'qty_10000' },
    ];

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        qty_005: 0, qty_010: 0, qty_025: 0, qty_050: 0, qty_100: 0,
        qty_200: 0, qty_500: 0, qty_1000: 0, qty_2000: 0, qty_5000: 0, qty_10000: 0,
        total_checks: 0,
        notes: ''
    });

    const fetchBalances = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/finance/daily-balances');
            setBalances(res.data.data || res.data);
        } catch (error) {
            notify('error', 'Erro ao carregar saldos diários.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPreparedData = async (date) => {
        try {
            const res = await axios.get(`/api/v1/finance/daily-balances/prepare?date=${date}`);
            setFormData(prev => ({ ...prev, total_checks: res.data.total_checks }));
        } catch (error) {
            notify('error', 'Erro ao buscar valores de cheques para o dia.');
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            fetchPreparedData(formData.date);
        }
    }, [formData.date, isModalOpen]);

    const calculateTotalCash = () => {
        return denominations.reduce((acc, d) => acc + (formData[d.key] * d.value), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/v1/finance/daily-balances', formData);
            notify('success', 'Fechamento de caixa gravado com sucesso!');
            setIsModalOpen(false);
            fetchBalances();
        } catch (error) {
            const msg = error.response?.data?.message || 'Erro ao gravar fechamento.';
            notify('error', msg);
        }
    };

    const totalCash = calculateTotalCash();
    const grandTotal = totalCash + formData.total_checks;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Saldos Diários / Caixa</h1>
                <button 
                    onClick={() => setIsModalOpen(true)} 
                    className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-black text-xs shadow-xl shadow-primary-900/20 hover:bg-primary-700 transition transform active:scale-95"
                >
                    + NOVO FECHAMENTO
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                        <tr>
                            <th className="px-6 py-4">Data do Movimento</th>
                            <th className="px-6 py-4 text-right">Total em Espécie</th>
                            <th className="px-6 py-4 text-right">Cheques Conciliados</th>
                            <th className="px-6 py-4 text-right">Total Geral</th>
                            <th className="px-6 py-4">Responsável</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-12 text-slate-400">Carregando histórico...</td></tr>
                        ) : balances.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-12 text-slate-400">Nenhum fechamento registrado.</td></tr>
                        ) : balances.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-black text-slate-700">{formatDate(b.date)}</td>
                                <td className="px-6 py-4 text-right font-mono">{formatCurrency(b.total_cash)}</td>
                                <td className="px-6 py-4 text-right font-mono text-slate-500">{formatCurrency(b.total_checks)}</td>
                                <td className="px-6 py-4 text-right font-black text-primary-600 font-mono text-lg">{formatCurrency(b.grand_total)}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-tighter">{b.user?.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Novo Fechamento de Caixa</h3>
                                <p className="text-slate-400 text-xs font-bold tracking-widest mt-1 uppercase">Contagem de espécie e conciliação de cheques</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-rose-500 transition-colors text-3xl">✕</button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto">
                            <form className="space-y-8">
                                {/* Cabeçalho */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Data do Fechamento</label>
                                        <input 
                                            type="date" 
                                            className="w-full border-slate-200 rounded-xl text-lg font-black focus:ring-primary-500 focus:border-primary-500"
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        />
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                                        <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Cheques Pendentes (Sistema)</span>
                                        <span className="text-2xl font-black text-slate-800 font-mono mt-1">{formatCurrency(formData.total_checks)}</span>
                                    </div>
                                </div>

                                {/* Grade de Contagem */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Cédulas e Moedas</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                        {denominations.map((d) => (
                                            <div key={d.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700">{d.label}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Valor Unitário</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        placeholder="0"
                                                        className="w-24 border-slate-200 rounded-lg text-right font-mono font-bold focus:ring-primary-500"
                                                        value={formData[d.key] || ''}
                                                        onChange={(e) => setFormData({...formData, [d.key]: parseInt(e.target.value) || 0})}
                                                    />
                                                    <div className="w-24 text-right text-xs font-black text-slate-500 font-mono">
                                                        {formatCurrency(formData[d.key] * d.value)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Totais Finais */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                                    <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase opacity-50 tracking-widest">Total Espécie</span>
                                        <span className="text-xl font-black font-mono mt-1">{formatCurrency(totalCash)}</span>
                                    </div>
                                    <div className="bg-slate-100 p-6 rounded-2xl flex flex-col items-center">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Cheques</span>
                                        <span className="text-xl font-black font-mono mt-1 text-slate-600">{formatCurrency(formData.total_checks)}</span>
                                    </div>
                                    <div className="bg-primary-600 text-white p-6 rounded-2xl flex flex-col items-center shadow-xl shadow-primary-900/20">
                                        <span className="text-[10px] font-black uppercase opacity-70 tracking-widest">Total Geral Fechado</span>
                                        <span className="text-2xl font-black font-mono mt-1">{formatCurrency(grandTotal)}</span>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="flex-1 px-8 py-4 border border-slate-200 text-slate-400 rounded-2xl font-black text-xs hover:bg-white hover:text-slate-600 transition"
                            >
                                CANCELAR
                            </button>
                            <button 
                                type="button" 
                                onClick={handleSubmit}
                                className="flex-1 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs hover:bg-primary-700 shadow-2xl shadow-primary-900/40 transition transform active:scale-95"
                            >
                                GRAVAR FECHAMENTO DO DIA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyBalancePage;
