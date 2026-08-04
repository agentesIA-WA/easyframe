import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SettleOrderModal from '../../Components/Modals/SettleOrderModal';
import { useNotification } from '../../Contexts/NotificationContext';
import { useAuth } from '../../Contexts/AuthContext';
import { formatDate } from '../../utils/formatters';

const getTodayFormatted = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getFirstDayOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
};

const getLastDayOfMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

const ReportScreen = () => {
    const { notify } = useNotification();
    const { activeStore } = useAuth();
    const getInitialReportType = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('type') || 'daily-movement';
    };

    const [reportType, setReportType] = useState(getInitialReportType);
    const [startDate, setStartDate] = useState(getFirstDayOfMonth);
    const [endDate, setEndDate] = useState(getTodayFormatted);
    const [isAllDates, setIsAllDates] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');
    const [reportData, setReportData] = useState([]);
    const [paymentBreakdown, setPaymentBreakdown] = useState([]);
    const [statusBreakdown, setStatusBreakdown] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totals, setTotals] = useState(null);
    const [settleModal, setSettleModal] = useState({ isOpen: false, order: null });
    const [selectedSellerOrdersModal, setSelectedSellerOrdersModal] = useState(null);

    const handleTypeChange = (newType) => {
        setReportType(newType);
        setSelectedPaymentMethod(null);
        setSelectedStatusFilter(null);
        setSearchTerm('');
        setSortColumn(null);
        const url = new URL(window.location);
        url.searchParams.set('type', newType);
        window.history.pushState({}, '', url);
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            let endpoint = `/api/v1/bi/reports/${reportType}`;
            if (isAllDates) {
                endpoint += `?date=all`;
            } else if (startDate && endDate) {
                endpoint += `?start_date=${startDate}&end_date=${endDate}`;
            } else if (startDate) {
                endpoint += `?start_date=${startDate}&end_date=${startDate}`;
            }

            const storeIdHeader = activeStore?.id || localStorage.getItem('active_store_id');
            const response = await axios.get(endpoint, {
                headers: storeIdHeader ? { 'X-Store-Id': storeIdHeader } : {}
            });
            const data = response.data;

            if (reportType === 'daily-movement') {
                setReportData(data.data || []);
                setTotals(data.totals);
                setPaymentBreakdown(data.payment_breakdown || []);
                setStatusBreakdown([]);
            } else if (reportType === 'delivery-forecast') {
                setReportData(data.data || []);
                setTotals(data.totals);
                setStatusBreakdown(data.status_breakdown || []);
                setPaymentBreakdown([]);
            } else if (reportType === 'expenses' || reportType === 'commissions') {
                setReportData(data.data || []);
                setTotals(data);
                setPaymentBreakdown([]);
                setStatusBreakdown([]);
            } else if (reportType === 'receivables') {
                setReportData(data.data || []);
                setTotals({ count: data.count, total: data.total_value });
                setPaymentBreakdown([]);
                setStatusBreakdown([]);
            } else if (reportType === 'cash-flow') {
                setReportData([]);
                setTotals(data);
                setPaymentBreakdown([]);
                setStatusBreakdown([]);
            } else {
                setReportData(Array.isArray(data) ? data : []);
                setTotals(null);
                setPaymentBreakdown([]);
                setStatusBreakdown([]);
            }
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedPaymentMethod(null);
        setSelectedStatusFilter(null);
        setSearchTerm('');
        setSortColumn(null);
        fetchReport();
    }, [reportType, startDate, endDate, isAllDates, activeStore?.id]);

    const shiftPeriod = (direction) => {
        setIsAllDates(false);
        if (!startDate || !endDate) {
            const today = getTodayFormatted();
            setStartDate(today);
            setEndDate(today);
            return;
        }

        const d1 = new Date(startDate + 'T00:00:00');
        const d2 = new Date(endDate + 'T00:00:00');
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        d1.setDate(d1.getDate() + (direction * diffDays));
        d2.setDate(d2.getDate() + (direction * diffDays));

        const formatDateStr = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        setStartDate(formatDateStr(d1));
        setEndDate(formatDateStr(d2));
    };

    const handlePaymentMethodClick = (methodName) => {
        if (selectedPaymentMethod === methodName) {
            setSelectedPaymentMethod(null);
        } else {
            setSelectedPaymentMethod(methodName);
        }
        setSearchTerm('');
    };

    const handleStatusFilterClick = (statusLabel) => {
        if (selectedStatusFilter === statusLabel) {
            setSelectedStatusFilter(null);
        } else {
            setSelectedStatusFilter(statusLabel);
        }
        setSearchTerm('');
    };

    const handleSort = (colKey) => {
        if (sortColumn === colKey) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortColumn(colKey);
            setSortDirection('asc');
        }
    };

    // Group payment methods per order to display parcel count e.g., "5x CARTÃO DE CRÉDITO"
    const getGroupedOrderPayments = (payments) => {
        if (!payments || payments.length === 0) {
            return [{ method: 'A RECEBER / NÃO DEFINIDO', count: 1 }];
        }

        const map = {};
        payments.forEach((p) => {
            const method = (p.payment_method || 'NÃO INFORMADO').trim().toUpperCase();
            if (!map[method]) {
                map[method] = 0;
            }
            map[method]++;
        });

        return Object.keys(map).map((method) => ({
            method,
            count: map[method]
        }));
    };

    const isOrderFullyPaid = (item) => {
        if (!item.payments || item.payments.length === 0) return false;
        const totalOrderVal = parseFloat(item.total_value || item.total_sales || 0);
        const allPaid = item.payments.every((p) => {
            if (p.status === 'P') return true;
            const method = String(p.payment_method || '').toUpperCase();
            return method.includes('PIX') || method.includes('DINHEIRO') || method.includes('DÉBITO') || method.includes('DEBITO');
        });
        if (allPaid) return true;
        const paidSum = item.payments.reduce((acc, p) => {
            const val = parseFloat(p.value || 0);
            const method = String(p.payment_method || '').toUpperCase();
            const isCash = method.includes('PIX') || method.includes('DINHEIRO') || method.includes('DÉBITO') || method.includes('DEBITO');
            if (p.status === 'P' || isCash) return acc + (parseFloat(p.paid_value || 0) || val);
            return acc;
        }, 0);
        return paidSum >= (totalOrderVal - 0.05);
    };

    const getFilteredReportData = () => {
        if (reportType === 'daily-movement' && selectedPaymentMethod) {
            return reportData.filter((item) => {
                if (selectedPaymentMethod === 'A RECEBER / NÃO DEFINIDO') {
                    return !item.payments || item.payments.length === 0;
                }

                return item.payments && item.payments.some((p) => {
                    const method = (p.payment_method || 'NÃO INFORMADO').trim().toUpperCase();
                    return method === selectedPaymentMethod;
                });
            });
        }

        if (reportType === 'delivery-forecast' && selectedStatusFilter) {
            return reportData.filter((item) => {
                if (selectedStatusFilter === 'EM PRODUÇÃO') {
                    return ['production', 'confirmed', 'pending'].includes(item.status);
                }
                if (selectedStatusFilter === 'PRONTO P/ ENTREGA') {
                    return item.status === 'ready';
                }
                if (selectedStatusFilter === 'ENTREGUE / CONCLUÍDO') {
                    return ['delivered', 'finished'].includes(item.status);
                }
                if (selectedStatusFilter === 'ENTREGA DIFICULTADA') {
                    return item.status === 'difficult_delivery';
                }
                if (selectedStatusFilter === 'ENTREGUE S/ PAGAMENTO') {
                    return item.status === 'delivered_unpaid';
                }
                return true;
            });
        }

        return reportData;
    };

    const getColumnValue = (item, colKey) => {
        const netValue = parseFloat(item.total_sales || item.total_value || item.value || item.amount || 0);
        const discountValue = parseFloat(item.total_discount ?? item.discount ?? 0) || (item.items ? item.items.reduce((acc, i) => acc + parseFloat(i.item_discount || 0), 0) : 0);
        const grossValue = item.gross_value ? parseFloat(item.gross_value) : (netValue + discountValue);

        switch (colKey) {
            case 'id':
                return parseInt(item.id || 0);
            case 'customer':
                return (item.customer?.name || item.seller_name || item.type?.description || 'CLIENTE DIVERSOS').toLowerCase();
            case 'seller':
                return (item.seller?.name || item.seller_name || '').toLowerCase();
            case 'framer':
                return (item.framer?.name || 'Não Atribuído').toLowerCase();
            case 'payment_method':
                const grouped = getGroupedOrderPayments(item.payments);
                return grouped.map(g => (g.count > 1 ? `${g.count}x ${g.method}` : g.method)).join(' ').toLowerCase();
            case 'delivery_date':
                return item.delivery_date ? new Date(item.delivery_date).getTime() : 0;
            case 'gross_value':
                return grossValue;
            case 'discount_value':
                return discountValue;
            case 'net_value':
                return netValue;
            case 'financial_status':
                return isOrderFullyPaid(item) ? 1 : 0;
            case 'status':
                return (item.status || '').toLowerCase();
            default:
                return '';
        }
    };

    const getProcessedReportData = () => {
        let data = getFilteredReportData();

        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            data = data.filter(item => {
                const idStr = String(item.id || '');
                const custStr = (item.customer?.name || item.seller_name || item.type?.description || 'CLIENTE DIVERSOS').toLowerCase();
                const sellerStr = (item.seller?.name || item.seller_name || '').toLowerCase();
                const framerStr = (item.framer?.name || '').toLowerCase();
                const statusStr = (item.status || '').toLowerCase();
                const deliveryStr = item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('pt-BR') : '';
                const pmStr = getGroupedOrderPayments(item.payments).map(g => g.method).join(' ').toLowerCase();

                return idStr.includes(term) ||
                    custStr.includes(term) ||
                    sellerStr.includes(term) ||
                    framerStr.includes(term) ||
                    statusStr.includes(term) ||
                    deliveryStr.includes(term) ||
                    pmStr.includes(term);
            });
        }

        if (sortColumn) {
            data = [...data].sort((a, b) => {
                const valA = getColumnValue(a, sortColumn);
                const valB = getColumnValue(b, sortColumn);

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortDirection === 'asc' ? valA - valB : valB - valA;
                }

                const strA = String(valA || '');
                const strB = String(valB || '');
                return sortDirection === 'asc'
                    ? strA.localeCompare(strB, 'pt-BR', { numeric: true })
                    : strB.localeCompare(strA, 'pt-BR', { numeric: true });
            });
        }

        return data;
    };

    const displayData = getProcessedReportData();

    const getStatusBadge = (item) => {
        if (reportType === 'commissions') {
            return (
                <span className="px-2.5 py-1 bg-indigo-100 rounded-lg text-[10px] font-black uppercase text-indigo-700 whitespace-nowrap">
                    Comissão: {item.bonus_percentage}% (R$ {(item.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </span>
            );
        }

        if (item.status === 'production' || item.status === 'pending') {
            return (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-200 whitespace-nowrap">
                    Em Produção
                </span>
            );
        }

        if (item.status === 'ready') {
            return (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200 whitespace-nowrap">
                    Pronto p/ Entrega
                </span>
            );
        }

        if (item.status === 'finished' || item.status === 'delivered') {
            return (
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                    Entregue / Concluído
                </span>
            );
        }

        if (item.status === 'confirmed') {
            return (
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-200 whitespace-nowrap">
                    Em Produção (Confirmado)
                </span>
            );
        }

        return (
            <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">
                {item.status || item.due_date || item.expense_date || item.production_date || 'N/A'}
            </span>
        );
    };

    const getPaymentBadgeColor = (method) => {
        const m = (method || '').toUpperCase();
        if (m.includes('PIX')) return 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100';
        if (m.includes('CRÉDITO') || m.includes('CREDITO')) return 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100';
        if (m.includes('DÉBITO') || m.includes('DEBITO')) return 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100';
        if (m.includes('DINHEIRO')) return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
        if (m.includes('ENTREGA')) return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
        return 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
    };

    const getStatusBadgeColor = (label) => {
        const l = (label || '').toUpperCase();
        if (l.includes('PRODUÇÃO') || l.includes('PRODUCAO')) return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
        if (l.includes('PRONTO')) return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
        if (l.includes('ENTREGUE') || l.includes('CONCLUÍDO')) return 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100';
        if (l.includes('DIFICULTADA')) return 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100';
        return 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100';
    };

    const renderSortableHeader = (label, colKey) => {
        const isSorted = sortColumn === colKey;
        return (
            <th
                onClick={() => handleSort(colKey)}
                className="px-5 py-3.5 text-[10px] font-black uppercase text-slate-600 tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-200/80 transition-colors select-none group"
                title={`Clique para ordenar por ${label} (${isSorted && sortDirection === 'asc' ? 'Z-A' : 'A-Z'})`}
            >
                <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    <span className="text-[9px] font-mono">
                        {isSorted ? (
                            sortDirection === 'asc' ? (
                                <span className="text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded font-black border border-primary-200">▲ A-Z</span>
                            ) : (
                                <span className="text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded font-black border border-primary-200">▼ Z-A</span>
                            )
                        ) : (
                            <span className="opacity-0 group-hover:opacity-50 text-slate-400 font-bold">⇅</span>
                        )}
                    </span>
                </div>
            </th>
        );
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Header & Report Selection */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Centro de Inteligência & Relatórios</h1>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">Selecione o tipo de relatório e analise os dados de vendas</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 shadow-xs">
                        <button 
                            onClick={() => shiftPeriod(-1)}
                            className="px-2 py-1.5 hover:bg-white rounded-lg text-slate-600 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                            title="Período Anterior"
                        >
                            ◄
                        </button>

                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 shadow-2xs">
                            <span className="text-[11px] font-bold text-slate-500">De:</span>
                            <input 
                                type="date" 
                                className={`border-0 bg-transparent text-xs font-black text-slate-800 focus:ring-0 cursor-pointer p-0 ${isAllDates ? 'opacity-30' : ''}`}
                                value={isAllDates ? '' : startDate}
                                onChange={(e) => { setStartDate(e.target.value); setIsAllDates(false); }}
                            />
                            <span className="text-[11px] font-bold text-slate-400">Até:</span>
                            <input 
                                type="date" 
                                className={`border-0 bg-transparent text-xs font-black text-slate-800 focus:ring-0 cursor-pointer p-0 ${isAllDates ? 'opacity-30' : ''}`}
                                value={isAllDates ? '' : endDate}
                                onChange={(e) => { setEndDate(e.target.value); setIsAllDates(false); }}
                            />
                        </div>

                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                            <button 
                                onClick={() => {
                                    const t = getTodayFormatted();
                                    setStartDate(t);
                                    setEndDate(t);
                                    setIsAllDates(false);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                    !isAllDates && startDate === getTodayFormatted() && endDate === getTodayFormatted() 
                                        ? 'bg-primary-600 text-white shadow-xs' 
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                            >
                                Hoje
                            </button>

                            <button 
                                onClick={() => {
                                    setStartDate(getFirstDayOfMonth());
                                    setEndDate(getLastDayOfMonth());
                                    setIsAllDates(false);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                    !isAllDates && startDate === getFirstDayOfMonth() && endDate === getLastDayOfMonth() 
                                        ? 'bg-primary-600 text-white shadow-xs' 
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                            >
                                Este Mês
                            </button>

                            <button 
                                onClick={() => setIsAllDates(true)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                    isAllDates 
                                        ? 'bg-slate-800 text-white shadow-xs' 
                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                                title="Exibir todos os registros sem restrição de data"
                            >
                                Todas
                            </button>
                        </div>

                        <button 
                            onClick={() => shiftPeriod(1)}
                            className="px-2 py-1.5 hover:bg-white rounded-lg text-slate-600 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                            title="Próximo Período"
                        >
                            ►
                        </button>
                    </div>

                    <select 
                        className="border-slate-300 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 py-2.5 px-4 bg-slate-50/50 cursor-pointer"
                        value={reportType}
                        onChange={(e) => handleTypeChange(e.target.value)}
                    >
                        <option value="daily-movement">Vendas Totais / Movimento Diário</option>
                        <option value="delivery-forecast">Pedidos em Produção & Entrega</option>
                        <option value="commissions">Comissões de Vendedores</option>
                        <option value="receivables">Contas a Receber (Inadimplência)</option>
                        <option value="expenses">Relatório de Despesas</option>
                        <option value="cash-flow">Fluxo de Caixa</option>
                    </select>
                </div>
            </div>

            {/* Daily Movement KPI Cards & Payment Breakdown */}
            {totals && reportType === 'daily-movement' && (
                <div className="space-y-6">
                    {/* Top KPI Cards: Total Vendas, Valor Bruto, Descontos, Pedidos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 rounded-2xl shadow-lg shadow-primary-900/20 text-white">
                            <div className="flex justify-between items-center opacity-80 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest">Total Vendas (Líquido)</span>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-3xl font-black">R$ {parseFloat(totals.total_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[11px] opacity-75 font-medium mt-1">
                                Período: {isAllDates ? 'Todas as Datas' : `${startDate ? startDate.split('-').reverse().join('/') : ''} até ${endDate ? endDate.split('-').reverse().join('/') : ''}`}
                            </p>
                        </div>

                        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white">
                            <div className="flex justify-between items-center opacity-80 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Valor Bruto</span>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            </div>
                            <p className="text-3xl font-black text-emerald-400">R$ {parseFloat(totals.gross_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">Antes de aplicar descontos</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
                            <div className="flex justify-between items-center text-slate-400 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest">Descontos Concedidos</span>
                                <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-3xl font-black text-rose-500">R$ {parseFloat(totals.discounts || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-1">Total abatido no dia</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-slate-900">
                            <div className="flex justify-between items-center text-slate-400 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest">Qtd. de Pedidos</span>
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 11h14l1 12H4L5 11z" /></svg>
                            </div>
                            <p className="text-3xl font-black text-slate-800">{totals.count}</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-1">Pedidos gerados no dia</p>
                        </div>
                    </div>

                    {/* Breakdown by Payment Method with Click-to-Filter */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                    Vendas Separadas por Tipo de Pagamento
                                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                                        Clique para filtrar
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">Selecione uma modalidade abaixo para filtrar a lista de pedidos do dia</p>
                            </div>
                            
                            {selectedPaymentMethod && (
                                <button 
                                    onClick={() => setSelectedPaymentMethod(null)}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <span>Exibir Todos</span>
                                    <span className="text-slate-400 font-normal">✕</span>
                                </button>
                            )}
                        </div>

                        {paymentBreakdown.length === 0 ? (
                            <p className="text-xs text-slate-400 font-bold uppercase py-4">Nenhum pagamento registrado nesta data.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {paymentBreakdown.map((pb, idx) => {
                                    const isSelected = selectedPaymentMethod === pb.method;
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => handlePaymentMethodClick(pb.method)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${getPaymentBadgeColor(pb.method)} ${
                                                isSelected 
                                                    ? 'ring-2 ring-primary-600 ring-offset-2 shadow-md bg-white' 
                                                    : 'hover:shadow-md hover:-translate-y-0.5'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        {isSelected && <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></span>}
                                                        {pb.method}
                                                    </span>
                                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${isSelected ? 'bg-primary-600 text-white' : 'bg-white/80 border border-current opacity-80'}`}>
                                                        {pb.percentage}%
                                                    </span>
                                                </div>
                                                <p className="text-xl font-black mt-1">
                                                    R$ {parseFloat(pb.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-current/10 flex justify-between items-center text-[10px] font-bold opacity-80">
                                                <span>Lançamentos: {pb.count}</span>
                                                <span className="font-black underline text-[9px] uppercase tracking-wider">
                                                    {isSelected ? 'Filtrado' : 'Filtrar'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delivery Forecast KPI Cards & Status Breakdown */}
            {totals && reportType === 'delivery-forecast' && (
                <div className="space-y-6">
                    {/* Top KPI Cards: Total, Em Produção, Prontos, Entregues */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white">
                            <div className="flex justify-between items-center opacity-80 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Total de Pedidos</span>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <p className="text-3xl font-black">{totals.count}</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-1">Valor: R$ {parseFloat(totals.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>

                        <div className="bg-amber-600 p-6 rounded-2xl shadow-lg text-white">
                            <div className="flex justify-between items-center opacity-80 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest">Em Produção</span>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </div>
                            <p className="text-3xl font-black">{totals.in_production}</p>
                            <p className="text-[11px] opacity-80 font-medium mt-1">Aguardando/Em confecção</p>
                        </div>

                        <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg text-white">
                            <div className="flex justify-between items-center opacity-80 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest">Prontos p/ Entrega</span>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <p className="text-3xl font-black">{totals.ready}</p>
                            <p className="text-[11px] opacity-80 font-medium mt-1">Aguardando retirada/envio</p>
                        </div>

                        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                            <div className="flex justify-between items-center opacity-80 mb-1">
                                <span className="text-[10px] font-black uppercase tracking-widest">Entregues / Concluídos</span>
                                <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-3xl font-black">{totals.delivered}</p>
                            <p className="text-[11px] opacity-80 font-medium mt-1">Pedidos entregues</p>
                        </div>
                    </div>

                    {/* Breakdown by Order Status with Click-to-Filter */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                                    Pedidos Separados por Situação / Status
                                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                                        Clique para filtrar
                                    </span>
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">Selecione uma situação abaixo para filtrar a lista de pedidos em produção e entrega</p>
                            </div>
                            
                            {selectedStatusFilter && (
                                <button 
                                    onClick={() => setSelectedStatusFilter(null)}
                                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                    <span>Exibir Todos</span>
                                    <span className="text-slate-400 font-normal">✕</span>
                                </button>
                            )}
                        </div>

                        {statusBreakdown.length === 0 ? (
                            <p className="text-xs text-slate-400 font-bold uppercase py-4">Nenhum pedido encontrado.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {statusBreakdown.map((sb, idx) => {
                                    const isSelected = selectedStatusFilter === sb.status_label;
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleStatusFilterClick(sb.status_label)}
                                            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${getStatusBadgeColor(sb.status_label)} ${
                                                isSelected 
                                                    ? 'ring-2 ring-primary-600 ring-offset-2 shadow-md bg-white' 
                                                    : 'hover:shadow-md hover:-translate-y-0.5'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                                        {isSelected && <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></span>}
                                                        {sb.status_label}
                                                    </span>
                                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${isSelected ? 'bg-primary-600 text-white' : 'bg-white/80 border border-current opacity-80'}`}>
                                                        {sb.percentage}%
                                                    </span>
                                                </div>
                                                <p className="text-xl font-black mt-1">
                                                    R$ {parseFloat(sb.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-current/10 flex justify-between items-center text-[10px] font-bold opacity-80">
                                                <span>Pedidos: {sb.count}</span>
                                                <span className="font-black underline text-[9px] uppercase tracking-wider">
                                                    {isSelected ? 'Filtrado' : 'Filtrar'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Other Reports KPI Summaries */}
            {totals && reportType === 'commissions' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Total em Vendas do Período</p>
                        <p className="text-3xl font-black text-white mt-1">R$ {parseFloat(totals.total_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">{totals.count || 0} Vendedor(es) com vendas</p>
                    </div>

                    <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total em Comissões</p>
                        <p className="text-3xl font-black mt-1">R$ {parseFloat(totals.total_commission || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] opacity-80 font-medium mt-1">Calculado sobre a % de cada vendedor</p>
                    </div>

                    <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Média da Comissão</p>
                        <p className="text-3xl font-black mt-1">
                            {totals.total_sales > 0 ? ((totals.total_commission / totals.total_sales) * 100).toFixed(2) : '0.00'}%
                        </p>
                        <p className="text-[11px] opacity-80 font-medium mt-1">Percentual médio global</p>
                    </div>
                </div>
            )}

            {totals && reportType === 'expenses' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Total de Despesas do Período</p>
                        <p className="text-3xl font-black text-white mt-1">R$ {parseFloat(totals.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">Total de {totals.count || 0} lançamento(s)</p>
                    </div>

                    <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Despesas Pagas</p>
                        <p className="text-3xl font-black mt-1">R$ {parseFloat(totals.paid_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] opacity-80 font-medium mt-1">Pagas no período</p>
                    </div>

                    <div className="bg-rose-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Despesas Pendentes</p>
                        <p className="text-3xl font-black mt-1">R$ {parseFloat(totals.pending_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[11px] opacity-80 font-medium mt-1">A vencer / Em aberto</p>
                    </div>
                </div>
            )}

            {totals && reportType === 'cash-flow' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Entradas (Recebidos)</p>
                        <p className="text-3xl font-black mt-1">R$ {parseFloat(totals.inflow || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-rose-600 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saídas (Despesas)</p>
                        <p className="text-3xl font-black mt-1">R$ {parseFloat(totals.outflow || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Saldo do Período</p>
                        <p className="text-3xl font-black text-primary-400 mt-1">R$ {parseFloat(totals.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            )}

            {/* Main Data Table with Search and Sorting */}
            <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                            {reportType === 'daily-movement' && `Pedidos do Dia (${displayData.length})`}
                            {reportType === 'delivery-forecast' && `Pedidos de Produção & Entrega (${displayData.length})`}
                            {reportType !== 'daily-movement' && reportType !== 'delivery-forecast' && `Registros do Relatório (${displayData.length})`}
                        </span>
                        {(selectedPaymentMethod || selectedStatusFilter) && (
                            <span className="px-2.5 py-0.5 bg-primary-100 text-primary-800 text-[10px] font-black uppercase rounded-full border border-primary-200">
                                Filtro: {selectedPaymentMethod || selectedStatusFilter}
                            </span>
                        )}
                        {sortColumn && (
                            <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-black uppercase rounded-full border border-slate-300 flex items-center gap-1">
                                <span>Ordem: {sortColumn} ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})</span>
                                <button onClick={() => setSortColumn(null)} className="hover:text-rose-600 font-black">✕</button>
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {/* Search Input for Any Column */}
                        <div className="relative flex-1 md:w-80">
                            <input
                                type="text"
                                placeholder="Filtrar por qualquer coluna (Nº, cliente, status...)"
                                className="w-full text-xs font-bold pl-9 pr-8 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-2xs placeholder:font-medium placeholder:text-slate-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                    title="Limpar pesquisa"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {(selectedPaymentMethod || selectedStatusFilter || searchTerm || sortColumn) && (
                            <button 
                                onClick={() => {
                                    setSelectedPaymentMethod(null);
                                    setSelectedStatusFilter(null);
                                    setSearchTerm('');
                                    setSortColumn(null);
                                }}
                                className="text-[11px] font-bold text-primary-600 hover:text-primary-800 uppercase tracking-wider whitespace-nowrap"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando Relatório...</p>
                        </div>
                    ) : displayData.length === 0 ? (
                        <div className="p-16 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                            Nenhum registro encontrado para {(selectedPaymentMethod || selectedStatusFilter || searchTerm) ? `a busca/seleção atual` : 'a seleção atual'}.
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-max">
                            <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                                <tr>
                                    {reportType === 'commissions' ? (
                                        <>
                                            {renderSortableHeader('Vendedor', 'seller_name')}
                                            {renderSortableHeader('Cargo', 'role')}
                                            {renderSortableHeader('Qtd. Pedidos', 'orders_count')}
                                            {renderSortableHeader('Total Vendido', 'total_sales')}
                                            {renderSortableHeader('% Comissão (Vendedor)', 'bonus_percentage')}
                                            {renderSortableHeader('Valor da Comissão', 'commission_value')}
                                        </>
                                    ) : reportType === 'expenses' ? (
                                        <>
                                            {renderSortableHeader('Cód / ID', 'id')}
                                            {renderSortableHeader('Descrição', 'description')}
                                            {renderSortableHeader('Categoria / Tipo', 'type')}
                                            {renderSortableHeader('Vencimento', 'due_date')}
                                            {renderSortableHeader('Status', 'status')}
                                            {renderSortableHeader('Valor', 'amount')}
                                        </>
                                    ) : (
                                        <>
                                            {renderSortableHeader('Nº Pedido', 'id')}
                                            {renderSortableHeader('Cliente', 'customer')}
                                            {renderSortableHeader('Vendedor', 'seller')}
                                            {reportType === 'delivery-forecast' && renderSortableHeader('Montador / Moldureiro', 'framer')}
                                            {reportType === 'daily-movement' && renderSortableHeader('Forma de Pagamento', 'payment_method')}
                                            {reportType === 'delivery-forecast' && renderSortableHeader('Data Prev. Entrega', 'delivery_date')}
                                            {renderSortableHeader('Valor Bruto', 'gross_value')}
                                            {renderSortableHeader('Desconto', 'discount_value')}
                                            {renderSortableHeader('Valor Líquido', 'net_value')}
                                            {reportType === 'delivery-forecast' && renderSortableHeader('Status Financeiro', 'financial_status')}
                                            {renderSortableHeader('Situação / Status', 'status')}
                                            {reportType === 'delivery-forecast' && (
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">Ações</th>
                                            )}
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {displayData.map((item) => {
                                    if (reportType === 'commissions') {
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-5 py-4 text-xs font-black text-slate-800 uppercase whitespace-nowrap">
                                                    <button
                                                        onClick={() => setSelectedSellerOrdersModal(item)}
                                                        className="text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-2 font-black uppercase text-left group"
                                                        title="Clique para ver os pedidos deste vendedor"
                                                    >
                                                        <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                                            {item.seller_name ? item.seller_name.charAt(0) : 'V'}
                                                        </span>
                                                        <span>{item.seller_name}</span>
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                                                    {item.role || 'VENDEDOR'}
                                                </td>
                                                <td className="px-5 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">
                                                    <button
                                                        onClick={() => setSelectedSellerOrdersModal(item)}
                                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200"
                                                        title="Clique para ver a lista de pedidos"
                                                    >
                                                        {item.orders_count || (item.orders || []).length} pedido(s) 🔍
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4 text-sm font-black text-slate-900 whitespace-nowrap">
                                                    R$ {parseFloat(item.total_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-5 py-4 text-xs font-bold whitespace-nowrap">
                                                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-black">
                                                        {parseFloat(item.bonus_percentage || item.commission_rate || 0).toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm font-black text-emerald-600 whitespace-nowrap">
                                                    R$ {parseFloat(item.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    if (reportType === 'expenses') {
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-5 py-4 text-xs font-black text-slate-500 whitespace-nowrap">#{item.id}</td>
                                                <td className="px-5 py-4 text-xs font-black text-slate-800 uppercase whitespace-nowrap">{item.description}</td>
                                                <td className="px-5 py-4 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{item.type?.name || 'GERAL'}</td>
                                                <td className="px-5 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">{formatDate(item.due_date)}</td>
                                                <td className="px-5 py-4 text-xs font-bold whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        item.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                        {item.status === 'paid' ? 'PAGO' : item.status === 'pending' ? 'PENDENTE' : 'CANCELADO'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm font-black text-slate-900 whitespace-nowrap">
                                                    R$ {parseFloat(item.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    }
                                    const netValue = parseFloat(item.total_sales || item.total_value || item.value || item.amount || 0);
                                    const discountValue = parseFloat(item.total_discount ?? item.discount ?? 0) || (item.items ? item.items.reduce((acc, i) => acc + parseFloat(i.item_discount || 0), 0) : 0);
                                    const grossValue = item.gross_value ? parseFloat(item.gross_value) : (netValue + discountValue);
                                    const groupedPayments = getGroupedOrderPayments(item.payments);
                                    const deliveryDateFormatted = item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('pt-BR') : '—';
                                    const fullyPaid = isOrderFullyPaid(item);

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-4 text-sm font-black whitespace-nowrap">
                                                <a 
                                                    href={`/orders/${item.id}/print`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 hover:underline font-black group"
                                                    title="Clique para abrir o pedido / Ordem de Serviço para impressão"
                                                >
                                                    <span>#{item.id}</span>
                                                    <svg className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            </td>
                                            
                                            <td className="px-5 py-4 text-xs font-black text-slate-800 uppercase whitespace-nowrap">
                                                {item.customer?.name || item.seller_name || item.type?.description || 'CLIENTE DIVERSOS'}
                                            </td>

                                            <td className="px-5 py-4 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                                                {item.seller?.name || item.seller_name || '—'}
                                            </td>

                                            {reportType === 'delivery-forecast' && (
                                                <td className="px-5 py-4 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                                                    {item.framer?.name || 'Não Atribuído'}
                                                </td>
                                            )}

                                            {reportType === 'daily-movement' && (
                                                <td className="px-5 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                        {groupedPayments.map((gp, gpIdx) => {
                                                            const displayText = gp.count > 1 ? `${gp.count}x ${gp.method}` : gp.method;
                                                            return (
                                                                <span key={gpIdx} className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${getPaymentBadgeColor(gp.method)} whitespace-nowrap`}>
                                                                    {displayText}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                            )}

                                            {reportType === 'delivery-forecast' && (
                                                <td className="px-5 py-4 text-xs font-bold text-slate-700 whitespace-nowrap">
                                                    {deliveryDateFormatted}
                                                </td>
                                            )}

                                            <td className="px-5 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">
                                                R$ {grossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>

                                            <td className="px-5 py-4 text-xs font-bold text-rose-500 whitespace-nowrap">
                                                {discountValue > 0 ? `- R$ ${discountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                                            </td>

                                            <td className="px-5 py-4 text-sm font-black text-slate-900 whitespace-nowrap">
                                                R$ {netValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>

                                            {reportType === 'delivery-forecast' && (
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {fullyPaid ? (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-300 flex items-center gap-1.5 w-max">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                                            <span>✓ TOTALMENTE PAGO</span>
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-200 flex items-center gap-1.5 w-max">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                            <span>⏳ PENDENTE / PARCIAL</span>
                                                        </span>
                                                    )}
                                                </td>
                                            )}

                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {getStatusBadge(item)}
                                            </td>

                                            {reportType === 'delivery-forecast' && (
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <a 
                                                            href={`/orders/${item.id}/print`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-primary-600 hover:text-white text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg border border-slate-200 shadow-xs transition-all"
                                                            title="Abrir Impressão da OS"
                                                        >
                                                            <svg className="w-3.5 h-3.5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                            </svg>
                                                            <span>Imprimir OS</span>
                                                        </a>
                                                        {item.status === 'ready' && (
                                                            <button
                                                                onClick={() => setSettleModal({ isOpen: true, order: item })}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xs transition-all"
                                                                title="Informar pagamento restante e dar baixa no pedido"
                                                            >
                                                                <span>✓ Baixar</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            <SettleOrderModal
                isOpen={settleModal.isOpen}
                onClose={() => setSettleModal({ isOpen: false, order: null })}
                order={settleModal.order}
                onSuccess={() => fetchReport()}
                notify={notify}
            />

            {/* Modal: Pedidos do Vendedor */}
            {selectedSellerOrdersModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-primary-500/20 text-primary-300 border border-primary-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                                        Relatório de Vendedor
                                    </span>
                                    <span className="text-xs text-slate-400 font-bold uppercase">{selectedSellerOrdersModal.role || 'VENDEDOR'}</span>
                                </div>
                                <h2 className="text-2xl font-black text-white mt-1 uppercase tracking-tight">
                                    {selectedSellerOrdersModal.seller_name}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Lista de pedidos e comissões calculadas no período selecionado
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSellerOrdersModal(null)}
                                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg font-bold transition-all cursor-pointer"
                                title="Fechar"
                            >
                                ✕
                            </button>
                        </div>

                        {/* KPI Summary Bar inside Modal */}
                        <div className="bg-slate-800 p-4 px-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-white border-t border-slate-700">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Vendido</p>
                                <p className="text-lg font-black text-white">
                                    R$ {parseFloat(selectedSellerOrdersModal.total_sales || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Pedidos</p>
                                <p className="text-lg font-black text-white">
                                    {selectedSellerOrdersModal.orders_count || (selectedSellerOrdersModal.orders || []).length} pedido(s)
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Comissão</p>
                                <p className="text-lg font-black text-emerald-400">
                                    R$ {parseFloat(selectedSellerOrdersModal.commission_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">% Efetiva Apurada</p>
                                <p className="text-lg font-black text-indigo-300">
                                    {parseFloat(selectedSellerOrdersModal.bonus_percentage || selectedSellerOrdersModal.commission_rate || 0).toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        {/* Modal Body: Orders Table */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            {(!selectedSellerOrdersModal.orders || selectedSellerOrdersModal.orders.length === 0) ? (
                                <div className="p-12 text-center text-slate-400 font-bold uppercase text-xs">
                                    Nenhum pedido encontrado para este vendedor no período.
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50">
                                            <th className="py-3 px-4">Nº Pedido</th>
                                            <th className="py-3 px-4">Data / Hora</th>
                                            <th className="py-3 px-4">Cliente</th>
                                            <th className="py-3 px-4">Forma(s) de Pagamento</th>
                                            <th className="py-3 px-4 text-right">Valor Total</th>
                                            <th className="py-3 px-4 text-right">Comissão</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {selectedSellerOrdersModal.orders.map((ord) => (
                                            <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-4 font-black">
                                                    <a
                                                        href={`/orders/${ord.id}/print`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1 font-black"
                                                    >
                                                        #{ord.id}
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                </td>
                                                <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                                                    {ord.created_at}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-800 uppercase">
                                                    {ord.customer_name}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {ord.payments && ord.payments.length > 0 ? (
                                                            ord.payments.map((p, pIdx) => (
                                                                <span key={pIdx} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-bold">
                                                                    {p.method}: R$ {parseFloat(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({p.rate}%)
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic">Sem pagamento</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                                                    R$ {parseFloat(ord.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                                                    R$ {parseFloat(ord.commission_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setSelectedSellerOrdersModal(null)}
                                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportScreen;
