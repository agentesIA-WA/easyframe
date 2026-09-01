import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PaymentMethodQuickModal from './PaymentMethodQuickModal';

export default function SettleOrderModal({ isOpen, onClose, order, onSuccess, notify }) {
    if (!isOpen || !order) return null;

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentList, setPaymentList] = useState([]);
    const [draftPayment, setDraftPayment] = useState({
        payment_method_id: '',
        value: '',
        installments: 1,
        cheque_number: '',
        cheque_agency: '',
        cheque_account: '',
        card_brand: '',
        observation: ''
    });

    const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryObservation, setDeliveryObservation] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMethods, setLoadingMethods] = useState(true);
    const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
    const [showAdminOverride, setShowAdminOverride] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    const totalValue = parseFloat(order.total_value || order.total_sales || 0);

    const alreadyAllocated = (order.payments || []).reduce((acc, p) => {
        if (p.status === 'C' || p.status === 'CANCELADO') return acc;
        
        const pm = paymentMethods.find(m => 
            (p.payment_method_id && m.id == p.payment_method_id) || 
            (p.payment_method && m.description.toUpperCase() === p.payment_method.toUpperCase())
        );
        if (pm && pm.is_placeholder) return acc;

        return acc + parseFloat(p.value || 0);
    }, 0);

    const remainingBalance = Math.max(0, parseFloat((totalValue - alreadyAllocated).toFixed(2)));
    const allocatedTotal = paymentList.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
    const balanceDiff = parseFloat((remainingBalance - allocatedTotal).toFixed(2));
    const isBalanceValid = remainingBalance <= 0.01 || Math.abs(balanceDiff) <= 0.01;

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const response = await axios.get('/api/v1/core/payment-methods');
                const data = response.data.data || response.data;
                const methods = Array.isArray(data) ? data : [];
                setPaymentMethods(methods);
                
                if (remainingBalance > 0.01) {
                    setPaymentList([]);
                } else {
                    setPaymentList([]);
                }
            } catch (err) {
                console.error('Erro ao carregar formas de pagamento:', err);
            } finally {
                setLoadingMethods(false);
            }
        };

        if (isOpen) {
            fetchPaymentMethods();
            setDeliveredAt(new Date().toISOString().split('T')[0]);
            setDeliveryObservation(order.delivery_observation || '');
        }
    }, [isOpen, order]);

    useEffect(() => {
        // Atualiza apenas se não estiver editando algo da tabela que tenha trazido seu próprio valor
        setDraftPayment(prev => {
            if (!prev.payment_method_id && balanceDiff > 0) {
                return { ...prev, value: balanceDiff.toFixed(2) };
            }
            if (balanceDiff <= 0 && !prev.value) {
                return { ...prev, value: '0.00' };
            }
            return prev;
        });
    }, [balanceDiff]);

    const handleAddDraftToCart = () => {
        if (!draftPayment.payment_method_id) {
            if (notify) notify('warning', 'Selecione a forma de pagamento primeiro.');
            return;
        }
        if (parseFloat(draftPayment.value) <= 0) {
            if (notify) notify('warning', 'O valor deve ser maior que zero.');
            return;
        }
        if (balanceDiff < 0) {
            if (notify) notify('warning', 'O valor excede o saldo restante do pedido.');
            // Allow them to proceed, logic will block at submit
        }

        setPaymentList([...paymentList, { ...draftPayment, id: Date.now() }]);
        
        setDraftPayment({
            payment_method_id: '',
            value: Math.max(0, balanceDiff - parseFloat(draftPayment.value)).toFixed(2),
            installments: 1,
            cheque_number: '',
            cheque_agency: '',
            cheque_account: '',
            card_brand: '',
            observation: ''
        });
    };

    const handleEditPaymentFromCart = (id) => {
        const itemToEdit = paymentList.find(p => p.id === id);
        if (itemToEdit) {
            setDraftPayment(itemToEdit);
            setPaymentList(paymentList.filter(p => p.id !== id));
        }
    };

    const handleRemovePaymentFromCart = (id) => {
        setPaymentList(paymentList.filter(p => p.id !== id));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (remainingBalance > 0.01 && !showAdminOverride) {
            if (!isBalanceValid) {
                if (notify) notify('warning', `A soma das formas de pagamento deve ser exatamente R$ ${remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
                return;
            }
            if (paymentList.some(p => !p.payment_method_id)) {
                if (notify) notify('warning', 'Forma de pagamento inválida na lista.');
                return;
            }
            
            const aPagarNaEntregaId = paymentMethods.find(pm => pm.description.toUpperCase() === 'A PAGAR NA ENTREGA')?.id;
            if (aPagarNaEntregaId && paymentList.some(p => p.payment_method_id == aPagarNaEntregaId)) {
                if (notify) notify('warning', 'Você não pode concluir a baixa usando "A PAGAR NA ENTREGA". Informe a forma de pagamento real (Pix, Dinheiro, Cartão) que o cliente utilizou.');
                return;
            }
        }

        if (showAdminOverride && !adminPassword) {
            if (notify) notify('warning', 'Digite a senha do administrador para liberar a baixa.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                payments: remainingBalance > 0.01 && !showAdminOverride ? paymentList.map(p => ({
                    payment_method_id: p.payment_method_id,
                    value: parseFloat(p.value) || 0,
                    installments: parseInt(p.installments) || 1,
                    cheque_number: p.cheque_number || null,
                    cheque_agency: p.cheque_agency || null,
                    cheque_account: p.cheque_account || null,
                    card_brand: p.card_brand || null,
                    observation: p.observation || null,
                })) : [],
                delivered_at: deliveredAt ? `${deliveredAt} 12:00:00` : null,
                delivery_observation: deliveryObservation,
                is_unpaid_override: showAdminOverride,
                admin_password: adminPassword
            };

            const res = await axios.post(`/api/v1/sales/orders/${order.id}/settle`, payload);
            if (notify) notify('success', res.data.message || 'Baixa do pedido realizada com sucesso!');
            if (onSuccess) onSuccess(res.data.order);
            onClose();
        } catch (err) {
            console.error('Erro ao baixar pedido:', err);
            const msg = err.response?.data?.message || 'Erro ao realizar baixa do pedido.';
            if (notify) notify('error', msg);
        } finally {
            setLoading(false);
        }
    };

    const selectedDraftPm = paymentMethods.find(pm => pm.id == draftPayment.payment_method_id);
    const isDraftCheque = selectedDraftPm ? selectedDraftPm.description.toUpperCase().includes('CHEQUE') : false;
    const isDraftCard = selectedDraftPm ? (selectedDraftPm.description.toUpperCase().includes('CARTÃO') || selectedDraftPm.description.toUpperCase().includes('CARTAO')) : false;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-[slideUp_0.3s_ease-out] my-auto border border-slate-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-primary-900 to-indigo-950 px-6 py-5 flex justify-between items-center text-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase rounded border border-emerald-500/30">
                                Fluxo de Baixa
                            </span>
                            <h2 className="font-black text-lg uppercase tracking-wider">Baixar Pedido #{order.id}</h2>
                        </div>
                        <p className="text-xs text-slate-300 font-medium mt-0.5">
                            Cliente: <span className="text-white font-bold">{order.customer?.name || 'CLIENTE DIVERSOS'}</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Finance Summary Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="text-xs font-black uppercase tracking-wider text-slate-500 flex justify-between items-center border-b border-slate-200 pb-2">
                            <span>Resumo Financeiro do Pedido</span>
                            <span className="text-[10px] font-bold text-slate-400">Total vs Quitado</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Valor Total</span>
                                <span className="text-sm font-black text-slate-900">
                                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Valor Alocado</span>
                                <span className="text-sm font-black text-indigo-600">
                                    R$ {alreadyAllocated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            <div className={`p-2.5 rounded-xl border shadow-2xs ${remainingBalance > 0.01 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                                <span className="block text-[10px] font-bold uppercase opacity-80">Saldo Restante</span>
                                <span className="text-sm font-black">
                                    R$ {remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {remainingBalance <= 0.01 ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                <span>Pedido 100% quitado! A confirmação alterará a situação do pedido para <strong>Entregue</strong>.</span>
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium">
                                Restam <strong>R$ {remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> a pagar. Distribua o valor adicionando lançamentos abaixo.
                            </div>
                        )}
                    </div>

                    {/* Multi-Payment Draft & Cart Section */}
                    {remainingBalance > 0.01 && (
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            {/* DRAFT FORM (Top) */}
                            {balanceDiff > 0 && (
                                <div className="bg-white p-4 rounded-2xl border-2 border-indigo-50 shadow-sm relative overflow-visible">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                        Novo Lançamento
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                        <div className="sm:col-span-4">
                                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                                Forma de Pagamento
                                            </label>
                                            <div className="flex items-center gap-1.5">
                                                <select
                                                    className="flex-1 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 text-xs font-bold h-9 bg-white"
                                                    value={draftPayment.payment_method_id}
                                                    onChange={(e) => setDraftPayment({ ...draftPayment, payment_method_id: e.target.value })}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {!loadingMethods && paymentMethods.map((pm) => (
                                                        <option key={pm.id} value={pm.id}>
                                                            {pm.description} {pm.is_cash ? '(À Vista)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsQuickModalOpen(true)}
                                                    className="h-9 px-2.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-200 hover:text-slate-900 transition-colors flex items-center justify-center"
                                                    title="Cadastrar Nova Forma de Pagamento"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                                Valor (R$)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                className="w-full border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 text-xs font-black h-9 text-right"
                                                value={draftPayment.value}
                                                onChange={(e) => setDraftPayment({ ...draftPayment, value: e.target.value })}
                                            />
                                        </div>

                                        {!selectedDraftPm?.is_cash ? (
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                                    Parcelas
                                                </label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="36"
                                                    className="w-full border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 text-xs font-bold h-9 text-center"
                                                    value={draftPayment.installments}
                                                    onChange={(e) => setDraftPayment({ ...draftPayment, installments: e.target.value })}
                                                />
                                            </div>
                                        ) : (
                                            <div className="sm:col-span-2 flex items-center justify-center h-9">
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase">À Vista</span>
                                            </div>
                                        )}

                                        <div className="sm:col-span-3">
                                            <button
                                                type="button"
                                                onClick={handleAddDraftToCart}
                                                className="w-full h-9 bg-indigo-600 text-white rounded-lg font-black text-[10px] tracking-widest uppercase flex items-center justify-center hover:bg-indigo-700 transition shadow-sm gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>

                                    {/* Draft Extras */}
                                    {(isDraftCard || isDraftCheque) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-slate-100">
                                            {isDraftCard && (
                                                <div className="sm:col-span-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Bandeira do Cartão (ex: Mastercard...)"
                                                        className="w-full border-slate-200 rounded-lg text-xs h-8"
                                                        value={draftPayment.card_brand || ''}
                                                        onChange={(e) => setDraftPayment({ ...draftPayment, card_brand: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                            {isDraftCheque && (
                                                <>
                                                    <input type="text" placeholder="Nº Cheque" className="w-full border-slate-200 rounded-lg text-xs h-8" value={draftPayment.cheque_number || ''} onChange={(e) => setDraftPayment({ ...draftPayment, cheque_number: e.target.value })} />
                                                    <input type="text" placeholder="Agência" className="w-full border-slate-200 rounded-lg text-xs h-8" value={draftPayment.cheque_agency || ''} onChange={(e) => setDraftPayment({ ...draftPayment, cheque_agency: e.target.value })} />
                                                    <div className="sm:col-span-2">
                                                        <input type="text" placeholder="Conta" className="w-full border-slate-200 rounded-lg text-xs h-8" value={draftPayment.cheque_account || ''} onChange={(e) => setDraftPayment({ ...draftPayment, cheque_account: e.target.value })} />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CART TABLE (Bottom) */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Lançamentos Adicionados ({paymentList.length})
                                    </h3>
                                    <div className={`text-[10px] font-bold px-2 py-1 rounded border ${isBalanceValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                        Distribuído: R$ {allocatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                
                                {paymentList.length === 0 ? (
                                    <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs font-medium bg-slate-50/50">
                                        Nenhum lançamento adicionado.<br/>Preencha o formulário acima e clique em Adicionar.
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-3 py-2">Forma</th>
                                                    <th className="px-3 py-2 text-right">Valor (R$)</th>
                                                    <th className="px-3 py-2 text-center">Parcelas/Dia</th>
                                                    <th className="px-3 py-2 text-center w-16">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {paymentList.map((p) => {
                                                    const pm = paymentMethods.find(m => m.id == p.payment_method_id);
                                                    return (
                                                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                                                            <td className="px-3 py-2.5 font-bold text-slate-700">
                                                                {pm ? pm.description : 'Desconhecida'}
                                                                {(p.card_brand || p.cheque_number) && (
                                                                    <span className="block text-[9px] font-normal text-slate-400 mt-0.5">
                                                                        {p.card_brand || `Cheque: ${p.cheque_number}`}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-black text-slate-900">
                                                                {parseFloat(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium">
                                                                {pm?.is_cash ? (
                                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">À VISTA</span>
                                                                ) : (
                                                                    `${p.installments}x`
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                    <button type="button" onClick={() => handleEditPaymentFromCart(p.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Editar este lançamento">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                                                    </button>
                                                                    <button type="button" onClick={() => handleRemovePaymentFromCart(p.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded" title="Excluir">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Delivery Section */}
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Registro da Entrega / Conclusão
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                    Data da Entrega <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full border-slate-200 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-xs font-bold h-10 bg-slate-50"
                                    value={deliveredAt}
                                    onChange={(e) => setDeliveredAt(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                                    Observação da Entrega
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Retirado pelo cliente..."
                                    className="w-full border-slate-200 rounded-xl focus:border-purple-500 focus:ring-purple-500 text-xs bg-slate-50"
                                    value={deliveryObservation}
                                    onChange={(e) => setDeliveryObservation(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Admin Override Section */}
                    {remainingBalance > 0.01 && (
                        <div className="border-t border-slate-100 pt-4">
                            {!showAdminOverride ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAdminOverride(true)}
                                    className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-700 underline decoration-amber-300 underline-offset-4 flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                    Liberação Admin (Entregar sem quitar)
                                </button>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1.5 mb-1">
                                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                                                Autorização de Entrega
                                            </h4>
                                            <p className="text-[10px] font-bold text-amber-700">Esta ação liquidará o pedido sem receber o valor pendente, registrando auditoria no sistema.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAdminOverride(false);
                                                setAdminPassword('');
                                            }}
                                            className="text-amber-600 hover:text-amber-800 p-1"
                                            title="Cancelar Liberação"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                    <div>
                                        <input
                                            type="password"
                                            placeholder="Digite a Senha do Administrador"
                                            className="w-full sm:w-64 border-amber-300 rounded-lg focus:border-amber-500 focus:ring-amber-500 text-xs h-9 bg-white"
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Footer */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded-xl transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (remainingBalance > 0.01 && !isBalanceValid && !showAdminOverride)}
                            className={`px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${showAdminOverride ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'}`}
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={showAdminOverride ? "M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" : "M5 13l4 4L19 7"} />
                                    </svg>
                                    <span>{showAdminOverride ? "Confirmar Liberação" : "Concluir Baixa do Pedido"}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            
            <PaymentMethodQuickModal
                isOpen={isQuickModalOpen}
                onClose={() => setIsQuickModalOpen(false)}
                onSaved={(newMethod) => {
                    setPaymentMethods(prev => [...prev, newMethod]);
                    // Auto-seleciona a forma criada no rascunho
                    setDraftPayment(prev => ({ ...prev, payment_method_id: newMethod.id }));
                }}
            />
        </div>
    );
}
