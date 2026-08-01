import React, { useState, useEffect } from 'react';

const PaymentMethodsPage = () => {
    const [methods, setMethods] = useState([]);
    const [newMethod, setNewMethod] = useState({ description: '', commission_rate: 0 });

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = () => {
        fetch('/api/v1/core/payment-methods')
            .then(res => res.json())
            .then(data => setMethods(data));
    };

    const handleAdd = async () => {
        await fetch('/api/v1/core/payment-methods', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMethod)
        });
        setNewMethod({ description: '', commission_rate: 0 });
        fetchMethods();
    };

    const handleDelete = async (id) => {
        if (!confirm('Deseja excluir?')) return;
        await fetch(`/api/v1/core/payment-methods/${id}`, { method: 'DELETE' });
        fetchMethods();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
                    Nova Forma de Pagamento
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Descrição</label>
                        <input 
                            type="text" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={newMethod.description}
                            onChange={e => setNewMethod({...newMethod, description: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Comissão (%)</label>
                        <input 
                            type="number" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={newMethod.commission_rate}
                            onChange={e => setNewMethod({...newMethod, commission_rate: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="bg-slate-900 text-white h-[42px] px-6 rounded-lg font-bold text-xs uppercase tracking-widest"
                    >
                        Adicionar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Descrição</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">Comissão Base</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {methods.map(m => (
                            <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                <td className="px-6 py-4 text-sm font-bold text-slate-700">{m.description}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{m.commission_rate}%</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => handleDelete(m.id)}
                                        className="text-rose-500 font-bold text-xs uppercase hover:underline"
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentMethodsPage;
