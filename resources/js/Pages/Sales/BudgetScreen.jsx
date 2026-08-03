import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import { formatCurrency } from '../../utils/formatters';
import { sendWhatsApp } from '../../utils/whatsapp';
import CustomerQuickModal from '../../Components/Modals/CustomerQuickModal';
import ProductQuickModal from '../../Components/Modals/ProductQuickModal';

const BudgetScreen = () => {
    const { notify } = useNotification();
    const [customers, setCustomers] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [products, setProducts] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [customUnitValue, setCustomUnitValue] = useState('');

    // Identifica se é edição através da URL
    const pathname = window.location.pathname;
    const isEdit = pathname.includes('/edit');
    const [budgetId, setBudgetId] = useState(isEdit ? pathname.split('/')[2] : null);

    // DADOS GERAIS DO ORÇAMENTO
    const [customerId, setCustomerId] = useState('');
    const [selectedCustomerName, setSelectedCustomerName] = useState('');
    const [sellerId, setSellerId] = useState('');
    const [peças, setPeças] = useState([]);
    const [isOrder, setIsOrder] = useState(false);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [deliveryTime, setDeliveryTime] = useState('');

    // DADOS DE PAGAMENTO MÚLTIPLOS
    const [paymentList, setPaymentList] = useState([
        {
            id: 'pm-1',
            payment_method_id: '',
            value: '',
            installments: 1,
            card_brand: '',
            cheque_type: 'vista',
            cheque_numbers: [],
            cheque_agencies: [],
            cheque_accounts: [],
            observation: ''
        }
    ]);

    // FORMULÁRIO PARA NOVA PEÇA (ITEM)
    const [newPeça, setNewPeça] = useState({
        description: '',
        observation: '',
        height: '',
        width: '',
        quantity: 1,
        increase_percent: '',
        discount_percent: ''
    });

    // ESTADO PARA ADIÇÃO DE SUB-ITEM (MATERIAL)
    const [targetPeçaId, setTargetPeçaId] = useState('');
    const [searchProduct, setSearchProduct] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [custRes, sellerRes, payRes] = await Promise.allSettled([
                    axios.get('/api/v1/customers'),
                    axios.get('/api/v1/hr/employees'),
                    axios.get('/api/v1/core/payment-methods')
                ]);

                const custList = custRes.status === 'fulfilled' ? (custRes.value.data.data || custRes.value.data) : [];
                const sellerData = sellerRes.status === 'fulfilled' ? (sellerRes.value.data.data || sellerRes.value.data) : [];
                const payList = payRes.status === 'fulfilled' ? (payRes.value.data.data || payRes.value.data) : [];

                setCustomers(Array.isArray(custList) ? custList : []);
                setPaymentMethods(Array.isArray(payList) ? payList : []);
                setSellers(Array.isArray(sellerData) ? sellerData.filter(e => e.can_sell) : []);

                // Se for edição, busca os dados do orçamento
                if (isEdit && budgetId) {
                    const budgetRes = await axios.get(`/api/v1/sales/orders/${budgetId}`);
                    const budget = budgetRes.data;

                    setCustomerId(budget.customer_id);
                    // Busca o nome do cliente para exibir
                    const foundCust = Array.isArray(custList) ? custList.find(c => c.id === budget.customer_id) : null;
                    if (foundCust) setSelectedCustomerName(foundCust.name);
                    setSellerId(budget.seller_id);
                    setIsOrder(budget.status !== 'draft');

                    // Carrega formas de pagamento do orçamento/pedido se existirem
                    if (budget.payments && budget.payments.length > 0) {
                        const grouped = [];
                        budget.payments.forEach((p, idx) => {
                            const foundPm = Array.isArray(payList) 
                                ? payList.find(pm => pm.description === p.payment_method || pm.id == p.payment_method) 
                                : null;
                            const pmId = foundPm ? foundPm.id : '';

                            const existingIndex = grouped.findIndex(g => g.payment_method_id === pmId && pmId !== '');
                            if (existingIndex >= 0) {
                                const currentVal = parseFloat(grouped[existingIndex].value || 0);
                                grouped[existingIndex].value = (currentVal + parseFloat(p.value || 0)).toFixed(2);
                                grouped[existingIndex].installments = Math.max(grouped[existingIndex].installments, p.installment_number || 1);
                            } else {
                                grouped.push({
                                    id: `pm-${idx}-${Date.now()}`,
                                    payment_method_id: pmId,
                                    value: parseFloat(p.value || 0).toFixed(2),
                                    installments: p.installment_number || 1,
                                    is_paid: p.status === 'P' || !!p.paid_at,
                                    card_brand: p.card_brand || '',
                                    cheque_type: p.cheque_number ? 'parcelado' : 'vista',
                                    cheque_numbers: p.cheque_number ? [p.cheque_number] : [],
                                    cheque_agencies: p.cheque_agency ? [p.cheque_agency] : [],
                                    cheque_accounts: p.cheque_account ? [p.cheque_account] : [],
                                    observation: p.observation || ''
                                });
                            }
                        });
                        if (grouped.length > 0) {
                            setPaymentList(grouped);
                        }
                    }

                    // Carrega data/hora de entrega se existir
                    if (budget.delivery_date) {
                        const [datePart, timePart] = budget.delivery_date.split('T');
                        setDeliveryDate(datePart);
                        if (timePart) {
                            setDeliveryTime(timePart.substring(0, 5)); // HH:mm
                        }
                    }

                    // Mapeia os itens vindos do backend para o formato do estado
                    const mappedPeças = budget.items.map(item => ({
                        id: item.id,
                        description: item.description,
                        observation: item.observation || '',
                        height: item.height,
                        width: item.width,
                        quantity: item.quantity,
                        increase_percent: item.increase_percent || 0,
                        discount_percent: item.discount_percent || 0,
                        sub_items: item.sub_items.map(sub => ({
                            product_id: sub.product_id,
                            code: sub.code || sub.product?.code || '-',
                            description: sub.description,
                            unit_value: parseInt(sub.calculation_type) === 1
                                ? parseFloat(sub.value / (sub.quantity || 1))
                                : parseFloat(sub.product?.unit_price || sub.product?.price || 0),
                            calculation_type: sub.calculation_type,
                            technical_width: sub.product?.width || 0,
                            quantity: sub.quantity,
                            margin: parseFloat(sub.margin || 0),
                            allow_margin: !!(sub.product?.allow_margin || parseFloat(sub.margin || 0) > 0)
                        }))
                    }));
                    setPeças(mappedPeças);
                    if (mappedPeças.length > 0) setTargetPeçaId(mappedPeças[0].id);
                }
            } catch (error) {
                notify('error', 'Falha ao carregar dados iniciais.');
            }
        };
        fetchInitialData();
    }, [isEdit, budgetId]);

    // BUSCA DINÂMICA DE PRODUTOS (DEBOUNCE)
    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            if (searchProduct.length >= 2) {
                setSearching(true);
                try {
                    const response = await axios.get(`/api/v1/products?search=${searchProduct}`);
                    const data = response.data.data || response.data;
                    setFilteredProducts(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error('Erro na busca:', error);
                } finally {
                    setSearching(false);
                }
            } else {
                setFilteredProducts([]);
            }
        }, 400);

        return () => clearTimeout(searchTimer);
    }, [searchProduct]);

    const roundDimension = (dim) => Math.ceil(parseFloat(dim) * 2) / 2;

    const calculateSubItemsValues = (peça) => {
        const totalMargin = (peça.sub_items || []).reduce((sum, s) => sum + parseFloat(s.margin || 0), 0);
        let currentH = roundDimension(peça.height || 0) + (totalMargin * 2);
        let currentW = roundDimension(peça.width || 0) + (totalMargin * 2);
        const incPct = parseFloat(peça.increase_percent || peça.internal_code || 0);

        return (peça.sub_items || []).map(sub => {
            const pw = parseFloat(sub.technical_width || 0);
            const unitValue = parseFloat(sub.unit_value || 0);
            const subQty = parseFloat(sub.quantity || 1);
            const calcType = parseInt(sub.calculation_type);
            let subValue = 0;

            if (calcType === 1) { // Absoluto
                subValue = unitValue * subQty;
            } else if (calcType === 2) { // Linear
                const perimeter = ((currentH + currentW) * 2 + (pw * 4)) / 100;
                subValue = perimeter * unitValue * subQty;
                // Expande dimensões para o próximo material
                currentH += (pw * 2);
                currentW += (pw * 2);
            } else if (calcType === 3) { // M2
                const area = (currentH * currentW) / 10000;
                subValue = area * unitValue * subQty;
            } else {
                subValue = unitValue * subQty;
            }

            if (incPct !== 0) {
                subValue = subValue * (1 + (incPct / 100));
            }

            return subValue;
        });
    };

    const calculateItemTotal = (peça) => {
        const subValues = calculateSubItemsValues(peça);
        const itemSubTotal = subValues.reduce((acc, v) => acc + v, 0) * parseFloat(peça.quantity || 1);
        const discPct = parseFloat(peça.discount_percent || 0);

        let val = itemSubTotal;
        if (discPct !== 0) {
            val = val * (1 - (discPct / 100));
        }
        return val;
    };

    const calculateGrandTotal = () => peças.reduce((acc, p) => acc + calculateItemTotal(p), 0);
    const totalValue = calculateGrandTotal();

    const handleAddPeça = () => {
        if (!newPeça.description || !newPeça.height || !newPeça.width) {
            notify('warning', 'Preencha a descrição e as medidas da peça.');
            return;
        }

        const peça = {
            ...newPeça,
            id: 'P-' + Date.now(),
            increase_percent: parseFloat(newPeça.increase_percent || 0),
            discount_percent: parseFloat(newPeça.discount_percent || 0),
            sub_items: []
        };

        setPeças([...peças, peça]);
        if (!targetPeçaId) setTargetPeçaId(peça.id);
        setNewPeça({ description: '', observation: '', height: '', width: '', quantity: 1, increase_percent: '', discount_percent: '' });
        notify('success', 'Peça adicionada ao orçamento.');
    };

    const handlePeçaIncreasePercentChange = (peçaId, newPct) => {
        setPeças(peças.map(p => p.id === peçaId ? { ...p, increase_percent: newPct } : p));
    };

    const handlePeçaDiscountPercentChange = (peçaId, newPct) => {
        setPeças(peças.map(p => p.id === peçaId ? { ...p, discount_percent: newPct } : p));
    };

    const handleAddSubItem = () => {
        if (!targetPeçaId || !selectedProduct) {
            notify('warning', 'Selecione a peça de destino e o material.');
            return;
        }

        const product = selectedProduct;

        const updatedPeças = peças.map(p => {
            if (p.id === targetPeçaId) {
                return {
                    ...p,
                    sub_items: [...p.sub_items, {
                        product_id: product.id,
                        code: product.code,
                        description: product.name,
                        unit_value: (product.category?.calculation_type || 1) === 1
                            ? parseFloat(customUnitValue || product.unit_price || product.price || 0)
                            : parseFloat(product.unit_price || product.price || 0),
                        calculation_type: product.category?.calculation_type || 1,
                        technical_width: product.width || 0,
                        quantity: 1,
                        margin: 0,
                        allow_margin: !!product.allow_margin
                    }]
                };
            }
            return p;
        });

        setPeças(updatedPeças);
        setSelectedProduct(null);
        setCustomUnitValue('');
        notify('success', `Material "${product.name}" vinculado.`);
    };

    const handleRemovePeça = (id) => {
        setPeças(peças.filter(p => p.id !== id));
        if (targetPeçaId === id) setTargetPeçaId('');
        notify('success', 'Peça removida.');
    };

    const handleRemoveSubItem = (peçaId, subIndex) => {
        setPeças(peças.map(p => {
            if (p.id === peçaId) {
                const updatedSubs = [...p.sub_items];
                updatedSubs.splice(subIndex, 1);
                return { ...p, sub_items: updatedSubs };
            }
            return p;
        }));
        notify('success', 'Material removido da peça.');
    };

    const handleSubItemMarginChange = (peçaId, subIndex, newMargin) => {
        setPeças(peças.map(p => {
            if (p.id === peçaId) {
                const updatedSubs = [...p.sub_items];
                updatedSubs[subIndex] = { ...updatedSubs[subIndex], margin: newMargin };
                return { ...p, sub_items: updatedSubs };
            }
            return p;
        }));
    };

    const handleAddPaymentLine = () => {
        const grandTotal = calculateGrandTotal();
        const allocated = paymentList.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
        const rem = Math.max(0, grandTotal - allocated);

        setPaymentList(prev => [
            ...prev,
            {
                id: `pm-${Date.now()}`,
                payment_method_id: '',
                value: rem > 0 ? rem.toFixed(2) : '',
                installments: 1,
                is_paid: isOrder,
                card_brand: '',
                cheque_type: 'vista',
                cheque_numbers: [],
                cheque_agencies: [],
                cheque_accounts: [],
                observation: ''
            }
        ]);
    };

    const handleRemovePaymentLine = (id) => {
        if (paymentList.length <= 1) {
            notify('warning', 'É necessário manter ao menos uma forma de pagamento.');
            return;
        }
        setPaymentList(prev => prev.filter(p => p.id !== id));
    };

    const handleUpdatePaymentLine = (id, field, value) => {
        setPaymentList(prev => prev.map(p => {
            if (p.id === id) {
                const updated = { ...p, [field]: value };
                if (field === 'cheque_type' && value === 'vista') {
                    updated.installments = 1;
                }
                return updated;
            }
            return p;
        }));
    };

    const handleFillRemainingBalance = (id) => {
        const grandTotal = calculateGrandTotal();
        const otherAllocated = paymentList
            .filter(p => p.id !== id)
            .reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
        const rem = Math.max(0, grandTotal - otherAllocated);
        handleUpdatePaymentLine(id, 'value', rem.toFixed(2));
    };

    const handleSubmit = async () => {
        if (!customerId || !sellerId || peças.length === 0) {
            notify('error', 'Selecione o cliente, o vendedor e adicione pelo menos uma peça.');
            return;
        }

        if (isOrder && paymentList.some(p => !p.payment_method_id)) {
            notify('error', 'Selecione a forma de pagamento para todas as modalidades informadas.');
            return;
        }

        const grandTotal = calculateGrandTotal();

        setLoading(true);
        try {
            const payload = {
                customer_id: customerId,
                seller_id: sellerId,
                status: isOrder ? 'confirmed' : 'draft',
                payments: paymentList.map((p) => {
                    const selectedPm = paymentMethods.find(m => m.id == p.payment_method_id);
                    const val = parseFloat(p.value);
                    return {
                        payment_method_id: p.payment_method_id || null,
                        payment_method: selectedPm ? selectedPm.description : null,
                        value: isNaN(val) || val <= 0 ? (paymentList.length === 1 ? grandTotal : 0) : val,
                        installments: parseInt(p.installments || 1),
                        is_paid: p.is_paid !== undefined ? p.is_paid : isOrder,
                        card_brand: p.card_brand || null,
                        cheque_type: p.cheque_type,
                        cheque_numbers: p.cheque_numbers,
                        cheque_agencies: p.cheque_agencies,
                        cheque_accounts: p.cheque_accounts,
                        observation: p.observation || null
                    };
                }),
                payment_method_id: paymentList[0]?.payment_method_id || null,
                delivery_date: deliveryDate ? `${deliveryDate}T${deliveryTime || '00:00'}:00` : null,
                items: peças.map(p => ({
                    description: p.description,
                    observation: p.observation,
                    height: p.height,
                    width: p.width,
                    quantity: p.quantity,
                    increase_percent: parseFloat(p.increase_percent || 0),
                    discount_percent: parseFloat(p.discount_percent || 0),
                    sub_items: p.sub_items
                }))
            };

            if (isEdit) {
                await axios.put(`/api/v1/sales/orders/${budgetId}`, payload);
                notify('success', 'Registro atualizado com sucesso!');
            } else {
                await axios.post('/api/v1/sales/orders', payload);
                notify('success', isOrder ? 'Pedido gravado com sucesso!' : 'Orçamento gravado com sucesso!');
            }

            setTimeout(() => {
                window.location.href = isOrder ? '/orders' : '/budgets';
            }, 1500);
        } catch (error) {
            notify('error', `Erro ao ${isEdit ? 'atualizar' : 'salvar'} registro.`);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppClick = async () => {
        let currentId = budgetId;

        // Se é um orçamento novo (não gravado), grava primeiro para gerar o ID e link do PDF
        if (!currentId) {
            if (peças.length === 0 || !customerId || !sellerId) {
                notify('warning', 'Selecione o Cliente, Vendedor e adicione ao menos uma peça antes de enviar por WhatsApp.');
                return;
            }

            setLoading(true);
            try {
                const payload = {
                    customer_id: customerId,
                    seller_id: sellerId,
                    framer_id: framerId || null,
                    status: isOrder ? 'confirmed' : 'draft',
                    payment_terms: isOrder ? 'CONFORME REGISTRO' : 'A DEFINIR',
                    discount: generalDiscount,
                    delivery_date: deliveryDate ? `${deliveryDate}${deliveryTime ? ' ' + deliveryTime + ':00' : ''}` : null,
                    payments: isOrder ? paymentList : [],
                    items: peças.map(p => ({
                        description: p.description,
                        height: p.height,
                        width: p.width,
                        observation: p.observation,
                        quantity: p.quantity,
                        increase_percent: parseFloat(p.increase_percent || 0),
                        discount_percent: parseFloat(p.discount_percent || 0),
                        sub_items: p.sub_items
                    }))
                };

                const res = await axios.post('/api/v1/sales/orders', payload);
                const savedOrder = res.data;
                currentId = savedOrder.id;
                setBudgetId(currentId);
                notify('success', 'Orçamento/Pedido gravado! Abrindo WhatsApp...');
            } catch (err) {
                notify('error', 'Erro ao gravar orçamento para envio.');
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        const foundCust = customers.find(c => c.id === customerId) || { name: selectedCustomerName };
        sendWhatsApp({
            id: currentId,
            customer: foundCust,
            total_value: totalValue,
            items: peças,
            status: isOrder ? 'confirmed' : 'draft'
        });
    };

    const handleCustomerSelected = (customer) => {
        if (customer) {
            // Adiciona à lista local se ainda não existe
            setCustomers(prev => {
                const exists = prev.some(c => c.id === customer.id);
                return exists ? prev : [...prev, customer];
            });
            setCustomerId(customer.id);
            setSelectedCustomerName(customer.name);
        }
    };

    return (
        <div className="w-full space-y-4 pb-20">
            {/* CABEÇALHO E ADIÇÃO DE PEÇA */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
                    <h1 className="text-xs font-black uppercase tracking-widest">
                        {isEdit ? `SCR-004E: Editando Registro ORD-${budgetId}` : 'SCR-004: Novo Orçamento / Pedido'}
                    </h1>
                    <span className="text-[10px] font-bold opacity-50 uppercase tracking-tighter">Entrada de Peças e Insumos</span>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Descrição do Item (Peça/Obra)</label>
                            <input
                                type="text"
                                className="w-full border-slate-200 rounded text-sm font-bold h-9"
                                placeholder="Ex: Espelho Veneziano"
                                value={newPeça.description}
                                onChange={(e) => setNewPeça({ ...newPeça, description: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Observações (Opcional)</label>
                            <input
                                type="text"
                                className="w-full border-slate-200 rounded text-sm font-bold h-9 px-3"
                                placeholder="Ex: Lapidado..."
                                value={newPeça.observation}
                                onChange={(e) => setNewPeça({ ...newPeça, observation: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Altura(cm)</label>
                            <input
                                type="number"
                                className="w-full border-slate-200 rounded text-sm font-bold h-9 text-center"
                                value={newPeça.height}
                                onChange={(e) => setNewPeça({ ...newPeça, height: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Largura(cm)</label>
                            <input
                                type="number"
                                className="w-full border-slate-200 rounded text-sm font-bold h-9 text-center"
                                value={newPeça.width}
                                onChange={(e) => setNewPeça({ ...newPeça, width: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Qtd</label>
                            <input
                                type="number"
                                className="w-full border-slate-200 rounded text-sm font-bold h-9 text-center"
                                value={newPeça.quantity}
                                onChange={(e) => setNewPeça({ ...newPeça, quantity: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1" title="Código interno">Cód. interno</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full border-slate-200 bg-white rounded text-sm font-bold h-9 text-center"
                                placeholder="0"
                                value={newPeça.increase_percent}
                                onChange={(e) => setNewPeça({ ...newPeça, increase_percent: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-rose-600 uppercase mb-1" title="Percentual de Desconto do Item">Desc. (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="w-full border-rose-200 bg-rose-50/20 rounded text-sm font-bold h-9 text-center text-rose-700"
                                placeholder="0%"
                                value={newPeça.discount_percent}
                                onChange={(e) => setNewPeça({ ...newPeça, discount_percent: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                onClick={handleAddPeça}
                                className="w-full bg-primary-600 text-white h-9 rounded font-black text-[10px] uppercase hover:bg-primary-700 transition shadow-lg"
                            >
                                + Adicionar
                            </button>
                        </div>
                    </div>
                </div>

                {/* ADIÇÃO INLINE DE MATERIAIS */}
                <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-3">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vincular Material à Peça:</label>
                            <select
                                className="w-full border-slate-200 rounded text-sm font-bold h-9 bg-slate-50"
                                value={targetPeçaId}
                                onChange={(e) => setTargetPeçaId(e.target.value)}
                            >
                                <option value="">Selecione a Peça...</option>
                                {peças.map(p => <option key={p.id} value={p.id}>{p.description} ({p.height}x{p.width})</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-6">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Pesquisar Material / Insumo</label>
                            <button
                                type="button"
                                onClick={() => setIsProductModalOpen(true)}
                                className={`w-full h-9 rounded text-sm font-bold border-2 transition-all flex items-center gap-2 px-3 ${selectedProduct
                                        ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                                        : 'border-slate-200 bg-white text-slate-400 hover:border-primary-300 hover:bg-slate-50'
                                    }`}
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {selectedProduct ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    )}
                                </svg>
                                <span className="truncate flex-1 text-left">
                                    {selectedProduct ? `${selectedProduct.code} - ${selectedProduct.name}` : 'Selecionar Material / Insumo...'}
                                </span>
                                {selectedProduct && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProduct(null);
                                        }}
                                        className="text-slate-400 hover:text-red-500 font-bold p-1 text-xs"
                                    >
                                        ✕
                                    </span>
                                )}
                            </button>
                        </div>
                        {selectedProduct && (selectedProduct.category?.calculation_type || 1) === 1 && (
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-amber-600 uppercase mb-1">Valor Unitário (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full border-amber-200 bg-amber-50/40 rounded text-sm font-black h-9 text-right"
                                    placeholder={parseFloat(selectedProduct.unit_price || 0).toFixed(2)}
                                    value={customUnitValue}
                                    onChange={(e) => setCustomUnitValue(e.target.value)}
                                />
                            </div>
                        )}
                        <div className={selectedProduct && (selectedProduct.category?.calculation_type || 1) === 1 ? 'md:col-span-1' : 'md:col-span-3'}>
                            <button
                                onClick={handleAddSubItem}
                                disabled={peças.length === 0}
                                className="w-full bg-slate-800 text-white h-9 rounded font-black text-[10px] uppercase hover:bg-slate-700 transition disabled:opacity-30"
                            >
                                Vincular Material
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ESQUELETO DO PEDIDO (PEÇAS E SEUS SUB-ITENS) */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo da Composição do Pedido</h2>
                </div>

                <div className="divide-y divide-slate-100">
                    {peças.length === 0 ? (
                        <div className="p-12 text-center text-slate-300 italic text-sm">Aguardando inclusão de peças...</div>
                    ) : peças.map((peça, pIdx) => {
                        const subItemCalculatedValues = calculateSubItemsValues(peça);
                        return (
                            <div key={peça.id} className="p-4 flex flex-col md:flex-row gap-6">
                                <div className="md:w-1/4 bg-slate-50 p-3 rounded border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded font-black">ITEM {pIdx + 1}</span>
                                        <button onClick={() => handleRemovePeça(peça.id)} className="text-rose-400 hover:text-rose-600 transition text-xs">✕ EXCLUIR</button>
                                    </div>
                                    <h3 className="font-black text-slate-700 uppercase text-sm">{peça.description}</h3>
                                    <p className="text-xs font-bold text-primary-600 mt-1">{peça.height} x {peça.width} cm</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Quantidade: {peça.quantity}</p>
                                    {peça.observation && (
                                        <p className="text-[10px] text-slate-500 font-medium italic mt-2 bg-white/50 p-1.5 rounded border border-slate-200">
                                            Obs: {peça.observation}
                                        </p>
                                    )}
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-500 uppercase mb-0.5">Código interno</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="w-full border-slate-200 rounded text-xs font-bold h-7 px-2 bg-white hover:border-slate-400 focus:border-slate-600 transition"
                                                placeholder="0"
                                                value={peça.increase_percent || ''}
                                                onChange={(e) => handlePeçaIncreasePercentChange(peça.id, parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-rose-600 uppercase mb-0.5">Desconto (%)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="w-full border-rose-200 rounded text-xs font-bold h-7 px-2 bg-rose-50/20 hover:border-rose-400 focus:border-rose-600 text-rose-700 transition"
                                                placeholder="0%"
                                                value={peça.discount_percent || ''}
                                                onChange={(e) => handlePeçaDiscountPercentChange(peça.id, parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-200">
                                        <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">Subtotal do Item</p>
                                        <p className="text-sm font-black text-slate-900">{formatCurrency(calculateItemTotal(peça))}</p>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full text-[11px]">
                                        <thead className="text-slate-400 font-black uppercase text-left border-b border-slate-50">
                                            <tr>
                                                <th className="pb-1 w-20">Código</th>
                                                <th className="pb-1">Descrição do Material</th>
                                                <th className="pb-1 text-center w-24">Cálculo</th>
                                                <th className="pb-1 text-center w-24">Margem (cm)</th>
                                                <th className="pb-1 text-right w-24">Valor Unit.</th>
                                                <th className="pb-1 text-center w-16">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {peça.sub_items.length === 0 ? (
                                                <tr><td colSpan="6" className="py-4 text-center text-slate-300 italic uppercase text-[10px]">Nenhum material vinculado</td></tr>
                                            ) : peça.sub_items.map((si, sIdx) => (
                                                <tr key={sIdx} className="hover:bg-slate-50">
                                                    <td className="py-2 text-slate-400 font-mono">{si.code || si.product?.code || '-'}</td>
                                                    <td className="py-2 font-bold text-slate-600 uppercase">{si.description}</td>
                                                    <td className="py-2 text-center uppercase text-[9px]">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-black">
                                                            {si.calculation_type == 2 ? 'Linear' : si.calculation_type == 3 ? 'M²' : 'Absoluto'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 text-center">
                                                        {si.allow_margin ? (
                                                            <input
                                                                type="number"
                                                                step="0.5"
                                                                min="0"
                                                                className="w-16 border-slate-200 rounded text-center text-[11px] font-bold h-7 px-1 bg-white hover:border-primary-400 focus:border-primary-600 transition-all shadow-2xs"
                                                                value={si.margin || 0}
                                                                onChange={(e) => handleSubItemMarginChange(peça.id, sIdx, parseFloat(e.target.value) || 0)}
                                                                title="Margem em centímetros"
                                                            />
                                                        ) : (
                                                            <span className="text-slate-300 font-black text-xs block text-center" title="Este produto não possui indicação de margem habilitada no cadastro">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-right font-black text-slate-700">{formatCurrency(subItemCalculatedValues[sIdx] !== undefined ? subItemCalculatedValues[sIdx] : si.unit_value)}</td>
                                                    <td className="py-2 text-center">
                                                        <button onClick={() => handleRemoveSubItem(peça.id, sIdx)} className="text-rose-300 hover:text-rose-500 text-lg">✕</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* SEÇÃO DE PAGAMENTO E ENTREGA */}
            <div className="bg-white border-2 border-primary-100 rounded-xl shadow-lg p-6 animate-in slide-in-from-bottom-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-md">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">
                                Formas de Pagamento Combinadas / Múltiplas
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Cadastre uma ou mais modalidades para este {isOrder ? 'pedido' : 'orçamento'}</p>
                        </div>
                    </div>

                    {/* RESUMO DOS VALORES DO PAGAMENTO */}
                    {(() => {
                        const totalOrder = calculateGrandTotal();
                        const totalAllocated = paymentList.reduce((acc, p) => acc + (parseFloat(p.value) || 0), 0);
                        const diff = totalOrder - totalAllocated;
                        const isBalanced = Math.abs(diff) < 0.05;

                        return (
                            <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                <div className="text-right px-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase block">Total do Pedido</span>
                                    <span className="text-xs font-black text-slate-800">{formatCurrency(totalOrder)}</span>
                                </div>
                                <div className="h-6 w-px bg-slate-200"></div>
                                <div className="text-right px-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase block">Alocado</span>
                                    <span className={`text-xs font-black ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {formatCurrency(totalAllocated)}
                                    </span>
                                </div>
                                {!isBalanced && (
                                    <div className="text-right px-2 bg-amber-50 border border-amber-200 rounded-lg py-0.5">
                                        <span className="text-[9px] font-black text-amber-600 uppercase block">Diferença</span>
                                        <span className="text-xs font-black text-amber-700">{formatCurrency(diff)}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* LISTA DE FORMAS DE PAGAMENTO */}
                <div className="space-y-4">
                    {paymentList.map((pLine, pIdx) => {
                        const pmObj = paymentMethods.find(m => m.id == pLine.payment_method_id);
                        const isCheque = pmObj?.description?.includes('CHEQUE');
                        const isCartao = pmObj?.description?.includes('CARTAO') || pmObj?.description?.includes('CARTÃO');

                        return (
                            <div key={pLine.id} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 relative transition-all hover:border-primary-200">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-800 text-white text-[9px] font-black px-2 py-0.5 rounded font-mono">
                                            FORMA #{pIdx + 1}
                                        </span>
                                        {pmObj && (
                                            <span className="text-xs font-black text-primary-700 uppercase">
                                                {pmObj.description}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-1.5 cursor-pointer bg-white border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 transition shadow-2xs">
                                            <input 
                                                type="checkbox"
                                                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                                checked={pLine.is_paid !== false}
                                                onChange={e => handleUpdatePaymentLine(pLine.id, 'is_paid', e.target.checked)}
                                            />
                                            <span className="text-[10px] font-black uppercase text-slate-700">Pago no ato</span>
                                        </label>
                                        {paymentList.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePaymentLine(pLine.id)}
                                                className="text-rose-500 hover:text-rose-700 text-xs font-black uppercase flex items-center gap-1 bg-rose-50 px-2 py-1 rounded hover:bg-rose-100 transition-all"
                                            >
                                                ✕ Remover
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-4">
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Forma de Pagamento</label>
                                        <select
                                            className="w-full border-slate-200 rounded-lg font-bold text-xs h-10 bg-white"
                                            value={pLine.payment_method_id}
                                            onChange={e => handleUpdatePaymentLine(pLine.id, 'payment_method_id', e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {paymentMethods.map(pm => (
                                                <option key={pm.id} value={pm.id}>{pm.description} {pm.is_cash ? '(À Vista)' : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Valor (R$)</label>
                                            {paymentList.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleFillRemainingBalance(pLine.id)}
                                                    className="text-[9px] font-black text-primary-600 hover:text-primary-800 underline uppercase"
                                                    title="Preencher saldo restante"
                                                >
                                                    Saldo Restante
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full border-slate-200 rounded-lg font-black text-xs h-10 px-3 bg-white text-slate-800"
                                            placeholder={paymentList.length === 1 ? calculateGrandTotal().toFixed(2) : '0.00'}
                                            value={pLine.value}
                                            onChange={e => handleUpdatePaymentLine(pLine.id, 'value', e.target.value)}
                                        />
                                    </div>

                                    {isCartao && (
                                        <>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Bandeira do Cartão</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Visa, Master..."
                                                    className="w-full border-slate-200 rounded-lg font-bold text-xs h-10 bg-white"
                                                    value={pLine.card_brand || ''}
                                                    onChange={e => handleUpdatePaymentLine(pLine.id, 'card_brand', e.target.value)}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Parcelas</label>
                                                <select
                                                    className="w-full border-slate-200 rounded-lg font-bold text-xs h-10 bg-white"
                                                    value={pLine.installments || 1}
                                                    onChange={e => handleUpdatePaymentLine(pLine.id, 'installments', parseInt(e.target.value))}
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => (
                                                        <option key={n} value={n}>{n}x</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {isCheque && (
                                        <div className="md:col-span-3">
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de Cheque</label>
                                            <select
                                                className="w-full border-slate-200 rounded-lg font-bold text-xs h-10 bg-white"
                                                value={pLine.cheque_type || 'vista'}
                                                onChange={e => handleUpdatePaymentLine(pLine.id, 'cheque_type', e.target.value)}
                                            >
                                                <option value="vista">À VISTA</option>
                                                <option value="parcelado">PARCELADO</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className={isCartao || isCheque ? 'md:col-span-12' : 'md:col-span-5'}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Observações desta Modalidade</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Pago no balcão / Sinal..."
                                            className="w-full border-slate-200 rounded-lg font-medium text-xs h-10 bg-white"
                                            value={pLine.observation || ''}
                                            onChange={e => handleUpdatePaymentLine(pLine.id, 'observation', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 pt-2">
                    <button
                        type="button"
                        onClick={handleAddPaymentLine}
                        className="bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-all text-xs font-black uppercase px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                        + Adicionar Outra Forma de Pagamento
                    </button>
                </div>

                {/* DATA E HORA DE ENTREGA */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h4 className="text-xs font-black uppercase text-slate-700 tracking-widest">Previsão de Entrega</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Data de Entrega</label>
                            <input
                                type="date"
                                className="w-full border-slate-200 rounded-lg font-bold text-sm h-11"
                                value={deliveryDate}
                                onChange={e => setDeliveryDate(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Horário de Entrega</label>
                            <input
                                type="time"
                                className="w-full border-slate-200 rounded-lg font-bold text-sm h-11"
                                value={deliveryTime}
                                onChange={e => setDeliveryTime(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4">
                {/* LINHA PRINCIPAL: DADOS E TOTAL */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cliente</label>
                        <button
                            type="button"
                            onClick={() => setIsCustomerModalOpen(true)}
                            className={`w-full h-10 rounded text-sm font-bold border-2 transition-all flex items-center gap-2 px-3 ${customerId
                                    ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                                    : 'border-slate-200 bg-white text-slate-400 hover:border-primary-300 hover:bg-slate-50'
                                }`}
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {customerId ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                )}
                            </svg>
                            <span className="truncate flex-1 text-left">
                                {customerId ? selectedCustomerName : 'Selecionar Cliente...'}
                            </span>
                            {customerId && (
                                <span
                                    onClick={(e) => { e.stopPropagation(); setCustomerId(''); setSelectedCustomerName(''); }}
                                    className="text-primary-400 hover:text-rose-500 transition text-xs shrink-0"
                                    title="Remover cliente"
                                >
                                    ✕
                                </span>
                            )}
                        </button>
                    </div>
                    <div className="md:col-span-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Vendedor</label>
                        <select
                            className="w-full border-slate-200 rounded text-sm font-bold h-10 border-2 border-indigo-100 bg-white"
                            value={sellerId}
                            onChange={(e) => setSellerId(e.target.value)}
                        >
                            <option value="">-- VENDEDOR --</option>
                            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="md:col-span-2 flex items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 h-10">
                        <input
                            id="is_order_toggle"
                            type="checkbox"
                            className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                            checked={isOrder}
                            onChange={e => setIsOrder(e.target.checked)}
                        />
                        <label htmlFor="is_order_toggle" className="ml-2 text-[10px] font-black text-slate-600 uppercase cursor-pointer">Salvar como Pedido</label>
                    </div>

                    <div className="md:col-span-3 text-right bg-slate-900 text-white p-2.5 rounded-lg shadow-inner">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Geral</p>
                        <p className="text-xl font-black text-emerald-400 leading-none">
                            {formatCurrency(totalValue)}
                        </p>
                    </div>
                </div>

                {/* LINHA DE BAIXO: BOTÕES DE AÇÃO DEDICADOS */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        disabled={peças.length === 0 || !customerId || loading}
                        onClick={handleWhatsAppClick}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition shadow-md flex items-center gap-2 disabled:opacity-40"
                        title="Enviar resumo do pedido com link do PDF via WhatsApp"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        <span>Enviar via WhatsApp</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => window.location.href = '/budgets'}
                            className="px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={peças.length === 0 || !customerId || !sellerId || loading || (isOrder && paymentList.some(p => !p.payment_method_id))}
                            onClick={handleSubmit}
                            className="bg-primary-600 text-white px-8 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition shadow-xl shadow-primary-900/20 disabled:opacity-50"
                        >
                            {loading ? '...' : isEdit ? 'ATUALIZAR' : 'GRAVAR PEDIDO / ORÇAMENTO'}
                        </button>
                    </div>
                </div>
            </div>
            <CustomerQuickModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onCustomerSelected={handleCustomerSelected}
            />
            <ProductQuickModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onProductSelected={(prod) => setSelectedProduct(prod)}
            />
        </div>
    );
};

export default BudgetScreen;
