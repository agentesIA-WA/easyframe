import React, { useState, useEffect } from 'react';
import axios from 'axios';

import ViewModal from '../../Components/Modals/ViewModal';
import ConfirmModal from '../../Components/Modals/ConfirmModal';

const InventoryList = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [viewingItem, setViewingItem] = useState(null);

    // Seleção de produtos e modal de Ajuste Manual
    const [selectedIds, setSelectedIds] = useState([]);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState('percent'); // 'percent' ou 'fixed'
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

    // ConfirmModal do sistema
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar'
    });

    const fetchInventory = async (searchTerm = search, sortField = sortBy, direction = sortDir) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/inventory/report?search=${searchTerm}&sort_by=${sortField}&sort_direction=${direction}`);
            setItems(response.data);
        } catch (error) {
            console.error('Erro ao buscar estoque:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInventory(search, sortBy, sortDir);
        }, 500);
        return () => clearTimeout(timer);
    }, [search, sortBy, sortDir]);

    const handleSort = (field) => {
        const isAsc = sortBy === field && sortDir === 'asc';
        setSortBy(field);
        setSortDir(isAsc ? 'desc' : 'asc');
    };

    const SortIcon = ({ field }) => {
        if (sortBy !== field) return <span className="text-slate-400 ml-1 opacity-50">↕</span>;
        return sortDir === 'asc' ? <span className="text-white ml-1">↑</span> : <span className="text-white ml-1">↓</span>;
    };

    const getUnitLabel = (item) => {
        const type = parseInt(item?.category?.calculation_type || item?.calculation_type || 1, 10);
        const units = { 1: 'un', 2: 'm', 3: 'm²' };
        return units[type] || 'un';
    };

    // Lógica de Seleção de Produtos
    const toggleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(items.map(i => i.id));
        }
    };

    const toggleSelectProduct = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleOpenAdjustmentModal = () => {
        if (selectedIds.length === 0 && items.length > 0) {
            setSelectedIds(items.map(i => i.id));
        }
        setAdjustmentValue('');
        setIsAdjustmentModalOpen(true);
    };

    const calculateNewPrice = (currentPrice) => {
        const price = parseFloat(currentPrice || 0);
        const val = parseFloat(adjustmentValue || 0);
        if (isNaN(val) || val === 0) return price;

        let newPrice = price;
        if (adjustmentType === 'percent') {
            newPrice = price * (1 + (val / 100));
        } else {
            newPrice = price + val;
        }
        return Math.max(0, newPrice);
    };

    const targetProductsForAdjustment = items.filter(i => selectedIds.includes(i.id));

    // Validação e Abertura do ConfirmModal no Padrão do Sistema
    const handleRequestAdjustmentConfirm = () => {
        if (selectedIds.length === 0) {
            setConfirmModal({
                isOpen: true,
                type: 'warning',
                title: 'Nenhum Produto Selecionado',
                message: 'Por favor, selecione ao menos um produto para aplicar o reajuste.',
                confirmText: 'Entendi',
                cancelText: null,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        const numVal = parseFloat(adjustmentValue);
        if (isNaN(numVal) || numVal === 0) {
            setConfirmModal({
                isOpen: true,
                type: 'warning',
                title: 'Valor de Ajuste Inválido',
                message: 'Por favor, informe um valor numérico válido (diferente de zero) para o reajuste de preço.',
                confirmText: 'Corrigir',
                cancelText: null,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        const formattedAdjustment = adjustmentType === 'percent' 
            ? `${numVal > 0 ? '+' : ''}${numVal}%` 
            : `${numVal > 0 ? '+R$ ' : '-R$ '}${Math.abs(numVal).toFixed(2)}`;

        setConfirmModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Reajuste de Preços de Venda',
            message: `Confirma a aplicação do reajuste de ${formattedAdjustment} no preço de venda de ${targetProductsForAdjustment.length} produto(s) selecionado(s)? Esta ação atualizará permanentemente a tabela de preços.`,
            confirmText: 'Sim, Confirmar e Aplicar',
            cancelText: 'Cancelar',
            onConfirm: () => executeApplyAdjustment(numVal)
        });
    };

    const executeApplyAdjustment = async (numVal) => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setSubmittingAdjustment(true);

        try {
            const response = await axios.post('/api/v1/products/bulk-price-update', {
                product_ids: selectedIds,
                adjustment_type: adjustmentType,
                adjustment_value: numVal
            });

            setIsAdjustmentModalOpen(false);
            setSelectedIds([]);
            fetchInventory();

            setConfirmModal({
                isOpen: true,
                type: 'primary',
                title: 'Reajuste Concluído',
                message: response.data.message || 'Preços de venda atualizados com sucesso!',
                confirmText: 'Concluído',
                cancelText: null,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } catch (error) {
            console.error('Erro ao atualizar preços:', error);
            setConfirmModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro no Reajuste',
                message: error.response?.data?.message || 'Falha ao reajustar preços de venda dos produtos.',
                confirmText: 'Fechar',
                cancelText: null,
                onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
            });
        } finally {
            setSubmittingAdjustment(false);
        }
    };

    return (
        <>
            <div className="max-w-[1400px] mx-auto space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="bg-slate-800 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-black uppercase tracking-widest">SCR-008: Controle de Estoque</h1>
                            {selectedIds.length > 0 && (
                                <span className="bg-primary-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                    {selectedIds.length} selecionado(s)
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-2 items-center">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                </span>
                                <input 
                                    type="text" 
                                    placeholder="Pesquisar..." 
                                    className="pl-8 pr-4 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-xs focus:ring-primary-500 focus:border-primary-500 w-full md:w-64 text-white placeholder-slate-400"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleOpenAdjustmentModal}
                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded font-bold text-[10px] uppercase tracking-tighter transition-all whitespace-nowrap shadow flex items-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Ajuste Manual de Preços {selectedIds.length > 0 && `(${selectedIds.length})`}
                            </button>
                            <a href="/purchases" className="bg-primary-600 text-white px-3 py-1.5 rounded font-bold text-[10px] uppercase tracking-tighter shadow-lg hover:bg-primary-700 transition-all whitespace-nowrap text-center">
                                Registrar Compra
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens Críticos (&lt; 5)</p>
                            <p className="text-2xl font-black text-rose-600 mt-1">
                                {items.filter(i => (i.stock_balance || 0) < 5).length} <span className="text-[10px] font-bold text-slate-400 uppercase">itens</span>
                            </p>
                        </div>
                        <div className="p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Variedade de Catálogo</p>
                            <p className="text-2xl font-black text-slate-900 mt-1">
                                {items.length} <span className="text-[10px] font-bold text-slate-400 uppercase">SKUs</span>
                            </p>
                        </div>
                        <div className="p-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Estimado em Saldo</p>
                            <p className="text-2xl font-black text-primary-600 mt-1">
                                R$ {items.reduce((acc, i) => acc + (Math.max(0, i.stock_balance || 0) * (i.unit_price || 0)), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto scroller-thin">
                        <table className="w-full min-w-[750px] text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-3 py-3 w-8 text-center">
                                        <input 
                                            type="checkbox"
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                            checked={items.length > 0 && selectedIds.length === items.length}
                                            onChange={toggleSelectAll}
                                            title="Selecionar Todos os Produtos"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('code')}>
                                        Código <SortIcon field="code" />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('category.name')}>
                                        Categoria <SortIcon field="category.name" />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                                        Produto <SortIcon field="name" />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('unit_price')}>
                                        Preço de Venda <SortIcon field="unit_price" />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('total_in')}>
                                        Entradas <SortIcon field="total_in" />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('stock_balance')}>
                                        Saldo Atual <SortIcon field="stock_balance" />
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="8" className="text-center py-8 text-slate-400 italic text-xs">Carregando inventário...</td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan="8" className="text-center py-8 text-slate-400 italic text-xs">Nenhum produto em estoque.</td></tr>
                                ) : items.map(item => {
                                    const isSelected = selectedIds.includes(item.id);
                                    return (
                                        <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'}`}>
                                            <td className="px-3 py-3 text-center">
                                                <input 
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectProduct(item.id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-mono text-[10px] text-slate-500 font-bold whitespace-nowrap">{item.code}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase shadow-sm">
                                                    {item.category?.name || 'Geral'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-800 uppercase text-xs whitespace-nowrap">{item.name}</td>
                                            <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                                                R$ {parseFloat(item.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap font-mono text-xs font-bold text-slate-600">
                                                {parseFloat(item.total_in || 0).toFixed(2)} <span className="text-[10px] text-slate-400 font-black uppercase">{getUnitLabel(item)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center whitespace-nowrap">
                                                <span className={`font-black text-sm font-mono ${(item.stock_balance || 0) < 0 ? 'text-rose-600' : (item.stock_balance || 0) < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {parseFloat(item.stock_balance || 0).toFixed(2)}
                                                </span>
                                                <span className="text-[10px] text-slate-400 ml-1 font-black uppercase">
                                                    {getUnitLabel(item)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                                    <button onClick={() => setViewingItem(item)} className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-tighter hover:bg-blue-100 transition-colors">Visualizar</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de Ajuste Manual / Majoração do Preço de Venda */}
            {isAdjustmentModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200">
                        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Ajuste Manual de Preços de Venda
                                </h3>
                                <p className="text-xs text-slate-300 mt-0.5">Aplique um percentual de aumento ou ajuste fixo ao preço de venda dos produtos selecionados.</p>
                            </div>
                            <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Parâmetros do Reajuste */}
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipo de Reajuste</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setAdjustmentType('percent')}
                                                className={`py-2 px-3 rounded text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 border ${adjustmentType === 'percent' ? 'bg-primary-600 text-white border-primary-600 shadow' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                                            >
                                                <span>% Porcentagem</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAdjustmentType('fixed')}
                                                className={`py-2 px-3 rounded text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 border ${adjustmentType === 'fixed' ? 'bg-primary-600 text-white border-primary-600 shadow' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}`}
                                            >
                                                <span>R$ Valor Fixo</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            {adjustmentType === 'percent' ? 'Majoração / Ajuste (%)' : 'Majoração / Ajuste (R$)'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none font-bold text-xs text-slate-400">
                                                {adjustmentType === 'percent' ? '%' : 'R$'}
                                            </span>
                                            <input 
                                                type="number"
                                                step="any"
                                                placeholder={adjustmentType === 'percent' ? 'Ex: 10 para +10%' : 'Ex: 5.00 para +R$ 5,00'}
                                                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:ring-primary-500 focus:border-primary-500 font-bold"
                                                value={adjustmentValue}
                                                onChange={(e) => setAdjustmentValue(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 font-medium">
                                            * Digite valores positivos para aumento de preço ou valores negativos (ex: -5) para desconto.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Produtos Afetados com Prévia dos Novos Valores */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Produtos Selecionados para Reajuste ({targetProductsForAdjustment.length})
                                    </h4>
                                    <span className="text-[10px] text-slate-500 font-semibold">
                                        Prévia em tempo real dos novos valores de venda
                                    </span>
                                </div>

                                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2">Código</th>
                                                <th className="px-3 py-2">Produto</th>
                                                <th className="px-3 py-2 text-right">Preço Atual</th>
                                                <th className="px-3 py-2 text-right">Novo Preço</th>
                                                <th className="px-3 py-2 text-right">Diferença</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                            {targetProductsForAdjustment.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="text-center py-6 text-slate-400 italic">
                                                        Nenhum produto selecionado. Marque os produtos na tabela para reajustar.
                                                    </td>
                                                </tr>
                                            ) : targetProductsForAdjustment.map(prod => {
                                                const currentP = parseFloat(prod.unit_price || 0);
                                                const newP = calculateNewPrice(currentP);
                                                const diff = newP - currentP;

                                                return (
                                                    <tr key={prod.id} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 font-bold text-slate-500">{prod.code}</td>
                                                        <td className="px-3 py-2 font-sans font-bold text-slate-800 uppercase">{prod.name}</td>
                                                        <td className="px-3 py-2 text-right text-slate-600">
                                                            R$ {currentP.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                                                            R$ {newP.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className={`px-3 py-2 text-right font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                            {diff > 0 ? `+R$ ${diff.toFixed(2)}` : diff < 0 ? `-R$ ${Math.abs(diff).toFixed(2)}` : 'R$ 0.00'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => setIsAdjustmentModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={submittingAdjustment || targetProductsForAdjustment.length === 0 || !adjustmentValue}
                                onClick={handleRequestAdjustmentConfirm}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow transition-all flex items-center gap-2"
                            >
                                {submittingAdjustment ? 'Processando...' : `Confirmar e Aplicar Reajuste (${targetProductsForAdjustment.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ViewModal 
                isOpen={!!viewingItem} 
                onClose={() => setViewingItem(null)} 
                title="Detalhes do Estoque" 
                data={viewingItem} 
                fields={[
                    { key: 'code', label: 'Código do Produto' },
                    { key: 'name', label: 'Descrição / Nome' },
                    { key: 'category', label: 'Categoria', format: (cat) => cat ? cat.name : 'Geral' },
                    { key: 'unit_price', label: 'Preço de Venda Unitário', format: (val) => `R$ ${parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
                    { key: 'total_in', label: 'Entradas de Compras', format: (val, item) => `${parseFloat(val || 0).toFixed(2)} ${getUnitLabel(item)}` },
                    { key: 'total_sold', label: 'Saídas por Vendas (Pedidos)', format: (val, item) => `${parseFloat(val || 0).toFixed(2)} ${getUnitLabel(item)}` },
                    { key: 'stock_balance', label: 'Saldo Atual Disponível', format: (val, item) => `${parseFloat(val || 0).toFixed(2)} ${getUnitLabel(item)}` },
                    { key: 'width', label: 'Largura Padrão (cm)', format: (val) => (val && val > 0) ? `${val} cm` : 'Não aplicável' }
                ]}
            />

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                type={confirmModal.type}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
};

export default InventoryList;
