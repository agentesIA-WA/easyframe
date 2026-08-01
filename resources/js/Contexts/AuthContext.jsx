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

    // Configura o header de autorização
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Se há token mas sem dados de user (sessão antiga pré-RBAC), busca do /me
    useEffect(() => {
        if (token && !user) {
            axios.get('/api/v1/auth/me')
                .then(res => {
                    const userData = res.data;
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                })
                .catch(() => {
                    // Token inválido/expirado — força logout
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setToken(null);
                    window.location.href = '/';
                });
        }
    }, []);

    /**
     * Verifica se o usuário tem acesso a um módulo/ação.
     * Admins sempre retornam true.
     */
    const hasAccess = useCallback((moduleName, action = 'view') => {
        if (!user) return false;
        if (user.is_admin) return true;

        const perm = user.permissions?.find(p => p.module_name === moduleName);
        if (!perm) return false;

        switch (action) {
            case 'view': return perm.can_view;
            case 'create': return perm.can_create;
            case 'update': return perm.can_update;
            case 'delete': return perm.can_delete;
            default: return false;
        }
    }, [user]);

    /**
     * Faz login e armazena user + token + permissões.
     */
    const login = useCallback(async (email, password) => {
        const res = await axios.post('/api/v1/auth/login', {
            user: email,
            password
        });

        const { access_token, user: userData } = res.data;

        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);

        return userData;
    }, []);

    /**
     * Faz logout e limpa estado.
     */
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        window.location.href = '/';
    }, []);

    /**
     * Atualiza permissões do usuário (chamado após sync de permissões do próprio user).
     */
    const refreshUser = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get('/api/v1/auth/me');
            const userData = res.data;
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        } catch {
            // Token expirado
            logout();
        }
    }, [token, logout]);

    const value = {
        token,
        user,
        loading,
        isAuthenticated: !!token,
        isAdmin: user?.is_admin || false,
        hasAccess,
        login,
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
