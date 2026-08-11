import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate, formatDateTime, formatLongDateTime } from '../../utils/formatters';

export default function PrintOS() {
    const [order, setOrder] = useState(null);
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState(null);

    // Extrai o ID ou UUID da URL formato /orders/:id/print
    const segments = window.location.pathname.split('/');
    const orderId = segments[segments.length - 2];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = token ? { headers: { 'Authorization': `Bearer ${token}` } } : {};

                const [orderRes, settingsRes] = await Promise.all([
                    axios.get(`/api/v1/sales/orders/${orderId}/print`, config),
                    axios.get('/api/v1/core/settings', config).catch(() => ({ data: {} }))
                ]);
                setOrder(orderRes.data);
                setSettings(settingsRes.data || {});
            } catch (err) {
                console.error('Erro ao buscar dados da OS:', err);
                setError(err.response?.data?.message || 'Acesso negado ou Ordem de Serviço não encontrada.');
            }
        };
        fetchData();
    }, [orderId]);

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-slate-200">
                    <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                        ✕
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2">Acesso Negado</h2>
                    <p className="text-sm text-slate-600 mb-6">{error}</p>
                    <a href="/login" className="inline-block bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors">
                        Ir para o Login
                    </a>
                </div>
            </div>
        );
    }

    if (!order || !settings) return <div className="p-10 text-center font-bold text-slate-500">Carregando Ordem de Serviço...</div>;

    // Resolve a forma de pagamento de múltiplas fontes
    const resolvePaymentMethod = () => {
        if (!order.payments || order.payments.length === 0) return null;
        const firstPayment = order.payments[0];
        if (firstPayment.payment_method) return firstPayment.payment_method;
        if (firstPayment.card_brand) return `CARTÃO - ${firstPayment.card_brand}`;
        if (firstPayment.cheque_number) return 'CHEQUE';
        return null;
    };

    const paymentMethodName = resolvePaymentMethod();
    const paymentCount = order.payments ? order.payments.length : 0;

    const isCashMethod = (methodName) => {
        if (!methodName) return false;
        const upper = String(methodName).toUpperCase();
        return upper.includes('PIX') || 
               upper.includes('DINHEIRO') || 
               upper.includes('DÉBITO') || 
               upper.includes('DEBITO') || 
               upper.includes('À VISTA') || 
               upper.includes('A VISTA');
    };

    return (
        <div className="bg-white p-6 print:p-0 text-slate-800 font-sans max-w-[800px] mx-auto border shadow-sm print:shadow-none print:border-none print:max-w-none print:w-full text-xs">
            {/* CABEÇALHO DA EMPRESA */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2.5 mb-3">
                <div>
                    <div className="bg-slate-900 px-2.5 py-1 rounded inline-block mb-1">
                        <img src="/logo.png" alt="EASY FRAME Logo" className="h-7 w-auto object-contain" />
                    </div>
                    <h1 className="text-base font-black italic tracking-tighter uppercase">{settings.company_name || 'EASY FRAME'}</h1>
                    <div className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
                        <p>{settings.company_social_name}</p>
                        <p>CNPJ: {settings.cnpj}</p>
                        <p>{settings.address}, {settings.city} - {settings.cep}</p>
                        <p>FONE: {settings.phone} | EMAIL: {settings.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-base font-black uppercase">Ordem de Serviço</h2>
                    <p className="text-base font-mono font-bold text-indigo-700">ORD-{order.id}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Data: {formatDateTime(order.created_at)}</p>
                </div>
            </div>

            {/* DADOS DO CLIENTE E INFORMAÇÕES */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Dados do Cliente</p>
                    <p className="text-xs font-black uppercase">{order.customer?.name}</p>
                    <p className="text-[9px] text-slate-600 font-bold mt-0.5">Telefone: {order.customer?.phone || 'N/A'}</p>
                    <p className="text-[9px] text-slate-600 font-bold">E-mail: {order.customer?.email || 'N/A'}</p>
                    <p className="text-[9px] text-slate-600 font-bold">CPF/CNPJ: {order.customer?.tax_id || order.customer?.document || 'N/A'}</p>
                    {order.customer?.city && (
                        <p className="text-[9px] text-slate-600 font-bold">
                            {order.customer.address && `${order.customer.address}, `}{order.customer.city}{order.customer.uf ? ` - ${order.customer.uf}` : ''}
                        </p>
                    )}
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80 text-right flex flex-col justify-between">
                    <div>
                        <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5">Informações Adicionais</p>
                        <p className="text-xs font-black uppercase text-slate-700">Vendedor: {order.seller?.name || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* COMPOSIÇÃO DO PEDIDO */}
            <div className="space-y-3 mb-3">
                <p className="text-[9px] font-black uppercase text-slate-900 border-b border-slate-200 pb-0.5">Composição do Pedido</p>
                
                {order.items.map((item, idx) => (
                    <div key={item.id} className="border border-slate-200 rounded overflow-hidden">
                        <div className="bg-slate-900 text-white px-2.5 py-0.5 flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase">Peça #{idx + 1}: {item.description}</span>
                            <span className="text-[10px] font-black">{item.height} x {item.width} cm</span>
                        </div>
                        <div className="p-2">
                            {item.observation && (
                                <div className="mb-1.5 p-1.5 bg-slate-50 border-l-2 border-slate-300 text-[9px] font-bold italic text-slate-600">
                                    OBS: {item.observation}
                                </div>
                            )}
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="text-slate-400 font-black uppercase text-left border-b border-slate-100">
                                        <th className="pb-0.5">Material / Insumo</th>
                                        <th className="pb-0.5 text-center">Cálculo</th>
                                        <th className="pb-0.5 text-center">Qtd</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {item.sub_items.map(sub => (
                                        <tr key={sub.id}>
                                            <td className="py-0.5 font-bold text-slate-700 uppercase">
                                                {sub.code || sub.product?.code ? <span className="font-mono text-slate-500 mr-1">[{sub.code || sub.product?.code}]</span> : null}
                                                {sub.description}
                                                {parseFloat(sub.margin) > 0 && <span className="ml-1.5 bg-slate-100 text-slate-800 border border-slate-300 px-1 py-0.2 rounded text-[8px] font-black tracking-tighter">MARGEM: {parseFloat(sub.margin)}cm</span>}
                                            </td>
                                            <td className="py-0.5 text-center text-[8px] uppercase font-black text-slate-400">
                                                {sub.calculation_type == 2 ? 'Linear' : sub.calculation_type == 3 ? 'M²' : 'Absoluto'}
                                            </td>
                                            <td className="py-0.5 text-center font-black">{sub.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {(parseFloat(item.item_discount || 0) > 0 || parseFloat(item.discount_percent || 0) > 0) && (
                                        <tr className="border-t border-slate-200 bg-rose-50/60 print:bg-rose-50">
                                            <td colSpan="2" className="py-0.5 px-1.5 text-[9px] font-black text-rose-700 uppercase text-right">
                                                Desconto Aplicado {parseFloat(item.discount_percent || 0) > 0 ? `(${parseFloat(item.discount_percent)}%)` : ''}:
                                            </td>
                                            <td className="py-0.5 text-right font-black text-rose-700 text-[10px]">
                                                - R$ {parseFloat(item.item_discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                    <tr className="border-t border-slate-200">
                                        <td colSpan="2" className="pt-1 text-[9px] font-black text-slate-400 uppercase text-right">Total da Peça:</td>
                                        <td className="pt-1 text-right font-black text-slate-900 text-[11px]">
                                            R$ {parseFloat(item.item_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                ))}
            </div>

            {/* FORMA DE PAGAMENTO */}
            <div className="mb-3 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-2 pb-1 border-b border-indigo-100/60">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase text-indigo-500 tracking-widest">Condição de Pagamento</p>
                        <p className="text-xs font-black text-indigo-900 uppercase">
                            {paymentMethodName ? (
                                <>
                                    {paymentMethodName}
                                    {paymentCount > 1 ? ` (${paymentCount}X)` : ' (À VISTA)'}
                                </>
                            ) : (
                                <span className="text-slate-400">A DEFINIR</span>
                            )}
                        </p>
                    </div>
                </div>

                {order.payments && order.payments.length > 0 ? (
                    <div className="space-y-1">
                        {order.payments.map((p, idx) => {
                            const isCash = isCashMethod(p.payment_method || paymentMethodName);
                            const rawDueDate = isCash ? (order.created_at || p.due_date) : p.due_date;
                            const dateStr = formatDate(rawDueDate) || 'N/A';
                            const valStr = parseFloat(p.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            
                            let extraDetails = '';
                            if (p.cheque_number) {
                                extraDetails = `CHEQUE Nº ${p.cheque_number} | Ag: ${p.cheque_agency || 'N/A'} | Cc: ${p.cheque_account || 'N/A'}`;
                            } else if (p.card_brand) {
                                extraDetails = `CARTÃO: ${p.card_brand}`;
                            } else if (p.observation) {
                                extraDetails = p.observation;
                            }

                            return (
                                <div key={p.id} className="flex justify-between items-center text-[10px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded border border-indigo-100/40">
                                    <div className="flex items-center gap-1.5">
                                        <span className="bg-indigo-100 text-indigo-800 text-[8px] px-1 py-0.2 rounded font-black font-mono">
                                            {idx + 1}ª PARC.
                                        </span>
                                        <span>Vencimento: {dateStr} {isCash ? '(No dia / À Vista)' : ''}</span>
                                        {extraDetails && (
                                            <span className="text-slate-400 font-mono text-[9px] ml-1 border-l border-slate-200 pl-1.5">
                                                {extraDetails}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-indigo-900 font-black">
                                        R$ {valStr}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-[10px] text-slate-400 font-bold italic">Nenhum lançamento financeiro registrado.</p>
                )}
            </div>

            {/* TOTAL DO PEDIDO E DESTAQUE DE DESCONTO */}
            {(() => {
                const itemsDiscount = (order.items || []).reduce((acc, it) => acc + parseFloat(it.item_discount || 0), 0);
                const generalDiscount = parseFloat(order.discount || 0);
                const totalDiscount = itemsDiscount + generalDiscount;
                const netTotal = parseFloat(order.total_value || 0);
                const grossTotal = netTotal + totalDiscount;

                return (
                    <div className="mb-3 pt-2.5 border-t-2 border-slate-900 flex justify-between items-end gap-3">
                        {totalDiscount > 0 ? (
                            <div className="bg-rose-50 border border-rose-300 rounded-lg p-2 flex items-center gap-2 print:bg-rose-50">
                                <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-xs shadow-sm print:bg-rose-600">
                                    %
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase text-rose-600 tracking-wider">Desconto Total Concedido</p>
                                    <p className="text-sm font-black text-rose-700">
                                        - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        ) : <div />}

                        <div className="text-right space-y-0.5">
                            {totalDiscount > 0 && (
                                <div className="text-[10px] font-bold text-slate-400 uppercase flex justify-end gap-1.5">
                                    <span>Valor Bruto:</span>
                                    <span className="line-through font-mono">R$ {grossTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div>
                                <p className="text-[9px] font-black uppercase text-slate-400">Total Líquido a Pagar</p>
                                <p className="text-xl font-black text-slate-900">R$ {netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* PREVISÃO DE ENTREGA — EM DESTAQUE */}
            {order.delivery_date && (
                <div className="mb-4 border-2 border-amber-400 rounded-lg p-2.5 bg-amber-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center print:bg-amber-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase text-amber-700 tracking-widest">Previsão de Entrega</p>
                                <p className="text-sm font-black text-amber-900">
                                    {formatLongDateTime(order.delivery_date)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSINATURAS */}
            <div className="mt-6 mb-2 grid grid-cols-2 gap-10">
                <div className="text-center">
                    <div className="border-t-2 border-slate-900 pt-1.5 mx-4">
                        <p className="text-[11px] font-black uppercase text-slate-700">{order.customer?.name}</p>
                        <p className="text-[8px] font-bold uppercase text-slate-400">Cliente</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t-2 border-slate-900 pt-1.5 mx-4">
                        <p className="text-[11px] font-black uppercase text-slate-700">{settings.company_name || 'EASY FRAME'}</p>
                        <p className="text-[8px] font-bold uppercase text-slate-400">Empresa</p>
                    </div>
                </div>
            </div>

            {/* RODAPÉ */}
            <div className="mt-2 text-center">
                <p className="text-[7px] text-slate-400 font-bold uppercase">Documento gerado em {formatDateTime(new Date())}</p>
            </div>

            {/* BOTÃO DE IMPRESSÃO */}
            <div className="mt-6 flex justify-center no-print">
                <button 
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg"
                >
                    Imprimir Documento
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 6mm 8mm;
                    }
                    html, body {
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            ` }} />
        </div>
    );
}
