import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function SettleOrderModal({ isOpen, onClose, order, onSuccess, notify }) {
    if (!isOpen || !order) return null;

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [paymentList, setPaymentList] = useState([]);
    const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryObservation, setDeliveryObservation] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingMethods, setLoadingMethods] = useState(true);

    const totalValue = parseFloat(order.total_value || order.total_sales || 0);

    const alreadyPaid = (order.payments || []).reduce((acc, p) => {
        const val = parseFloat(p.paid_value || p.value || 0);
        if (p.status === 'P' || p.paid_at) {
            return acc + (val > 0 ? val : parseFloat(p.value || 0));
        }
        return acc;
    }, 0);

    const remainingBalance = Math.max(0, parseFloat((totalValue - alreadyPaid).toFixed(2)));

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            try {
                const response = await axios.get('/api/v1/core/payment-methods');
                const data = response.data.data || response.data;
                const methods = Array.isArray(data) ? data : [];
                setPaymentMethods(methods);
                
                const defaultPmId = methods.length > 0 ? methods[0].id : '';

                if (remainingBalance > 0.01) {
                    const openPayments = (order.payments || []).filter(p => p.status !== 'P' && !p.paid_at);

                    if (openPayments.length > 0) {
                        const mapped = openPayments.map((p, idx) => {
                            const foundPm = methods.find(pm => 
                                pm.description.toLowerCase() === String(p.payment_method || '').toLowerCase() || 
                                pm.id == p.payment_method
                            );
                            return {
                                id: `open-p-${idx}-${Date.now()}`,
                                payment_method_id: foundPm ? foundPm.id : defaultPmId,
                                value: parseFloat(p.value || 0).toFixed(2),
                                installments: p.installment_number || 1,
                                cheque_number: p.cheque_number || '',
                                cheque_agency: p.cheque_agency || '',
                                cheque_account: p.cheque_account || '',
                                card_brand: p.card_brand || '',
                                observation: p.observation || ''
                            };
                        });
                        setPaymentList(mapped);
                    } else {
                        setPaymentList([
                            {
                                id: Date.now(),
                                payment_method_id: defaultPmId,
                                value: remainingBalance.toFixed(2),
                                installments: 1,
                                cheque_number: '',
                                cheque_agency: '',
                                cheque_account: '',
                                card_brand: '',
                                observation: ''
                            }
                        ]);
                    }
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

    const handleAddPaymentLine = () => {
        const currentSum = paymentList.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
        const leftToDistribute = Math.max(0, parseFloat((remainingBalance - currentSum).toFixed(2)));
        const defaultPmId = paymentMethods.length > 0 ? paymentMethods[0].id : '';

        setPaymentList([
            ...paymentList,
            {
                id: Date.now(),
                payment_method_id: defaultPmId,
                value: leftToDistribute > 0 ? leftToDistribute.toFixed(2) : '0.00',
                installments: 1,
                cheque_number: '',
                cheque_agency: '',
                cheque_account: '',
                card_brand: '',
                observation: ''
            }
        ]);
    };

    const handleUpdatePaymentLine = (id, field, val) => {
        setPaymentList(paymentList.map(item => {
            if (item.id === id) {
                return { ...item, [field]: val };
            }
            return item;
        }));
    };

    const handleRemovePaymentLine = (id) => {
        if (paymentList.length === 1) {
            if (notify) notify('warning', 'É necessário manter ao menos uma forma de pagamento para o saldo restante.');
            return;
        }
        setPaymentList(paymentList.filter(item => item.id !== id));
    };

    const handleAutoAdjustLastLine = () => {
        if (paymentList.length === 0) return;
        const currentSumExceptLast = paymentList.slice(0, -1).reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
        const requiredForLast = Math.max(0, parseFloat((remainingBalance - currentSumExceptLast).toFixed(2)));

        setPaymentList(paymentList.map((item, index) => {
            if (index === paymentList.length - 1) {
                return { ...item, value: requiredForLast.toFixed(2) };
            }
            return item;
        }));
    };

    const allocatedTotal = paymentList.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
    const balanceDiff = parseFloat((remainingBalance - allocatedTotal).toFixed(2));
    const isBalanceValid = remainingBalance <= 0.01 || Math.abs(balanceDiff) <= 0.01;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (remainingBalance > 0.01) {
            if (!isBalanceValid) {
                if (notify) notify('warning', `A soma das formas de pagamento deve ser exatamente R$ ${remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
                return;
            }
            if (paymentList.some(p => !p.payment_method_id)) {
                if (notify) notify('warning', 'Selecione a forma de pagamento para todas as linhas cadastradas.');
                return;
            }
            if (paymentList.some(p => (parseFloat(p.value) || 0) <= 0)) {
                if (notify) notify('warning', 'O valor de cada forma de pagamento deve ser maior que zero.');
                return;
            }
        }

        setLoading(true);

        try {
            const payload = {
                payments: remainingBalance > 0.01 ? paymentList.map(p => ({
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
                                <span className="block text-[10px] font-bold text-slate-400 uppercase">Já Pago</span>
                                <span className="text-sm font-black text-emerald-600">
                                    R$ {alreadyPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                Restam <strong>R$ {remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> a pagar. Você pode distribuir o valor restante em uma ou <strong>mais formas de pagamento</strong> abaixo.
                            </div>
                        )}
                    </div>

                    {/* Payment Form (Multiple Payment Methods allowed) */}
                    {remainingBalance > 0.01 && (
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Formas de Pagamento do Saldo Restante
                                </h3>

                                <button
                                    type="button"
                                    onClick={handleAddPaymentLine}
                                    className="px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-primary-200"
                                >
                                    <span>+ Adicionar Forma de Pagamento</span>
                                </button>
                            </div>

                            {/* Balance Distribution Status */}
                            <div className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex flex-wrap justify-between items-center gap-2 ${
                                isBalanceValid
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : balanceDiff > 0
                                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                                        : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}>
                                <div className="flex items-center gap-1.5">
                                    <span>Distribuído: R$ {allocatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span>/ R$ {remainingBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {!isBalanceValid && (
                                    <div className="flex items-center gap-2">
                                        <span>
                                            {balanceDiff > 0 
                                                ? `(Falta R$ ${balanceDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
                                                : `(Excede em R$ ${Math.abs(balanceDiff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleAutoAdjustLastLine}
                                            className="px-2 py-0.5 bg-white border border-current text-[10px] font-black uppercase rounded hover:opacity-80"
                                        >
                                            Ajustar Automático
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Payment Lines List */}
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {paymentList.map((line, index) => {
                                    const selectedPm = paymentMethods.find(pm => pm.id == line.payment_method_id);
                                    const isCheque = selectedPm ? selectedPm.description.toUpperCase().includes('CHEQUE') : false;
                                    const isCard = selectedPm ? (selectedPm.description.toUpperCase().includes('CARTÃO') || selectedPm.description.toUpperCase().includes('CARTAO')) : false;

                                    return (
                                        <div key={line.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3 relative group">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Forma #{index + 1}
                                                </span>
                                                {paymentList.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentLine(line.id)}
                                                        className="text-rose-500 hover:text-rose-700 font-bold text-xs p-1 hover:bg-rose-50 rounded transition"
                                                        title="Remover forma de pagamento"
                                                    >
                                                        ✕ Remover
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                                <div className="sm:col-span-5">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                                        Forma de Pagamento
                                                    </label>
                                                    <select
                                                        className="w-full border-slate-200 rounded-xl focus:border-primary-500 focus:ring-primary-500 text-xs font-bold h-9 bg-white"
                                                        value={line.payment_method_id}
                                                        onChange={(e) => handleUpdatePaymentLine(line.id, 'payment_method_id', e.target.value)}
                                                        required
                                                    >
                                                        {loadingMethods ? (
                                                            <option>Carregando...</option>
                                                        ) : (
                                                            paymentMethods.map((pm) => (
                                                                <option key={pm.id} value={pm.id}>
                                                                    {pm.description} {pm.is_cash ? '(À Vista)' : ''}
                                                                </option>
                                                            ))
                                                        )}
                                                    </select>
                                                </div>

                                                <div className="sm:col-span-4">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                                        Valor (R$)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        className="w-full border-slate-200 rounded-xl focus:border-primary-500 focus:ring-primary-500 text-xs font-black h-9 bg-white text-right"
                                                        value={line.value}
                                                        onChange={(e) => handleUpdatePaymentLine(line.id, 'value', e.target.value)}
                                                        required
                                                    />
                                                </div>

                                                {!selectedPm?.is_cash ? (
                                                    <div className="sm:col-span-3">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                                            Parcelas
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="36"
                                                            className="w-full border-slate-200 rounded-xl focus:border-primary-500 focus:ring-primary-500 text-xs font-bold h-9 bg-white text-center"
                                                            value={line.installments}
                                                            onChange={(e) => handleUpdatePaymentLine(line.id, 'installments', e.target.value)}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="sm:col-span-3">
                                                        <span className="block text-[9px] font-bold text-emerald-600 uppercase mb-2 text-center">À Vista</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details for Card or Cheque if applicable */}
                                            {(isCard || isCheque) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                                                    {isCard && (
                                                        <div className="sm:col-span-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Bandeira do Cartão (ex: Mastercard, Visa...)"
                                                                className="w-full border-slate-200 rounded-lg text-xs bg-white h-8"
                                                                value={line.card_brand || ''}
                                                                onChange={(e) => handleUpdatePaymentLine(line.id, 'card_brand', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                    {isCheque && (
                                                        <>
                                                            <input
                                                                type="text"
                                                                placeholder="Nº Cheque"
                                                                className="w-full border-slate-200 rounded-lg text-xs bg-white h-8"
                                                                value={line.cheque_number || ''}
                                                                onChange={(e) => handleUpdatePaymentLine(line.id, 'cheque_number', e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Agência"
                                                                className="w-full border-slate-200 rounded-lg text-xs bg-white h-8"
                                                                value={line.cheque_agency || ''}
                                                                onChange={(e) => handleUpdatePaymentLine(line.id, 'cheque_agency', e.target.value)}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Conta"
                                                                className="w-full border-slate-200 rounded-lg text-xs bg-white h-8"
                                                                value={line.cheque_account || ''}
                                                                onChange={(e) => handleUpdatePaymentLine(line.id, 'cheque_account', e.target.value)}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
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
                            disabled={loading || (remainingBalance > 0.01 && !isBalanceValid)}
                            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Concluir Baixa do Pedido</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
