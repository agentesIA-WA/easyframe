import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDate, formatDateTime, formatLongDateTime } from '../../utils/formatters';

export default function PrintOS() {
    const [order, setOrder] = useState(null);
    const [settings, setSettings] = useState(null);
    // Extrai o ID da URL formato /orders/:id/print
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
            } catch (error) {
                console.error('Erro ao buscar dados da OS:', error);
            }
        };
        fetchData();
    }, [orderId]);

    if (!order || !settings) return <div className="p-10 text-center font-bold">Carregando Ordem de Serviço...</div>;

    // Resolve a forma de pagamento de múltiplas fontes
    const resolvePaymentMethod = () => {
        if (!order.payments || order.payments.length === 0) return null;
        const firstPayment = order.payments[0];
        if (firstPayment.payment_method) return firstPayment.payment_method;
        // Fallback: tenta resolver via card_brand ou cheque
        if (firstPayment.card_brand) return `CARTÃO - ${firstPayment.card_brand}`;
        if (firstPayment.cheque_number) return 'CHEQUE';
        return null;
    };

    const paymentMethodName = resolvePaymentMethod();
    const paymentCount = order.payments ? order.payments.length : 0;

    // Helper para verificar se a modalidade é à vista (PIX, Dinheiro, Débito, etc.)
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
        <div className="bg-white min-h-screen p-8 text-slate-800 font-sans max-w-[800px] mx-auto border shadow-sm print:shadow-none print:border-none">
            {/* CABEÇALHO DA EMPRESA */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                    <div className="bg-slate-900 px-3 py-1.5 rounded-lg inline-block mb-2">
                        <img src="/logo.png" alt="EASY FRAME Logo" className="h-9 w-auto object-contain" />
                    </div>
                    <h1 className="text-xl font-black italic tracking-tighter uppercase">{settings.company_name || 'EASY FRAME'}</h1>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mt-1 space-y-0.5">
                        <p>{settings.company_social_name}</p>
                        <p>CNPJ: {settings.cnpj}</p>
                        <p>{settings.address}, {settings.city} - {settings.cep}</p>
                        <p>FONE: {settings.phone} | EMAIL: {settings.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-black uppercase">Ordem de Serviço</h2>
                    <p className="text-lg font-mono font-bold text-indigo-700">ORD-{order.id}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Data: {formatDateTime(order.created_at)}</p>
                </div>
            </div>

            {/* DADOS DO CLIENTE E INFORMAÇÕES */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-50 p-4 rounded border border-slate-100">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Dados do Cliente</p>
                    <p className="text-sm font-black uppercase">{order.customer?.name}</p>
                    <p className="text-[10px] text-slate-600 font-bold mt-1">Telefone: {order.customer?.phone || 'N/A'}</p>
                    <p className="text-[10px] text-slate-600 font-bold">E-mail: {order.customer?.email || 'N/A'}</p>
                    <p className="text-[10px] text-slate-600 font-bold">CPF/CNPJ: {order.customer?.tax_id || order.customer?.document || 'N/A'}</p>
                    {order.customer?.city && (
                        <p className="text-[10px] text-slate-600 font-bold">
                            {order.customer.address && `${order.customer.address}, `}{order.customer.city}{order.customer.uf ? ` - ${order.customer.uf}` : ''}
                        </p>
                    )}
                </div>
                <div className="bg-slate-50 p-4 rounded border border-slate-100 text-right">
                    <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Informações Adicionais</p>
                    <p className="text-sm font-black uppercase text-slate-700">Vendedor: {order.seller?.name || 'N/A'}</p>
                </div>
            </div>

            {/* COMPOSIÇÃO DO PEDIDO */}
            <div className="space-y-6">
                <p className="text-[10px] font-black uppercase text-slate-900 border-b border-slate-200 pb-1">Composição do Pedido</p>
                
                {order.items.map((item, idx) => (
                    <div key={item.id} className="border border-slate-200 rounded overflow-hidden">
                        <div className="bg-slate-900 text-white px-3 py-1 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase">Peça #{idx + 1}: {item.description}</span>
                            <span className="text-xs font-black">{item.height} x {item.width} cm</span>
                        </div>
                        <div className="p-3">
                            {item.observation && (
                                <div className="mb-2 p-2 bg-slate-50 border-l-4 border-slate-300 text-[10px] font-bold italic text-slate-600">
                                    OBS: {item.observation}
                                </div>
                            )}
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="text-slate-400 font-black uppercase text-left">
                                        <th className="pb-1">Material / Insumo</th>
                                        <th className="pb-1 text-center">Cálculo</th>
                                        <th className="pb-1 text-center">Qtd</th>
                                        <th className="pb-1 text-right">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {item.sub_items.map(sub => (
                                        <tr key={sub.id}>
                                            <td className="py-1 font-bold text-slate-700 uppercase">
                                                {sub.code || sub.product?.code ? <span className="font-mono text-slate-500 mr-1.5">[{sub.code || sub.product?.code}]</span> : null}
                                                {sub.description}
                                                {parseFloat(sub.margin) > 0 && <span className="ml-2 bg-slate-100 text-slate-800 border border-slate-300 px-1.5 py-0.5 rounded text-[9px] font-black tracking-tighter">MARGEM: {parseFloat(sub.margin)}cm</span>}
                                            </td>
                                            <td className="py-1 text-center text-[9px] uppercase font-black text-slate-400">
                                                {sub.calculation_type == 2 ? 'Linear' : sub.calculation_type == 3 ? 'M²' : 'Absoluto'}
                                            </td>
                                            <td className="py-1 text-center font-black">{sub.quantity}</td>
                                            <td className="py-1 text-right font-black">
                                                R$ {parseFloat(sub.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {(parseFloat(item.item_discount || 0) > 0 || parseFloat(item.discount_percent || 0) > 0) && (
                                        <tr className="border-t border-slate-200 bg-rose-50/60 print:bg-rose-50">
                                            <td colSpan="3" className="py-1 px-2 text-[10px] font-black text-rose-700 uppercase text-right">
                                                Desconto Aplicado {parseFloat(item.discount_percent || 0) > 0 ? `(${parseFloat(item.discount_percent)}%)` : ''}:
                                            </td>
                                            <td className="py-1 text-right font-black text-rose-700 text-xs">
                                                - R$ {parseFloat(item.item_discount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    )}
                                    <tr className="border-t border-slate-200">
                                        <td colSpan="3" className="pt-2 text-[10px] font-black text-slate-400 uppercase text-right">Total da Peça:</td>
                                        <td className="pt-2 text-right font-black text-slate-900">
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
            <div className="mt-6 bg-indigo-50/50 border border-indigo-100 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-indigo-100/60">
                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest">Condição de Pagamento</p>
                        <p className="text-sm font-black text-indigo-900 uppercase">
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
                    <div className="space-y-2">
                        {order.payments.map((p, idx) => {
                            const isCash = isCashMethod(p.payment_method || paymentMethodName);
                            // Para pagamentos à vista (PIX, Dinheiro, Débito), o vencimento é na data da realização / criação do pedido
                            const rawDueDate = isCash ? (order.created_at || p.due_date) : p.due_date;
                            const dateStr = formatDate(rawDueDate) || 'N/A';
                            const valStr = parseFloat(p.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                            
                            // Detalhes extras por tipo
                            let extraDetails = '';
                            if (p.cheque_number) {
                                extraDetails = `CHEQUE Nº ${p.cheque_number} | Ag: ${p.cheque_agency || 'N/A'} | Cc: ${p.cheque_account || 'N/A'}`;
                            } else if (p.card_brand) {
                                extraDetails = `CARTÃO: ${p.card_brand}`;
                            } else if (p.observation) {
                                extraDetails = p.observation;
                            }

                            return (
                                <div key={p.id} className="flex justify-between items-center text-[11px] font-bold text-slate-700 bg-white px-3 py-1.5 rounded border border-indigo-100/40">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-indigo-100 text-indigo-800 text-[9px] px-1.5 py-0.5 rounded font-black font-mono">
                                            {idx + 1}ª PARC.
                                        </span>
                                        <span>Vencimento: {dateStr} {isCash ? '(No dia / À Vista)' : ''}</span>
                                        {extraDetails && (
                                            <span className="text-slate-400 font-mono text-[10px] ml-2 border-l border-slate-200 pl-2">
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
                    <p className="text-[11px] text-slate-400 font-bold italic">Nenhum lançamento financeiro registrado.</p>
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
                    <div className="mt-6 pt-4 border-t-2 border-slate-900 flex justify-between items-end gap-4">
                        {totalDiscount > 0 ? (
                            <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-3.5 flex items-center gap-3 print:bg-rose-50">
                                <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-sm print:bg-rose-600">
                                    %
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Desconto Total Concedido</p>
                                    <p className="text-lg font-black text-rose-700">
                                        - R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        ) : <div />}

                        <div className="text-right space-y-0.5">
                            {totalDiscount > 0 && (
                                <div className="text-[11px] font-bold text-slate-400 uppercase flex justify-end gap-2">
                                    <span>Valor Bruto:</span>
                                    <span className="line-through font-mono">R$ {grossTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Total Líquido a Pagar</p>
                                <p className="text-2xl font-black text-slate-900">R$ {netTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* PREVISÃO DE ENTREGA — EM DESTAQUE */}
            {order.delivery_date && (
                <div className="mt-6 border-2 border-amber-400 rounded-lg p-4 bg-amber-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center print:bg-amber-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Previsão de Entrega</p>
                                <p className="text-lg font-black text-amber-900">
                                    {formatLongDateTime(order.delivery_date)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSINATURAS */}
            <div className="mt-16 grid grid-cols-2 gap-16">
                <div className="text-center">
                    <div className="border-t-2 border-slate-900 pt-2 mx-4">
                        <p className="text-xs font-black uppercase text-slate-700">{order.customer?.name}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Cliente</p>
                    </div>
                </div>
                <div className="text-center">
                    <div className="border-t-2 border-slate-900 pt-2 mx-4">
                        <p className="text-xs font-black uppercase text-slate-700">{settings.company_name || 'SDM MODERN'}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">Empresa</p>
                    </div>
                </div>
            </div>

            {/* RODAPÉ */}
            <div className="mt-8 text-center">
                <p className="text-[8px] text-slate-400 font-bold uppercase">Documento gerado em {formatDateTime(new Date())}</p>
            </div>

            {/* BOTÃO DE IMPRESSÃO */}
            <div className="mt-8 flex justify-center no-print">
                <button 
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition shadow-lg"
                >
                    Imprimir Documento
                </button>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                }
            ` }} />
        </div>
    );
}
