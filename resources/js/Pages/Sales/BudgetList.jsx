import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import { formatDate } from '../../utils/formatters';
import ConfirmModal from '../../Components/Modals/ConfirmModal';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';
import { sendWhatsApp } from '../../utils/whatsapp';

export default function BudgetList() {
    const { notify } = useNotification();
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBudget, setSelectedBudget] = useState(null);
    const [viewingBudget, setViewingBudget] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');
    
    // Estados para Modais de Confirmação
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'warning', title: '', message: '', onConfirm: null });

    const fetchBudgets = async (pageNumber = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/sales/orders?status=draft&page=${pageNumber}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setBudgets(response.data.data);
            setMeta(response.data);
            setPage(pageNumber);
        } catch (error) {
            notify('error', 'Erro ao buscar orçamentos.');
            console.error('Erro ao buscar orçamentos:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchBudgets(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
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

    const handleConvertToOrder = (id) => {
        setConfirmModal({
            isOpen: true,
            type: 'primary',
            title: 'Converter em Pedido',
            message: 'Deseja converter este orçamento em um pedido de produção? Esta ação não pode ser desfeita.',
            onConfirm: async () => {
                try {
                    await axios.post(`/api/v1/sales/orders/${id}/convert`);
                    notify('success', 'Orçamento convertido em pedido com sucesso!');
                    fetchBudgets();
                } catch (error) {
                    notify('error', 'Erro ao converter orçamento.');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            type: 'danger',
            title: 'Excluir Orçamento',
            message: 'Deseja excluir definitivamente este orçamento? Esta ação é irreversível.',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/v1/sales/orders/${id}`);
                    notify('success', 'Orçamento excluído com sucesso.');
                    fetchBudgets();
                } catch (error) {
                    notify('error', 'Erro ao excluir orçamento.');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleSendEmail = (budget) => {
        if (!budget.customer?.email) {
            notify('warning', 'Este cliente não possui e-mail cadastrado.');
            return;
        }

        setConfirmModal({
            isOpen: true,
            type: 'primary',
            title: 'Enviar Proposta',
            message: `Deseja enviar a proposta por e-mail para ${budget.customer.email}?`,
            onConfirm: async () => {
                try {
                    await axios.post('/api/v1/sales/proposals/send-email', {
                        to: budget.customer.email,
                        text: `Olá ${budget.customer.name}, segue sua proposta ORD-${budget.id}.`,
                        content: `Valor Total: R$ ${parseFloat(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    });
                    notify('success', 'E-mail enviado com sucesso!');
                } catch (error) {
                    notify('error', 'Erro ao enviar e-mail.');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-amber-100 text-amber-800 border-amber-200',
            production: 'bg-blue-100 text-blue-800 border-blue-200',
            ready: 'bg-green-100 text-green-800 border-green-200',
        };
        const labels = {
            draft: 'Orçamento',
            production: 'Em Produção',
            ready: 'Pronto',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap inline-block shadow-sm ${styles[status] || 'bg-slate-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="w-full space-y-4">
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <h1 className="text-xs font-black uppercase tracking-widest">SCR-005: Lista de Orçamentos e Pedidos</h1>
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
                        <a href="/budgets/new" className="w-full md:w-auto bg-primary-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-tighter hover:bg-primary-700 transition text-center">
                            + Novo Orçamento
                        </a>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full min-w-[800px] text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('id')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    ID <SortIcon field="id" />
                                </th>
                                <th onClick={() => handleSort('customer.name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cliente <SortIcon field="customer.name" />
                                </th>
                                <th onClick={() => handleSort('seller.name')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Vendedor <SortIcon field="seller.name" />
                                </th>
                                <th onClick={() => handleSort('created_at')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Data <SortIcon field="created_at" />
                                </th>
                                <th onClick={() => handleSort('total_value')} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Valor Total <SortIcon field="total_value" />
                                </th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400 text-xs italic">Carregando...</td></tr>
                            ) : budgets.length === 0 ? (
                                <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400 text-xs italic">Nenhum registro encontrado.</td></tr>
                            ) : budgets.map(budget => (
                                <tr key={budget.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">#{budget.id}</td>
                                    <td className="px-4 py-3 text-xs font-bold text-slate-700 uppercase whitespace-nowrap">
                                        {budget.customer ? budget.customer.name : `Cliente #${budget.customer_id}`}
                                    </td>
                                    <td className="px-4 py-3 text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">
                                        {budget.seller ? budget.seller.name : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(budget.created_at)}</td>
                                    <td className="px-4 py-3 text-xs font-black text-slate-900 whitespace-nowrap">R$ {parseFloat(budget.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(budget.status)}</td>
                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                            <button 
                                                onClick={() => setViewingBudget(budget)}
                                                className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-blue-100 transition-colors"
                                            >
                                                Visualizar
                                            </button>
                                            {budget.status === 'draft' && (
                                                <button 
                                                    onClick={() => window.location.href = `/budgets/${budget.id}/edit`}
                                                    className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200 transition-colors"
                                                >
                                                    Editar
                                                </button>
                                            )}
                                            {budget.status === 'draft' && (
                                                <button 
                                                    onClick={() => handleConvertToOrder(budget.id)}
                                                    className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-indigo-100 transition-colors"
                                                >
                                                    Virar Pedido
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setSelectedBudget(budget)}
                                                className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-slate-200 transition-colors"
                                            >
                                                Detalhes
                                            </button>
                                            <button 
                                                onClick={() => handleSendEmail(budget)}
                                                className="bg-purple-50 text-purple-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-purple-100 transition-colors"
                                            >
                                                E-mail
                                            </button>
                                            <button 
                                                onClick={() => sendWhatsApp(budget)}
                                                className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                                title="Enviar orçamento via WhatsApp"
                                            >
                                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                                </svg>
                                                <span>WhatsApp</span>
                                            </button>
                                            {budget.status === 'draft' && (
                                                <button 
                                                    onClick={() => handleDelete(budget.id)}
                                                    className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-red-100 transition-colors"
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination meta={meta} onPageChange={fetchBudgets} />
            </div>

            {selectedBudget && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            Composição do Pedido ORD-{selectedBudget.id}
                        </h2>
                        <button onClick={() => setSelectedBudget(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕ FECHAR</button>
                    </div>
                    <div className="p-4 space-y-4">
                        {selectedBudget.items?.map((item, idx) => (
                            <div key={item.id} className="border border-slate-100 rounded p-3 bg-slate-50/50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black text-indigo-600 uppercase">Peça #{idx+1}: {item.description}</span>
                                    <span className="text-xs font-black text-slate-700">{item.height} x {item.width} cm</span>
                                </div>
                                <div className="pl-4 border-l-2 border-slate-200 space-y-1">
                                    {item.sub_items?.map(sub => (
                                        <div key={sub.id} className="flex justify-between text-[11px]">
                                            <span className="text-slate-500 font-bold uppercase">
                                                {sub.code || sub.product?.code ? <span className="font-mono text-slate-400 mr-1">[{sub.code || sub.product?.code}]</span> : null}
                                                {sub.description} ({sub.quantity}x)
                                                {parseFloat(sub.margin) > 0 && <span className="ml-1 text-primary-600 font-black">[Margem: {parseFloat(sub.margin)}cm]</span>}
                                            </span>
                                            <span className="font-black text-slate-700">R$ {parseFloat(sub.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-100 text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Total da Peça:</span>
                                    <span className="text-xs font-black text-slate-900">R$ {parseFloat(item.item_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingBudget} 
                onClose={() => setViewingBudget(null)} 
                title="Detalhes do Orçamento" 
                data={viewingBudget} 
                fields={[
                    { key: 'id', label: 'Nº do Orçamento', render: (val) => `ORÇ-${val}` },
                    { key: 'customer', label: 'Cliente', render: (val) => val ? val.name : '-' },
                    { key: 'seller', label: 'Vendedor', render: (val) => val ? val.name : '-' },
                    { key: 'status', label: 'Status / Situação', render: (val) => getStatusBadge(val) },
                    { key: 'payments', label: 'Forma de Pagamento', render: (val) => val && val.length > 0 ? val[0].payment_method || 'Informado' : 'Não definida' },
                    { key: 'total_value', label: 'Valor Total', render: (val) => `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                    { 
                        key: 'discount', 
                        label: 'Desconto Total', 
                        render: (val, budget) => {
                            const orderDiscount = parseFloat(budget?.discount || 0);
                            const itemsDiscount = (budget?.items || []).reduce((acc, item) => acc + parseFloat(item.item_discount || 0), 0);
                            const totalDiscount = orderDiscount + itemsDiscount;
                            if (totalDiscount <= 0) return <span className="text-slate-400 font-normal">R$ 0,00</span>;
                            return (
                                <div className="inline-flex flex-col">
                                    <span className="text-rose-600 font-black text-sm">
                                        - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {itemsDiscount > 0 && orderDiscount > 0 && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            (Desconto Geral: R$ {orderDiscount.toFixed(2)} | Desconto dos Itens: R$ {itemsDiscount.toFixed(2)})
                                        </span>
                                    )}
                                </div>
                            );
                        } 
                    },
                    { key: 'created_at', label: 'Data de Emissão', render: (val) => formatDate(val) },
                    { key: 'delivery_date', label: 'Previsão de Entrega', render: (val) => val ? formatDate(val) : 'Não definida' },
                    { key: 'items', label: 'Composição do Orçamento', render: (items) => items && items.length > 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1">
                            <ul className="space-y-2">
                                {items.map((item, idx) => {
                                    const discPct = parseFloat(item.discount_percent || 0);
                                    const discVal = parseFloat(item.item_discount || 0);
                                    return (
                                        <li key={item.id || idx} className="text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-slate-700">Peça #{idx+1}: {item.quantity}x {item.description} ({item.width}x{item.height}cm)</div>
                                                <div className="text-right">
                                                    <div className="text-primary-600 font-black">R$ {parseFloat(item.item_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                    {(discPct > 0 || discVal > 0) && (
                                                        <div className="text-[10px] text-rose-600 font-bold">
                                                            Desc: {discPct > 0 ? `${discPct}%` : ''} {discVal > 0 ? `(-R$ ${discVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {item.sub_items && item.sub_items.length > 0 && (
                                                <ul className="mt-1 pl-3 border-l-2 border-slate-200 space-y-1">
                                                    {item.sub_items.map((sub, sIdx) => (
                                                        <li key={sub.id || sIdx} className="text-[10px] text-slate-500">
                                                            {sub.code || sub.product?.code ? <span className="font-mono text-slate-400 mr-1">[{sub.code || sub.product?.code}]</span> : null}
                                                            {sub.quantity}x {sub.description} - R$ {parseFloat(sub.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : <span className="text-slate-400 italic">Nenhuma peça cadastrada</span> }
                ]}
            />
        </div>
    );
}
