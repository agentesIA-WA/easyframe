import './bootstrap';
import '../css/app.css';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import { NotificationProvider } from './Contexts/NotificationContext';
import { AuthProvider, useAuth } from './Contexts/AuthContext';
import Login from './Pages/Login';
import CustomerList from './Pages/Customer/CustomerList';
import CustomerForm from './Pages/Customer/CustomerForm';
import PaymentScreen from './Pages/Finance/PaymentScreen';
import ExpenseList from './Pages/Finance/ExpenseList';
import ReportScreen from './Pages/BI/ReportScreen';
import BudgetScreen from './Pages/Sales/BudgetScreen';
import BudgetList from './Pages/Sales/BudgetList';
import PrintOS from './Pages/Sales/PrintOS';
import SettingsPage from './Pages/Support/SettingsPage';
import PaymentMethodsPage from './Pages/Support/PaymentMethodsPage';
import ProductList from './Pages/Inventory/ProductList';
import SupplierList from './Pages/Customer/SupplierList';
import EmployeeList from './Pages/HR/EmployeeList';
import InventoryList from './Pages/Inventory/InventoryList';
import OrderList from './Pages/Sales/OrderList';
import PurchasesPage from './Pages/Customer/PurchasesPage';
import GlobalSettings from './Pages/Support/GlobalSettings';
import UserPermissions from './Pages/Identity/UserPermissions';
import PaymentMethods from './Pages/Finance/PaymentMethods';
import DailyBalancePage from './Pages/Finance/DailyBalancePage';
import ExpenseSubtypes from './Pages/Finance/ExpenseSubtypes';
import CrudPlaceholder from './Components/CrudPlaceholder';
import GenericCrud from './Components/GenericCrud';
import Layout from './Components/Layout';
import AccessDenied from './Components/AccessDenied';

/**
 * Componente wrapper que protege uma rota por permissão de módulo.
 */
const ProtectedRoute = ({ module, children, title }) => {
    const { hasAccess, isAdmin } = useAuth();

    if (!hasAccess(module, 'view')) {
        return (
            <Layout title="Acesso Restrito">
                <AccessDenied moduleName={title} />
            </Layout>
        );
    }

    return children;
};

const AppRoutes = () => {
    const { isAuthenticated, user, isAdmin, hasAccess } = useAuth();
    const [stats, setStats] = useState({ total_sales: 0, pending_orders: 0, growth: 0, ready_orders: 0 });
    const pathname = window.location.pathname;

    useEffect(() => {
        if (!isAuthenticated && pathname !== '/') {
            window.location.href = '/';
        }

        if (isAuthenticated && pathname === '/dashboard') {
            axios.get('/api/v1/bi/dashboard')
                .then(res => setStats(res.data))
                .catch(err => console.error(err));
        }
    }, [isAuthenticated, pathname]);

    if (!isAuthenticated) return <Login />;

    // Rotas de Negócio — Protegidas por módulo
    if (pathname === '/budgets') return <ProtectedRoute module="budgets" title="Orçamentos"><Layout title="Comercial > Orçamentos"><BudgetList /></Layout></ProtectedRoute>;
    if (pathname === '/budgets/new') return <ProtectedRoute module="budgets" title="Orçamentos"><Layout title="Comercial > Novo Orçamento"><BudgetScreen /></Layout></ProtectedRoute>;
    if (pathname.match(/^\/budgets\/\d+\/edit$/)) return <ProtectedRoute module="budgets" title="Orçamentos"><Layout title="Comercial > Editar Orçamento"><BudgetScreen /></Layout></ProtectedRoute>;
    if (pathname === '/customers') return <ProtectedRoute module="customers" title="Clientes"><Layout title="Cadastros > Clientes"><CustomerList /></Layout></ProtectedRoute>;
    if (pathname === '/payments') return <ProtectedRoute module="payments" title="Recebimentos"><Layout title="Financeiro > Recebimentos"><PaymentScreen /></Layout></ProtectedRoute>;
    if (pathname === '/expenses') return <ProtectedRoute module="expenses" title="Despesas"><Layout title="Financeiro > Despesas"><ExpenseList /></Layout></ProtectedRoute>;
    if (pathname === '/reports') return <ProtectedRoute module="reports" title="Relatórios"><Layout title="Gestão > Relatórios"><ReportScreen /></Layout></ProtectedRoute>;

    // Novas Rotas de Cadastro
    if (pathname === '/products') return <ProtectedRoute module="products" title="Produtos"><Layout title="Cadastros > Produtos"><ProductList /></Layout></ProtectedRoute>;
    if (pathname === '/suppliers') return <ProtectedRoute module="suppliers" title="Fornecedores"><Layout title="Cadastros > Fornecedores"><SupplierList /></Layout></ProtectedRoute>;
    if (pathname === '/purchases') return <ProtectedRoute module="purchases" title="Entrada de Compras"><Layout title="Cadastros > Entrada de Compras"><PurchasesPage /></Layout></ProtectedRoute>;
    if (pathname === '/categories') {
        const calcTypes = { 1: 'Absoluto (Unitário)', 2: 'Linear (Perímetro)', 3: 'M² (Metro Quadrado)' };
        return (
            <ProtectedRoute module="categories" title="Categorias">
                <Layout title="Cadastros > Categorias">
                    <GenericCrud
                        title="Categorias de Produto"
                        apiUrl="/api/v1/categories"
                        columns={[
                            { key: 'name', label: 'Nome', required: true },
                            { key: 'description', label: 'Descrição' },
                            {
                                key: 'calculation_type',
                                label: 'Tipo de Cálculo',
                                type: 'select',
                                required: true,
                                defaultValue: 1,
                                parseValue: (v) => parseInt(v),
                                options: [
                                    { value: 1, label: 'Absoluto (Unitário)' },
                                    { value: 2, label: 'Linear (Perímetro)' },
                                    { value: 3, label: 'M² (Metro Quadrado)' }
                                ],
                                render: (val) => {
                                    const labels = { 1: 'Absoluto', 2: 'Linear', 3: 'M²' };
                                    const colors = { 1: 'bg-slate-100 text-slate-600', 2: 'bg-blue-100 text-blue-700', 3: 'bg-emerald-100 text-emerald-700' };
                                    return (
                                        <span className={`${colors[val] || 'bg-slate-100 text-slate-600'} text-[10px] px-2 py-0.5 rounded font-black uppercase`}>
                                            {labels[val] || 'Outro'}
                                        </span>
                                    );
                                }
                            }
                        ]}
                    />
                </Layout>
            </ProtectedRoute>
        );
    }
    if (pathname === '/employees') return <ProtectedRoute module="employees" title="Funcionários"><Layout title="Cadastros > Funcionários"><EmployeeList /></Layout></ProtectedRoute>;

    // Rotas Financeiras e Sistema
    if (pathname === '/daily-balances') return <ProtectedRoute module="daily_balances" title="Saldo Diário"><Layout title="Financeiro > Saldo Diário / Caixa"><DailyBalancePage /></Layout></ProtectedRoute>;
    if (pathname === '/expense-subtypes') return <ProtectedRoute module="expense_subtypes" title="Subtipos de Despesa"><Layout title="Financeiro > Subtipos de Despesa"><ExpenseSubtypes /></Layout></ProtectedRoute>;
    if (pathname === '/payment-methods') return <ProtectedRoute module="payment_methods" title="Formas de Pagamento"><Layout title="Financeiro > Formas de Pagamento"><PaymentMethods /></Layout></ProtectedRoute>;

    // Rotas de Sistema — apenas Admin
    if (pathname === '/settings') return <ProtectedRoute module="settings" title="Configurações"><Layout title="Sistema > Configurações Globais"><GlobalSettings /></Layout></ProtectedRoute>;
    if (pathname === '/permissions') return <ProtectedRoute module="permissions" title="Controle de Acesso"><Layout title="Sistema > Controle de Acesso"><UserPermissions /></Layout></ProtectedRoute>;

    if (pathname === '/expense-types') return (
        <ProtectedRoute module="expense_types" title="Tipos de Despesa">
            <Layout title="Financeiro > Tipos de Despesa">
                <GenericCrud
                    title="Configuração de Despesas"
                    apiUrl="/api/v1/finance/expense-types"
                    columns={[
                        { key: 'name', label: 'Nome do Tipo', required: true },
                        { key: 'description', label: 'Descrição' }
                    ]}
                />
            </Layout>
        </ProtectedRoute>
    );
    if (pathname === '/inventory') return <ProtectedRoute module="inventory" title="Estoque"><Layout title="Gestão > Estoque"><InventoryList /></Layout></ProtectedRoute>;
    if (pathname === '/orders') return <ProtectedRoute module="orders" title="Pedidos"><Layout title="Comercial > Pedidos"><OrderList /></Layout></ProtectedRoute>;
    if (pathname.startsWith('/orders/') && pathname.endsWith('/print')) return <PrintOS />;

    return (
        <Layout title="Dashboard Geral">
            <div className="max-w-6xl">
                <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl p-8 text-white shadow-2xl shadow-primary-500/20 mb-10">
                    <h1 className="text-3xl font-black mb-2 text-white">Bem-vindo, {user?.name || 'Usuário'}.</h1>
                    <p className="opacity-90 font-medium">Uma plataforma de gestão de molduraria à sua  disposição!</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Vendas Totais', val: `R$ ${parseFloat(stats.total_sales).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'blue', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', reportType: 'daily-movement' },
                        { label: 'Pedidos em Produção', val: `${stats.pending_orders} unidades`, color: 'amber', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', reportType: 'delivery-forecast' },
                        { label: 'Prontos p/ Entrega', val: `${stats.ready_orders} unidades`, color: 'emerald', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', reportType: 'delivery-forecast' },
                    ].map((stat, i) => (
                        <a 
                            key={i} 
                            href={`/reports?type=${stat.reportType}`}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-primary-400 hover:-translate-y-1 transition-all group block cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} /></svg>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-primary-600 flex items-center gap-1 transition-colors">
                                    Ver Relatório
                                    <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                            <p className="text-slate-900 text-2xl font-black mt-1">{stat.val}</p>
                        </a>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

const container = document.getElementById('app');
const root = createRoot(container);
root.render(
    <NotificationProvider>
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    </NotificationProvider>
);
