import React, { useState } from 'react';
import { useAuth } from '../Contexts/AuthContext';

const NavItem = ({ href, icon, label, onClick }) => {
    const pathname = window.location.pathname;
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

    return (
        <a 
            href={href} 
            onClick={onClick}
            className={`flex items-center px-4 py-2 rounded-lg transition-all text-sm ${isActive ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20 font-bold' : 'hover:bg-slate-800 hover:text-white'}`}
        >
            <svg className="w-4 h-4 mr-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}/></svg>
            {label}
        </a>
    );
};

const Layout = ({ children, title }) => {
    const { user, isAdmin, hasAccess, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
    };

    // Definição dos itens do menu com módulo associado
    const menuSections = [
        {
            label: 'Comercial',
            items: [
                { href: '/budgets', label: 'Orçamentos', module: 'budgets', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { href: '/orders', label: 'Pedidos & Produção', module: 'orders', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h12l1 12H4L5 9z' },
            ]
        },
        {
            label: 'Cadastros',
            items: [
                { href: '/customers', label: 'Clientes', module: 'customers', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { href: '/suppliers', label: 'Fornecedores', module: 'suppliers', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
                { href: '/products', label: 'Produtos & Molduras', module: 'products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                { href: '/purchases', label: 'Entrada de Compras', module: 'purchases', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                { href: '/categories', label: 'Categorias', module: 'categories', icon: 'M7 7h.01M7 11h.01M7 15h.01M11 7h.01M11 11h.01M11 15h.01M15 7h.01M15 11h.01M15 15h.01' },
                { href: '/employees', label: 'Funcionários', module: 'employees', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            ]
        },
        {
            label: 'Financeiro',
            items: [
                { href: '/payments', label: 'Recebimentos', module: 'payments', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
                { href: '/daily-balances', label: 'Saldo Diário / Caixa', module: 'daily_balances', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { href: '/expenses', label: 'Despesas', module: 'expenses', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z' },
                { href: '/expense-types', label: 'Tipos de Despesa', module: 'expense_types', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { href: '/expense-subtypes', label: 'Subtipos de Despesa', module: 'expense_subtypes', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                { href: '/payment-methods', label: 'Formas de Pagamento', module: 'payment_methods', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
            ]
        },
        {
            label: 'Sistema',
            items: [
                { href: '/settings', label: 'Configurações Globais', module: 'settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
                { href: '/permissions', label: 'Controle de Acesso', module: 'permissions', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
            ]
        },
        {
            label: 'Gestão',
            items: [
                { href: '/inventory', label: 'Estoque', module: 'inventory', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { href: '/reports', label: 'Relatórios', module: 'reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            ]
        },
    ];

    // Gera as iniciais do nome do usuário
    const userInitials = user?.name
        ? user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
        : 'U';

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar Desktop */}
            <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col border-r border-slate-800 shrink-0 h-screen sticky top-0 overflow-y-auto">
                <div className="p-5 border-b border-slate-800 flex items-center justify-center">
                    <a href="/dashboard" className="block focus:outline-none">
                        <img src="/logo.png" alt="EASY FRAME Logo" className="h-11 max-w-full object-contain" />
                    </a>
                </div>
                
                <nav className="flex-1 px-4 space-y-1 mt-2">
                    <NavItem href="/dashboard" label="Painel" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    
                    {menuSections.map((section) => {
                        if (section.adminOnly && !isAdmin) return null;
                        const visibleItems = section.items.filter(item => hasAccess(item.module, 'view'));
                        if (visibleItems.length === 0) return null;

                        return (
                            <React.Fragment key={section.label}>
                                <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{section.label}</div>
                                {visibleItems.map(item => (
                                    <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
                                ))}
                            </React.Fragment>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-bold"
                    >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                        SAIR DO SISTEMA
                    </button>
                </div>
            </aside>

            {/* Mobile Drawer (Menu Responsivo Lateral) */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[200] flex md:hidden">
                    {/* Backdrop escuro */}
                    <div 
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Gaveta lateral */}
                    <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 text-slate-300 z-10 shadow-2xl animate-[slideRight_0.2s_ease-out]">
                        <div className="p-5 flex justify-between items-center border-b border-slate-800">
                            <a href="/dashboard" className="block focus:outline-none">
                                <img src="/logo.png" alt="EASY FRAME Logo" className="h-9 max-w-[170px] object-contain" />
                            </a>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                                aria-label="Fechar menu"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                            <NavItem 
                                href="/dashboard" 
                                label="Painel" 
                                icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                                onClick={() => setMobileMenuOpen(false)} 
                            />
                            
                            {menuSections.map((section) => {
                                if (section.adminOnly && !isAdmin) return null;
                                const visibleItems = section.items.filter(item => hasAccess(item.module, 'view'));
                                if (visibleItems.length === 0) return null;

                                return (
                                    <React.Fragment key={section.label}>
                                        <div className="pt-4 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{section.label}</div>
                                        {visibleItems.map(item => (
                                            <NavItem 
                                                key={item.href} 
                                                href={item.href} 
                                                label={item.label} 
                                                icon={item.icon} 
                                                onClick={() => setMobileMenuOpen(false)} 
                                            />
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </nav>

                        <div className="p-4 border-t border-slate-800">
                            <button 
                                onClick={handleLogout}
                                className="flex items-center w-full px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors font-bold"
                            >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                                SAIR DO SISTEMA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            aria-label="Alternar menu"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                        <h2 className="text-slate-800 font-black text-sm uppercase tracking-widest">{title}</h2>
                    </div>

                    <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-200">
                            {userInitials}
                        </div>
                        <div className="ml-3 hidden sm:block">
                            <span className="text-xs font-bold text-slate-600">{user?.name || 'Usuário'}</span>
                            {isAdmin && (
                                <span className="ml-2 text-[9px] font-black uppercase bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full tracking-widest">Admin</span>
                            )}
                        </div>
                    </div>
                </header>
                
                <main className="flex-1 overflow-y-auto p-3 md:p-5">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
