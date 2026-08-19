import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import { useAuth } from '../../Contexts/AuthContext';
import { formatDate } from '../../utils/formatters';
import ConfirmModal from '../../Components/Modals/ConfirmModal';
import AdminPasswordModal from '../../Components/Modals/AdminPasswordModal';
import Pagination from '../../Components/Pagination';
import ViewModal from '../../Components/Modals/ViewModal';
import SettleOrderModal from '../../Components/Modals/SettleOrderModal';
import { sendWhatsApp } from '../../utils/whatsapp';

export default function OrderList() {
    const { notify } = useNotification();
    const { user, activeStore } = useAuth();
    const [orders, setOrders] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingOrder, setViewingOrder] = useState(null);
    const [meta, setMeta] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    // Estado para Modal de Confirmação padrão
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: 'primary', title: '', message: '', onConfirm: null });

    // Estado para Modal de Início de Produção (Selecionar Moldurista)
    const [productionModal, setProductionModal] = useState({ isOpen: false, orderId: null, framerId: '' });

    // Estado para Modal de Registro de Entrega
    const [deliveryModal, setDeliveryModal] = useState({ isOpen: false, orderId: null, date: new Date().toISOString().split('T')[0], observation: '' });

    // Estado para Modal de Resgate de Pedido para Edição
    const [rescueModal, setRescueModal] = useState({ isOpen: false, orderId: null, reason: '', status: '', admin_password: '' });

    // Estado para Modal de Baixa de Pedido
    const [settleModal, setSettleModal] = useState({ isOpen: false, order: null });

    // Estado para Modal de Exclusão com Senha
    const [passwordModal, setPasswordModal] = useState({ isOpen: false, orderId: null });

    const fetchOrders = async (pageNumber = 1, searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/sales/orders?status=production&page=${pageNumber}&search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setOrders(response.data.data);
            setMeta(response.data);
            setPage(pageNumber);
        } catch (error) {
            notify('error', 'Erro ao carregar fila de produção.');
            console.error('Erro ao buscar pedidos:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await axios.get('/api/v1/hr/employees?is_molder=1&limit=100');
            const data = response.data.data || response.data;
            setEmployees(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao buscar molduristas:', error);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchOrders(1, search, sortBy, sortDir);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search, sortBy, sortDir, activeStore?.id]);

    const handleSort = (field) => {
        const newDir = sortBy === field && sortDir === 'asc' ? 'desc' : 'asc';
        setSortBy(field);
        setSortDir(newDir);
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-300 ml-1">⇅</span>;
        return sortDir === 'asc' ? <span className="text-primary-600 ml-1">↑</span> : <span className="text-primary-600 ml-1">↓</span>;
    };

    const handleUpdateStatus = (id, currentStatus) => {
        const statuses = ['confirmed', 'production', 'ready', 'delivered'];
        const currentIndex = statuses.indexOf(currentStatus);
        const nextStatus = statuses[currentIndex + 1];

        if (!nextStatus) {
            notify('warning', 'Este pedido já está no status final ou não pode ser avançado automaticamente.');
            return;
        }

        if (nextStatus === 'production') {
            // Se vai para produção, abre o modal para escolher o moldurista
            setProductionModal({ isOpen: true, orderId: id, framerId: '' });
            return;
        }

        if (nextStatus === 'delivered') {
            // Se for entrega, abre o modal de Baixa do Pedido
            const foundOrder = orders.find(o => o.id === id);
            setSettleModal({ isOpen: true, order: foundOrder });
            return;
        }

        const statusLabels = {
            ready: 'Pronto para Entrega',
            delivered: 'Entregue'
        };

        setConfirmModal({
            isOpen: true,
            type: 'primary',
            title: 'Avançar Status',
            message: `Deseja avançar o status do pedido para "${statusLabels[nextStatus] || nextStatus}"?`,
            onConfirm: async () => {
                try {
                    await axios.patch(`/api/v1/sales/orders/${id}/status`, { status: nextStatus });
                    notify('success', 'Status atualizado com sucesso!');
                    fetchOrders();
                } catch (error) {
                    notify('error', 'Erro ao atualizar status.');
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleStartProduction = async () => {
        if (!productionModal.framerId) {
            notify('warning', 'Selecione um funcionário/moldurista responsável.');
            return;
        }

        try {
            await axios.patch(`/api/v1/sales/orders/${productionModal.orderId}/status`, {
                status: 'production',
                framer_id: productionModal.framerId
            });
            notify('success', 'Pedido enviado para produção com sucesso!');
            setProductionModal({ isOpen: false, orderId: null, framerId: '' });
            fetchOrders();
        } catch (error) {
            notify('error', 'Erro ao enviar para produção.');
        }
    };

    const handleRegisterDelivery = async () => {
        if (!deliveryModal.date) {
            notify('warning', 'A data da entrega é obrigatória.');
            return;
        }

        try {
            await axios.patch(`/api/v1/sales/orders/${deliveryModal.orderId}/status`, {
                status: 'delivered',
                delivered_at: `${deliveryModal.date} 12:00:00`,
                delivery_observation: deliveryModal.observation
            });
            notify('success', 'Entrega registrada com sucesso!');
            setDeliveryModal({ isOpen: false, orderId: null, date: '', observation: '' });
            fetchOrders();
        } catch (error) {
            notify('error', 'Erro ao registrar entrega.');
        }
    };

    const handleRescueOrder = async () => {
        if (!rescueModal.reason || !rescueModal.reason.trim()) {
            notify('warning', 'O motivo da edição é obrigatório para resgatar o pedido.');
            return;
        }

        const requiresAdmin = ['production', 'ready', 'delivered'].includes(rescueModal.status);
        if (requiresAdmin && !rescueModal.admin_password) {
            notify('warning', 'A senha de administrador é obrigatória para editar este pedido.');
            return;
        }

        try {
            const payload = {
                reason: rescueModal.reason.trim(),
                user_name: user?.name || 'Usuário do Sistema'
            };
            
            if (requiresAdmin) {
                payload.admin_password = rescueModal.admin_password;
            }

            await axios.post(`/api/v1/sales/orders/${rescueModal.orderId}/rescue`, payload);
            notify('success', 'Motivo registrado com sucesso! Redirecionando...');
            setRescueModal({ isOpen: false, orderId: null, reason: '', status: '', admin_password: '' });
            window.location.href = `/budgets/${rescueModal.orderId}/edit`;
        } catch (error) {
            notify('error', error.response?.data?.message || 'Erro ao registrar resgate do pedido.');
        }
    };

    const handleDelete = (id) => {
        setPasswordModal({ isOpen: true, orderId: id });
    };

    const confirmDelete = async (password) => {
        try {
            await axios.delete(`/api/v1/sales/orders/${passwordModal.orderId}`, {
                data: { admin_password: password }
            });
            notify('success', 'Pedido excluído com sucesso.');
            setPasswordModal({ isOpen: false, orderId: null });
            fetchOrders();
        } catch (error) {
            notify('error', error.response?.data?.message || 'Erro ao excluir pedido. Verifique a senha.');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            confirmed: 'bg-amber-100 text-amber-800 border-amber-200',
            production: 'bg-blue-100 text-blue-800 border-blue-200',
            ready: 'bg-green-100 text-green-800 border-green-200',
            delivered: 'bg-purple-100 text-purple-800 border-purple-200',
        };
        const labels = {
            confirmed: 'Confirmado',
            production: 'Em Produção',
            ready: 'Pronto',
            delivered: 'Entregue',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap inline-block shadow-xs ${styles[status] || 'bg-slate-100'}`}>
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

            <AdminPasswordModal 
                isOpen={passwordModal.isOpen}
                onClose={() => setPasswordModal({ isOpen: false, orderId: null })}
                onConfirm={confirmDelete}
                title="Excluir Pedido"
                message="Deseja excluir definitivamente este pedido? Esta ação é irreversível e exige a senha de um administrador."
            />

            {/* Modal de Início de Produção */}
            {productionModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className="bg-primary-600 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-white font-black text-lg uppercase tracking-widest">Iniciar Produção</h2>
                            <button onClick={() => setProductionModal({ isOpen: false, orderId: null, framerId: '' })} className="text-white/70 hover:text-white transition">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Moldurista / Mão de Obra</label>
                                <select
                                    className="w-full border-slate-200 rounded-xl focus:border-primary-500 focus:ring-primary-500 text-sm font-bold h-12 bg-slate-50"
                                    value={productionModal.framerId}
                                    onChange={e => setProductionModal({ ...productionModal, framerId: e.target.value })}
                                >
                                    <option value="">Selecione o moldurista responsável...</option>
                                    {employees.length === 0 ? (
                                        <option value="" disabled>Nenhum moldurista cadastrado</option>
                                    ) : (
                                        employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end space-x-3">
                            <button
                                onClick={() => setProductionModal({ isOpen: false, orderId: null, framerId: '' })}
                                className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleStartProduction}
                                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-primary-600 text-white rounded-xl shadow-xl shadow-primary-500/30 hover:bg-primary-700 transition"
                            >
                                Iniciar Produção
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Registro de Entrega */}
            {deliveryModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className="bg-purple-600 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-white font-black text-lg uppercase tracking-widest">Registrar Entrega</h2>
                            <button onClick={() => setDeliveryModal({ isOpen: false, orderId: null, date: '', observation: '' })} className="text-white/70 hover:text-white transition">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Data Realizada da Entrega</label>
                                <input
                                    type="date"
                                    className="w-full border-slate-200 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-sm font-bold h-12 bg-slate-50"
                                    value={deliveryModal.date}
                                    onChange={e => setDeliveryModal({ ...deliveryModal, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Observação (Opcional)</label>
                                <textarea
                                    className="w-full border-slate-200 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-sm bg-slate-50"
                                    rows="3"
                                    placeholder="Ex: Entregue para o vizinho, cliente retirou na loja..."
                                    value={deliveryModal.observation}
                                    onChange={e => setDeliveryModal({ ...deliveryModal, observation: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end space-x-3">
                            <button
                                onClick={() => setDeliveryModal({ isOpen: false, orderId: null, date: '', observation: '' })}
                                className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRegisterDelivery}
                                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-purple-600 text-white rounded-xl shadow-xl shadow-purple-500/30 hover:bg-purple-700 transition"
                            >
                                Confirmar Entrega
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Resgate de Pedido para Edição */}
            {rescueModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
                        <div className="bg-amber-500 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-white font-black text-lg uppercase tracking-widest">Resgatar Pedido (Editar)</h2>
                            <button onClick={() => setRescueModal({ isOpen: false, orderId: null, reason: '', status: '', admin_password: '' })} className="text-white/70 hover:text-white transition">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium">
                                <strong>Atenção:</strong> Resgatar este pedido permitirá reeditá-lo no orçamento. Esta ação ficará registrada em log para auditoria.
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Motivo da Edição <span className="text-red-500">*</span></label>
                                <textarea
                                    className="w-full border-slate-200 rounded-xl focus:border-amber-500 focus:ring-amber-500 text-sm bg-slate-50 font-medium"
                                    rows="4"
                                    placeholder="Informe por que o pedido está sendo alterado (Ex: Mudança nas medidas a pedido do cliente, troca de material...)"
                                    value={rescueModal.reason}
                                    onChange={e => setRescueModal({ ...rescueModal, reason: e.target.value })}
                                ></textarea>
                            </div>
                            
                            {['production', 'ready', 'delivered'].includes(rescueModal.status) && (
                                <div className="mt-4 pt-4 border-t border-amber-200">
                                    <label className="block text-xs font-black uppercase text-amber-700 mb-2 tracking-widest">Senha de Administrador <span className="text-red-500">*</span></label>
                                    <div className="p-3 bg-white/50 border border-amber-200 text-amber-800 text-xs rounded-xl font-medium mb-3">
                                        Este pedido está em <strong>{rescueModal.status === 'delivered' ? 'Entregue' : (rescueModal.status === 'ready' ? 'Pronto' : 'Produção')}</strong>. Somente administradores podem forçar a edição.
                                    </div>
                                    <input
                                        type="password"
                                        className="w-full border-slate-200 rounded-xl focus:border-amber-500 focus:ring-amber-500 text-sm bg-white font-medium shadow-inner"
                                        placeholder="Digite a senha de administrador"
                                        value={rescueModal.admin_password || ''}
                                        onChange={e => setRescueModal({ ...rescueModal, admin_password: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end space-x-3">
                            <button
                                onClick={() => setRescueModal({ isOpen: false, orderId: null, reason: '', status: '', admin_password: '' })}
                                className="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-200 rounded-xl transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRescueOrder}
                                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest bg-amber-500 text-white rounded-xl shadow-xl shadow-amber-500/30 hover:bg-amber-600 transition"
                            >
                                Confirmar e Editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xs font-black uppercase tracking-widest">Fila de Produção e Pedidos</h1>
                        {activeStore && (
                            <span className="bg-primary-500/20 text-primary-300 border border-primary-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                🏢 {activeStore.name}
                            </span>
                        )}
                    </div>
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
                        <div className="hidden md:flex space-x-2">
                            <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter self-center">Filtros: Todos os Pedidos Confirmados</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto scroller-thin">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th onClick={() => handleSort('id')} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Pedido <SortIcon field="id" />
                                </th>
                                <th onClick={() => handleSort('customer.name')} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors">
                                    Cliente <SortIcon field="customer.name" />
                                </th>
                                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    Moldurista
                                </th>
                                <th onClick={() => handleSort('delivery_date')} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Data <SortIcon field="delivery_date" />
                                </th>
                                <th onClick={() => handleSort('total_value')} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Valor <SortIcon field="total_value" />
                                </th>
                                <th onClick={() => handleSort('status')} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors">
                                    Status <SortIcon field="status" />
                                </th>
                                <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-xs italic">Carregando fila de produção...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-400 text-xs italic">Nenhum pedido na fila de produção no momento.</td></tr>
                            ) : orders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-2 py-1.5 text-xs font-mono font-bold text-indigo-600 whitespace-nowrap">
                                        ORD-{order.id}
                                    </td>
                                    <td className="px-2 py-1.5 text-xs font-bold text-slate-700 uppercase">
                                        <div className="truncate max-w-[140px] md:max-w-[200px]" title={order.customer ? order.customer.name : `Cliente #${order.customer_id}`}>
                                            {order.customer ? order.customer.name : `Cliente #${order.customer_id}`}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-medium normal-case truncate max-w-[140px] mt-0.5">Vend: {order.seller ? order.seller.name : 'N/A'}</div>
                                    </td>
                                    <td className="px-2 py-1.5 text-[10px] text-slate-500 font-bold uppercase whitespace-nowrap">
                                        {order.framer ? (
                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200 inline-block max-w-[110px] truncate align-bottom" title={order.framer.name}>
                                                {order.framer.name}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(order.created_at)}</td>
                                    <td className="px-2 py-1.5 text-xs font-black text-slate-900 whitespace-nowrap">R$ {parseFloat(order.total_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="px-2 py-1.5 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                                    <td className="px-2 py-1.5 text-xs whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                            <button 
                                                onClick={() => setViewingOrder(order)}
                                                className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 hover:scale-105 transition-all shadow-2xs"
                                                title="Ver Detalhes do Pedido"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => setRescueModal({ isOpen: true, orderId: order.id, reason: '', status: order.status, admin_password: '' })}
                                                className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200/60 rounded-md hover:bg-amber-100 hover:scale-105 transition-all shadow-2xs"
                                                title="Resgatar para Edição"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => window.open(`/orders/${order.id}/print`, '_blank')}
                                                className="p-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 hover:scale-105 transition-all shadow-2xs"
                                                title="Imprimir Ordem de Serviço (PDF)"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                </svg>
                                            </button>
                                            <button 
                                                onClick={() => sendWhatsApp(order)}
                                                className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-md hover:bg-emerald-100 hover:scale-105 transition-all shadow-2xs flex items-center justify-center"
                                                title="Enviar Resumo e PDF via WhatsApp"
                                            >
                                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                                </svg>
                                            </button>
                                            {order.status === 'ready' && (
                                                <button 
                                                    onClick={() => setSettleModal({ isOpen: true, order })}
                                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md hover:scale-105 transition-all shadow-2xs"
                                                    title="Dar Baixa no Pedido (Informar Pagamento Restante)"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            )}
                                            {order.status !== 'delivered' && order.status !== 'finished' && (
                                                <button 
                                                    onClick={() => handleUpdateStatus(order.id, order.status)}
                                                    className="p-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 hover:scale-105 transition-all shadow-2xs"
                                                    title="Avançar para o Próximo Status"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleDelete(order.id)}
                                                className="p-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 hover:scale-105 transition-all shadow-2xs"
                                                title="Excluir Pedido"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="border-t border-slate-100">
                    <Pagination meta={meta} onPageChange={fetchOrders} />
                </div>
            </div>

            <ViewModal 
                isOpen={!!viewingOrder} 
                onClose={() => setViewingOrder(null)} 
                title="Detalhes do Pedido" 
                data={viewingOrder} 
                fields={[
                    { key: 'id', label: 'Nº do Pedido', render: (val) => `ORD-${val}` },
                    { key: 'customer', label: 'Cliente', render: (val) => val ? val.name : '-' },
                    { key: 'seller', label: 'Vendedor', render: (val) => val ? val.name : '-' },
                    { key: 'framer', label: 'Moldurista', render: (val) => val ? val.name : 'Não atribuído' },
                    { key: 'status', label: 'Status', render: (val) => getStatusBadge(val) },
                    { key: 'total_value', label: 'Valor Total', render: (val) => `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                    { 
                        key: 'discount', 
                        label: 'Desconto Total', 
                        render: (val, order) => {
                            const orderDiscount = parseFloat(order?.discount || 0);
                            const itemsDiscount = (order?.items || []).reduce((acc, item) => acc + parseFloat(item.item_discount || 0), 0);
                            const totalDiscount = orderDiscount + itemsDiscount;
                            if (totalDiscount <= 0) return <span className="text-slate-400 font-normal">R$ 0,00</span>;
                            return (
                                <div className="inline-flex flex-col">
                                    <span className="text-rose-600 font-black text-sm">
                                        - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    {itemsDiscount > 0 && orderDiscount > 0 && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            (Desconto do Pedido: R$ {orderDiscount.toFixed(2)} | Desconto dos Itens: R$ {itemsDiscount.toFixed(2)})
                                        </span>
                                    )}
                                </div>
                            );
                        } 
                    },
                    { key: 'created_at', label: 'Data do Pedido', render: (val) => formatDate(val) },
                    { key: 'delivery_date', label: 'Previsão de Entrega', render: (val) => val ? formatDate(val) : 'Não definida' },
                    { key: 'delivered_at', label: 'Data Real da Entrega', render: (val) => val ? formatDate(val) : '-' },
                    { key: 'delivery_observation', label: 'Observação da Entrega', render: (val) => val || '-' },
                    { key: 'items', label: 'Itens do Pedido', render: (items) => items && items.length > 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1">
                            <ul className="space-y-2">
                                {items.map(item => {
                                    const discPct = parseFloat(item.discount_percent || 0);
                                    const discVal = parseFloat(item.item_discount || 0);
                                    return (
                                        <li key={item.id} className="text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start">
                                                <div className="font-bold text-slate-700">{item.quantity}x {item.description} ({item.width}x{item.height}cm)</div>
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
                                                    {item.sub_items.map(sub => (
                                                        <li key={sub.id} className="text-[10px] text-slate-500">
                                                            {sub.code || sub.product?.code ? <span className="font-mono text-slate-400 mr-1">[{sub.code || sub.product?.code}]</span> : null}
                                                            {sub.quantity}x {sub.description}
                                                            {parseFloat(sub.margin) > 0 && <span className="ml-1 text-primary-600 font-bold">[Margem: {parseFloat(sub.margin)}cm]</span>}
                                                            {' '}- R$ {parseFloat(sub.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : <span className="text-slate-400 italic">Nenhum item</span> },
                    { key: 'edit_logs', label: 'Histórico de Resgates e Edições', render: (logs) => logs && logs.length > 0 ? (
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 mt-1 space-y-2.5">
                            {logs.map(log => (
                                <div key={log.id} className="text-xs pb-2 border-b border-amber-200/60 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center font-bold text-amber-900">
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                            {log.user_name}
                                        </span>
                                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold border border-amber-200/50">{formatDate(log.created_at)}</span>
                                    </div>
                                    <div className="text-amber-800 mt-1.5 pl-2 border-l-2 border-amber-400 font-medium italic">"{log.reason}"</div>
                                </div>
                            ))}
                        </div>
                    ) : <span className="text-slate-400 text-xs italic">Nenhum registro de reedição</span> }
                ]}
            />

            <SettleOrderModal 
                isOpen={settleModal.isOpen}
                onClose={() => setSettleModal({ isOpen: false, order: null })}
                order={settleModal.order}
                onSuccess={() => fetchOrders()}
                notify={notify}
            />
        </div>
    );
}
