import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';
import { useAuth } from '../../Contexts/AuthContext';

const UserPermissions = () => {
    const { user: currentUser, refreshUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [modules, setModules] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState({}); // { moduleId: { view: bool, create: bool, update: bool, delete: bool } }
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [accountData, setAccountData] = useState({ email: '', password: '' });
    const [showGuidedBanner, setShowGuidedBanner] = useState(false);
    const { notify } = useNotification();
    const matrixRef = useRef(null);

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        setCreatingAccount(true);
        try {
            const res = await axios.post('/api/v1/identity/users/create-account', {
                employee_id: selectedUser.employee_id,
                ...accountData
            });
            notify('success', 'Conta de acesso criada com sucesso!');
            
            const newUser = res.data.user;
            // Atualiza lista local
            setUsers(prev => prev.map(u => u.employee_id === selectedUser.employee_id ? newUser : u));
            setSelectedUser(newUser);
            setAccountData({ email: '', password: '' });
            
            // Ativa o banner guiado e faz scroll para a matriz
            setShowGuidedBanner(true);
            setTimeout(() => {
                matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        } catch (error) {
            notify('error', error.response?.data?.message || 'Erro ao criar conta.');
        } finally {
            setCreatingAccount(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, modulesRes] = await Promise.all([
                    axios.get('/api/v1/identity/users'),
                    axios.get('/api/v1/identity/modules')
                ]);
                
                const userData = usersRes.data.data || usersRes.data;
                const moduleData = modulesRes.data.data || modulesRes.data;
                
                setUsers(Array.isArray(userData) ? userData : []);
                setModules(Array.isArray(moduleData) ? moduleData : []);
            } catch (error) {
                notify('error', 'Falha ao carregar dados de segurança.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            const permissionsMap = {};
            selectedUser.permissions?.forEach(p => {
                permissionsMap[p.module_id] = {
                    view: !!p.can_view,
                    create: !!p.can_create,
                    update: !!p.can_update,
                    delete: !!p.can_delete
                };
            });
            setUserPermissions(permissionsMap);
        }
    }, [selectedUser]);

    const handleTogglePermission = (moduleId, action) => {
        setUserPermissions(prev => {
            const current = prev[moduleId] || { view: false, create: false, update: false, delete: false };
            return {
                ...prev,
                [moduleId]: {
                    ...current,
                    [action]: !current[action]
                }
            };
        });
    };

    const handleToggleAll = () => {
        // Verifica se tudo está marcado para fazer toggle
        const allChecked = modules.every(m => {
            const perms = userPermissions[m.id];
            return perms && perms.view && perms.create && perms.update && perms.delete;
        });

        const newPermissions = {};
        modules.forEach(m => {
            newPermissions[m.id] = {
                view: !allChecked,
                create: !allChecked,
                update: !allChecked,
                delete: !allChecked
            };
        });
        setUserPermissions(newPermissions);
    };

    const handleSave = async () => {
        if (!selectedUser || !selectedUser.id) return;
        setSaving(true);
        try {
            const permissionsToSave = Object.entries(userPermissions).map(([moduleId, perms]) => ({
                module_id: moduleId,
                can_view: perms.view,
                can_create: perms.create,
                can_update: perms.update,
                can_delete: perms.delete
            }));

            await axios.post(`/api/v1/identity/users/${selectedUser.id}/permissions`, {
                permissions: permissionsToSave
            });
            notify('success', `Permissões de ${selectedUser.name} sincronizadas.`);
            setShowGuidedBanner(false);
            
            // Atualiza a lista local de usuários para refletir as mudanças
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, permissions: permissionsToSave } : u));

            // Se for o próprio usuário logado, atualiza o contexto de autenticação
            if (currentUser && currentUser.id === selectedUser.id) {
                await refreshUser();
            }
        } catch (error) {
            notify('error', 'Erro ao salvar permissões.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400 font-black uppercase tracking-widest italic animate-pulse">Carregando matriz de acesso...</div>;

    const PermissionCheckbox = ({ moduleId, action, label, checked }) => (
        <button 
            type="button"
            onClick={() => handleTogglePermission(moduleId, action)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${checked ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-100 text-slate-300 hover:border-slate-200'}`}
        >
            <span className={`text-[8px] font-black uppercase tracking-tighter mb-1 ${checked ? 'text-primary-600' : 'text-slate-400'}`}>{label}</span>
            <div className={`w-5 h-5 rounded flex items-center justify-center ${checked ? 'bg-primary-600 text-white' : 'bg-slate-100'}`}>
                {checked && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
            </div>
        </button>
    );

    // Calcula se todas as permissões estão marcadas
    const allChecked = modules.length > 0 && modules.every(m => {
        const perms = userPermissions[m.id];
        return perms && perms.view && perms.create && perms.update && perms.delete;
    });

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Cabeçalho e Seletor de Funcionário */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1 space-y-1">
                        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Matriz de Acesso</h2>
                        <p className="text-slate-400 text-xs font-bold tracking-widest uppercase italic">Selecione um funcionário para gerenciar suas permissões de navegação e CRUD</p>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Escolha o Funcionário</label>
                        <select 
                            className="w-full bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-primary-500 focus:border-primary-500 h-12"
                            value={selectedUser ? (selectedUser.id || `emp_${selectedUser.employee_id}`) : ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const user = users.find(u => {
                                    const identifier = u.id ? String(u.id) : `emp_${u.employee_id}`;
                                    return identifier === val;
                                });
                                setSelectedUser(user || null);
                                setShowGuidedBanner(false);
                            }}
                        >
                            <option value="">Selecione na lista...</option>
                            {users.map(u => {
                                const key = u.id ? String(u.id) : `emp_${u.employee_id}`;
                                return (
                                    <option key={key} value={key}>{u.name} ({u.role})</option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </div>

            {/* Banner Guiado (aparece após criar conta) */}
            {showGuidedBanner && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/20 flex items-center gap-4 animate-[slideDown_0.4s_ease-out]">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-sm uppercase tracking-wider">Conta Criada com Sucesso!</h3>
                        <p className="text-emerald-100 text-xs font-bold mt-1">
                            Configure abaixo as funcionalidades que este funcionário pode acessar. Use o atalho "Acesso Total" ou marque individualmente cada permissão.
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowGuidedBanner(false)}
                        className="text-white/60 hover:text-white transition shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            )}

            {/* Matriz de Permissões CRUD */}
            <div ref={matrixRef} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
                {selectedUser ? (
                    <>
                        <div className="p-8 border-b border-slate-100 bg-slate-50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Definição de Acesso: {selectedUser.name}</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cargo: <span className="text-primary-600">{selectedUser.role}</span></p>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                {!selectedUser.id && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 text-[9px] font-black uppercase tracking-tighter">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                        Sem conta de acesso vinculada
                                    </div>
                                )}
                                {selectedUser.id && (
                                    <button
                                        onClick={handleToggleAll}
                                        className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition transform active:scale-95 ${
                                            allChecked 
                                                ? 'bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100' 
                                                : 'bg-emerald-50 border-emerald-400 text-emerald-700 hover:bg-emerald-100'
                                        }`}
                                    >
                                        {allChecked ? '⊘ Desmarcar Todos' : '✓ Marcar Todos na Matriz'}
                                    </button>
                                )}
                                <button 
                                    onClick={handleSave}
                                    disabled={saving || !selectedUser.id}
                                    className={`bg-primary-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary-900/20 transition transform active:scale-95 ${saving || !selectedUser.id ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary-700'}`}
                                >
                                    {saving ? 'Sincronizando...' : 'SALVAR MATRIZ'}
                                </button>
                            </div>
                        </div>

                        {!selectedUser.id ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50/50">
                                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 space-y-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-11a4 4 0 11-8 0 4 4 0 018 0zm-1 8H5a2 2 0 00-2 2v2a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2h-8z"/></svg>
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Criar Conta de Acesso</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Este funcionário ainda não possui login</p>
                                    </div>

                                    <form onSubmit={handleCreateAccount} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">E-mail de Acesso</label>
                                            <input 
                                                type="email" 
                                                required
                                                className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500"
                                                value={accountData.email}
                                                onChange={e => setAccountData({...accountData, email: e.target.value})}
                                                placeholder="exemplo@empresa.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Senha Temporária</label>
                                            <input 
                                                type="password" 
                                                required
                                                minLength="6"
                                                className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500"
                                                value={accountData.password}
                                                onChange={e => setAccountData({...accountData, password: e.target.value})}
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                        </div>
                                        <button 
                                            type="submit"
                                            disabled={creatingAccount}
                                            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/40 hover:bg-slate-800 transition transform active:scale-95"
                                        >
                                            {creatingAccount ? 'CRIANDO CONTA...' : 'CRIAR ACESSO AGORA'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ) : (
                            <div className="p-0 overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="px-8 py-4 w-1/2">Funcionalidade / Tela</th>
                                            <th className="px-4 py-4 text-center">Navegar</th>
                                            <th className="px-4 py-4 text-center">Criar</th>
                                            <th className="px-4 py-4 text-center">Editar</th>
                                            <th className="px-4 py-4 text-center">Excluir</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {modules.map(m => {
                                            const perms = userPermissions[m.id] || { view: false, create: false, update: false, delete: false };
                                            return (
                                                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{m.label}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">IDENTIFICADOR: {m.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-center">
                                                            <PermissionCheckbox moduleId={m.id} action="view" label="Visualizar" checked={perms.view} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-center">
                                                            <PermissionCheckbox moduleId={m.id} action="create" label="Cadastrar" checked={perms.create} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-center">
                                                            <PermissionCheckbox moduleId={m.id} action="update" label="Modificar" checked={perms.update} />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="flex justify-center">
                                                            <PermissionCheckbox moduleId={m.id} action="delete" label="Remover" checked={perms.delete} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="h-full flex-1 flex flex-col items-center justify-center text-slate-300 space-y-6 p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09m9.03.08a11.954 11.954 0 01-3.44 2.04m1.965-2.54a9 9 0 00-5.606-5.815m.823-1.57a4.82 4.82 0 013.903-3.81m-9.03 2.04a11.954 11.954 0 013.44-2.04M15 11c0-3.517 1.009-6.799 2.753-9.571m3.44 2.04l-.054.09m-9.03-.08a11.954 11.954 0 013.44-2.04m-1.965 2.54a9 9 0 005.606 5.815m-.823 1.57a4.82 4.82 0 01-3.903 3.81m9.03-2.04a11.954 11.954 0 01-3.44 2.04"/></svg>
                        </div>
                        <div>
                            <span className="font-black uppercase tracking-[0.2em] text-xs block mb-2">Aguardando Seleção</span>
                            <p className="max-w-xs text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Utilize o seletor acima para carregar a matriz de funcionalidades vinculada ao funcionário.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserPermissions;
