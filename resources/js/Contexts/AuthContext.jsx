import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);

    // Inicialização síncrona dos cabeçalhos globais do Axios
    const initialToken = localStorage.getItem('token');
    if (initialToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
    }
    const initialStoreId = localStorage.getItem('active_store_id');
    if (initialStoreId) {
        axios.defaults.headers.common['X-Store-Id'] = initialStoreId;
    }

    // Configura os headers globais do Axios em resposta a mudanças de estado (Authorization e X-Store-Id)
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }

        const activeStoreId = user?.active_store?.id || localStorage.getItem('active_store_id');
        if (activeStoreId) {
            axios.defaults.headers.common['X-Store-Id'] = activeStoreId;
        } else {
            delete axios.defaults.headers.common['X-Store-Id'];
        }
    }, [token, user]);

    // Se há token mas sem dados de user (sessão antiga pré-RBAC), busca do /me
    useEffect(() => {
        if (token && !user) {
            const activeStoreId = localStorage.getItem('active_store_id');
            const headers = activeStoreId ? { 'X-Store-Id': activeStoreId } : {};

            axios.get('/api/v1/auth/me', { headers })
                .then(res => {
                    const userData = res.data;
                    localStorage.setItem('user', JSON.stringify(userData));
                    if (userData.active_store?.id) {
                        localStorage.setItem('active_store_id', userData.active_store.id);
                    }
                    setUser(userData);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('active_store_id');
                    setToken(null);
                    window.location.href = '/';
                });
        }
    }, []);

    /**
     * Verifica se o usuário tem acesso a um módulo/ação.
     */
    const hasAccess = useCallback((moduleName, action = 'view') => {
        if (!user) return false;

        const perm = user.permissions?.find(p => p.module_name === moduleName);
        if (perm) {
            switch (action) {
                case 'view': return !!perm.can_view;
                case 'create': return !!perm.can_create;
                case 'update': return !!perm.can_update;
                case 'delete': return !!perm.can_delete;
                default: return false;
            }
        }

        return !!user.is_admin;
    }, [user]);

    /**
     * Faz login e armazena user + token + permissões + loja selecionada.
     */
    const login = useCallback(async (email, password, storeId = null) => {
        const res = await axios.post('/api/v1/auth/login', {
            user: email,
            password,
            store_id: storeId
        });

        const { access_token, user: userData } = res.data;

        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        if (userData.active_store?.id) {
            localStorage.setItem('active_store_id', userData.active_store.id);
            axios.defaults.headers.common['X-Store-Id'] = userData.active_store.id;
        }

        setToken(access_token);
        setUser(userData);

        return userData;
    }, []);

    /**
     * Alterna a loja ativa da sessão.
     */
    const switchStore = useCallback(async (storeId) => {
        try {
            const res = await axios.post('/api/v1/auth/switch-store', { store_id: storeId });
            const { active_store, user: updatedUser } = res.data;
            
            const newUserData = { ...user, ...updatedUser, active_store };
            localStorage.setItem('user', JSON.stringify(newUserData));
            localStorage.setItem('active_store_id', storeId);
            axios.defaults.headers.common['X-Store-Id'] = storeId;
            setUser(newUserData);
            
            // Recarrega a página para atualizar todas as requisições e telas com a nova loja
            window.location.reload();
        } catch (err) {
            console.error('Erro ao alternar loja:', err);
            alert('Não foi possível alternar de loja no momento: ' + (err.response?.data?.message || err.message));
            throw err;
        }
    }, [user]);

    /**
     * Faz logout e limpa estado.
     */
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('active_store_id');
        setToken(null);
        setUser(null);
        window.location.href = '/';
    }, []);

    /**
     * Atualiza permissões do usuário.
     */
    const refreshUser = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get('/api/v1/auth/me');
            const userData = res.data;
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        } catch {
            logout();
        }
    }, [token, logout]);

    const value = {
        token,
        user,
        activeStore: user?.active_store,
        allowedStores: user?.allowed_stores || [],
        loading,
        isAuthenticated: !!token,
        isAdmin: user?.is_admin || false,
        hasAccess,
        login,
        switchStore,
        logout,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
