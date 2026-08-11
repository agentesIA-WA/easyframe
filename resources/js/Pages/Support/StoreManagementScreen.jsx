import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../../Components/Layout';
import { useAuth } from '../../Contexts/AuthContext';

export default function StoreManagementScreen() {
    const { isAdmin, hasAccess, refreshUser } = useAuth();
    const canCreate = isAdmin || hasAccess('stores', 'create');
    const canEdit = isAdmin || hasAccess('stores', 'update');
    const canManageUsers = isAdmin || hasAccess('stores', 'update') || hasAccess('stores', 'create');
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingStore, setEditingStore] = useState(null); // null = list/create mode
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        company_name: '',
        corporate_name: '',
        cnpj: '',
        address: '',
        city: '',
        cep: '',
        phone: '',
        email: '',
        is_wholesale: false
    });
    
    // Gestão de Permissões por Usuário da Loja selecionada
    const [selectedStoreForUsers, setSelectedStoreForUsers] = useState(null);
    const [storeUsers, setStoreUsers] = useState([]);
    const [savingUsers, setSavingUsers] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState(null);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/core/stores');
            setStores(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Erro ao buscar lojas:', err);
            setStores([]);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingStore({ isNew: true });
        setFormData({
            name: '',
            code: '',
            company_name: '',
            corporate_name: '',
            cnpj: '',
            address: '',
            city: '',
            cep: '',
            phone: '',
            email: '',
            is_wholesale: false
        });
    };

    const handleOpenEdit = (store) => {
        setEditingStore(store);
        setFormData({
            name: store.name || '',
            code: store.code || '',
            company_name: store.company_name || '',
            corporate_name: store.corporate_name || '',
            cnpj: store.cnpj || '',
            address: store.address || '',
            city: store.city || '',
            cep: store.cep || '',
            phone: store.phone || '',
            email: store.email || '',
            is_wholesale: !!store.is_wholesale
        });
    };

    const handleSaveStore = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                company_name: formData.company_name || formData.name || 'EASY FRAME'
            };
            if (editingStore?.isNew) {
                await axios.post('/api/v1/core/stores', payload);
                setFeedbackMsg('Nova Loja / Identidade Corporativa criada com sucesso!');
            } else {
                await axios.put(`/api/v1/core/stores/${editingStore.id}`, payload);
                setFeedbackMsg('Dados da loja atualizados com sucesso!');
            }
            setEditingStore(null);
            fetchStores();
            refreshUser();
            setTimeout(() => setFeedbackMsg(null), 4000);
        } catch (err) {
            console.error('Erro ao salvar loja:', err);
            alert(err.response?.data?.message || `Erro ao salvar loja: ${err.message}`);
        }
    };

    const handleOpenUserPermissions = async (store) => {
        setSelectedStoreForUsers(store);
        try {
            const res = await axios.get(`/api/v1/core/stores/${store.id}/users`);
            setStoreUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Erro ao carregar permissões da loja:', err);
            setStoreUsers([]);
        }
    };

    const toggleUserAccess = (userId) => {
        setStoreUsers(prev => prev.map(u => u.id === userId ? { ...u, has_access: !u.has_access } : u));
    };

    const handleSaveUserPermissions = async () => {
        if (!selectedStoreForUsers) return;
        setSavingUsers(true);
        try {
            const allowedUserIds = storeUsers.filter(u => u.has_access || u.is_admin).map(u => u.id);
            await axios.post(`/api/v1/core/stores/${selectedStoreForUsers.id}/users`, {
                user_ids: allowedUserIds
            });
            setFeedbackMsg(`Permissões da ${selectedStoreForUsers.name} salvas com sucesso!`);
            setSelectedStoreForUsers(null);
            refreshUser();
            setTimeout(() => setFeedbackMsg(null), 4000);
        } catch (err) {
            alert(err.response?.data?.message || 'Erro ao salvar permissões');
        } finally {
            setSavingUsers(false);
        }
    };

    return (
        <Layout title="Gerenciamento de Lojas & Identidades">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* CABEÇALHO */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-lg font-black uppercase text-slate-900 tracking-wider">Identidades Corporativas / Lojas</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                            Cadastre múltiplas unidades (Lojas) e gerencie quais usuários possuem acesso a cada uma.
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={handleOpenCreate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition shadow-md flex items-center gap-2 shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                            Nova Loja / Unidade
                        </button>
                    )}
                </div>

                {feedbackMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-bold flex items-center justify-between">
                        <span>✓ {feedbackMsg}</span>
                    </div>
                )}

                {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO */}
                {editingStore && (
                    <div className="bg-white rounded-xl border-2 border-indigo-200 p-6 shadow-md animate-[fadeIn_0.2s_ease-out]">
                        <h3 className="text-sm font-black uppercase tracking-wider text-indigo-900 mb-4 pb-2 border-b border-indigo-100">
                            {editingStore.isNew ? 'Cadastrar Nova Loja / Identidade' : `Editar: ${editingStore.name}`}
                        </h3>
                        <form onSubmit={handleSaveStore} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Identificador da Loja *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Ex: Loja Centro, Unidade 2"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Código / Sigla</label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: MATRIZ, LOJA02"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold uppercase"
                                        value={formData.code}
                                        onChange={e => setFormData({...formData, code: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome Fantasia *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Ex: EASY FRAME CENTRO"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold uppercase"
                                        value={formData.company_name}
                                        onChange={e => setFormData({...formData, company_name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Razão Social</label>
                                    <input 
                                        type="text" 
                                        placeholder="Razão Social completa"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold uppercase"
                                        value={formData.corporate_name}
                                        onChange={e => setFormData({...formData, corporate_name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">CNPJ</label>
                                    <input 
                                        type="text" 
                                        placeholder="00.000.000/0000-00"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold"
                                        value={formData.cnpj}
                                        onChange={e => setFormData({...formData, cnpj: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Telefone</label>
                                    <input 
                                        type="text" 
                                        placeholder="(00) 00000-0000"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold"
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Endereço</label>
                                    <input 
                                        type="text" 
                                        placeholder="Rua, Número, Bairro"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold"
                                        value={formData.address}
                                        onChange={e => setFormData({...formData, address: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cidade / UF</label>
                                    <input 
                                        type="text" 
                                        placeholder="Cidade - UF"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold"
                                        value={formData.city}
                                        onChange={e => setFormData({...formData, city: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">E-mail Corporativo</label>
                                    <input 
                                        type="email" 
                                        placeholder="contato@loja.com.br"
                                        className="w-full border-slate-200 rounded-lg text-xs font-bold"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-2 cursor-pointer p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        checked={formData.is_wholesale}
                                        onChange={e => setFormData({...formData, is_wholesale: e.target.checked})}
                                    />
                                    <div>
                                        <span className="block text-xs font-black uppercase text-slate-800">Unidade de Atacado</span>
                                        <span className="block text-[10px] text-slate-500 font-bold">Nesta unidade, dimensões (Altura/Largura) não serão obrigatórias no orçamento.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingStore(null)}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider"
                                >
                                    Salvar Loja
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* LISTAGEM DAS LOJAS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Lojas Cadastradas ({stores.length})</span>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">Carregando lojas...</div>
                    ) : stores.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">Nenhuma loja cadastrada.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {stores.map(store => (
                                <div key={store.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200">
                                            🏢
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black text-slate-900 uppercase">{store.name}</h4>
                                                {store.code && (
                                                    <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded font-mono font-bold">{store.code}</span>
                                                )}
                                                {store.is_wholesale && (
                                                    <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">Atacado</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-indigo-800 uppercase mt-0.5">{store.company_name}</p>
                                            <div className="text-[11px] text-slate-500 font-medium mt-1 space-y-0.5">
                                                {store.cnpj && <p>CNPJ: {store.cnpj}</p>}
                                                {store.address && <p>{store.address}{store.city ? ` - ${store.city}` : ''}</p>}
                                                {store.phone && <p>Fone: {store.phone} | Email: {store.email || 'N/A'}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {canManageUsers && (
                                            <button
                                                onClick={() => handleOpenUserPermissions(store)}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition"
                                            >
                                                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                                Permissões de Usuários
                                            </button>
                                        )}

                                        {canEdit && (
                                            <button
                                                onClick={() => handleOpenEdit(store)}
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                Editar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MODAL DE PERMISSÕES DE USUÁRIOS POR LOJA */}
                {selectedStoreForUsers && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-[scaleUp_0.15s_ease-out]">
                            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-sm uppercase">Permissões de Acesso</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{selectedStoreForUsers.name}</p>
                                </div>
                                <button onClick={() => setSelectedStoreForUsers(null)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
                                <p className="text-xs font-bold text-slate-600 mb-3">
                                    Selecione quais usuários têm permissão para acessar e operar na <span className="text-indigo-700 font-black">{selectedStoreForUsers.name}</span>:
                                </p>

                                {storeUsers.map(u => (
                                    <label key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="checkbox"
                                                disabled={u.is_admin}
                                                checked={u.is_admin || u.has_access}
                                                onChange={() => toggleUserAccess(u.id)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 disabled:opacity-50"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-800 uppercase block">{u.name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono block">{u.email}</span>
                                            </div>
                                        </div>
                                        {u.is_admin && (
                                            <span className="text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Admin (Acesso Total)</span>
                                        )}
                                    </label>
                                ))}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setSelectedStoreForUsers(null)}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveUserPermissions}
                                    disabled={savingUsers}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider disabled:opacity-50"
                                >
                                    {savingUsers ? 'Salvando...' : 'Salvar Permissões'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </Layout>
    );
}
