import React from 'react';

const AccessDenied = ({ moduleName }) => {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center max-w-lg mx-auto space-y-8">
                {/* Ícone de escudo com cadeado */}
                <div className="relative inline-block">
                    <div className="w-28 h-28 bg-gradient-to-br from-rose-100 to-rose-200 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-rose-200/50 rotate-3">
                        <svg className="w-14 h-14 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </div>
                </div>

                {/* Texto */}
                <div className="space-y-3">
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                        Acesso Restrito
                    </h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.15em] leading-relaxed max-w-sm mx-auto">
                        Você não possui permissão para acessar 
                        {moduleName ? <span className="text-rose-500"> {moduleName}</span> : ' esta funcionalidade'}.
                        <br />
                        Solicite ao administrador a liberação do seu acesso.
                    </p>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a 
                        href="/dashboard"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-2xl shadow-slate-900/30 hover:bg-slate-800 transition transform active:scale-95"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                        </svg>
                        Voltar ao Painel
                    </a>
                </div>

                {/* Badge de segurança */}
                <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-4 py-2">
                    <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                    </svg>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proteção de módulo ativa</span>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;
