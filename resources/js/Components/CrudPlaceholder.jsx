import React from 'react';

const CrudPlaceholder = ({ title }) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                + Novo Registro
            </button>
        </div>
        <div className="p-12 text-center text-slate-400 italic">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" strokeWidth="2" strokeLinecap="round"/></svg>
            Listagem de {title.toLowerCase()} em implementação...
        </div>
    </div>
);

export default CrudPlaceholder;
