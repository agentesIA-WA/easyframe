import React, { useState } from 'react';
import { useAuth } from '../Contexts/AuthContext';

const Login = () => {
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(user, password);
            window.location.href = '/dashboard';
        } catch (err) {
            setError(err.response?.data?.message || 'Credenciais inválidas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 font-sans antialiased relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-8 -right-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

            <div className="max-w-md w-full space-y-8 p-10 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl z-10">
                <div className="text-center flex flex-col items-center">
                    <img src="/logo.png" alt="EASY FRAME Logo" className="h-16 max-w-full object-contain mb-3 filter drop-shadow-lg" />
                    <p className="mt-1 text-slate-400 font-medium text-sm">Acesse o painel de molduraria</p>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1.5 ml-1">E-mail</label>
                            <input
                                type="text"
                                required
                                className="block w-full px-4 py-3 bg-slate-800/50 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-slate-500"
                                placeholder="nome@exemplo.com"
                                value={user}
                                onChange={(e) => setUser(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-1.5 ml-1">Senha</label>
                            <input
                                type="password"
                                required
                                className="block w-full px-4 py-3 bg-slate-800/50 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-slate-500"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center animate-shake">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-black rounded-xl text-white bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all shadow-xl shadow-primary-600/20 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : 'ENTRAR NO SISTEMA'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tecnologia Reversa &copy; 2026</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
