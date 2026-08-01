import React, { useState, useEffect } from 'react';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        company_name: '',
        corporate_name: '',
        address: '',
        city: '',
        phone: '',
        fax: '',
        email: '',
        cnpj: '',
        cpf: '',
        cep: '',
        website: '',
        business_hours: '',
        enable_pagination: true,
        show_order_number: true,
        proposal_initiation: '',
        proposal_observations: '',
        bracket_1_start: 0, bracket_1_end: 0, bracket_1_commission: 0,
        bracket_2_start: 0, bracket_2_end: 0, bracket_2_commission: 0,
        bracket_3_start: 0, bracket_3_end: 0, bracket_3_commission: 0,
        bracket_4_start: 0, bracket_4_end: 0, bracket_4_commission: 0,
        bracket_5_start: 0, bracket_5_end: 0, bracket_5_commission: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/v1/core/settings')
            .then(res => res.json())
            .then(data => {
                if (data) setSettings(prev => ({ ...prev, ...data }));
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        try {
            const response = await fetch('/api/v1/core/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (response.ok) alert('Configurações salvas!');
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">
                    Informações da Empresa
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nome da Empresa</label>
                        <input 
                            type="text" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={settings.company_name} 
                            onChange={e => setSettings({...settings, company_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Razão Social</label>
                        <input 
                            type="text" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={settings.corporate_name}
                            onChange={e => setSettings({...settings, corporate_name: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Endereço</label>
                        <input 
                            type="text" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={settings.address}
                            onChange={e => setSettings({...settings, address: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cidade/UF</label>
                        <input 
                            type="text" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={settings.city}
                            onChange={e => setSettings({...settings, city: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">CEP</label>
                        <input 
                            type="text" 
                            className="w-full border-slate-200 rounded-lg text-sm" 
                            value={settings.cep}
                            onChange={e => setSettings({...settings, cep: e.target.value})}
                        />
                    </div>
                </div>

                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mt-10 mb-6 border-b border-slate-100 pb-4">
                    Propostas e Pedidos
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Iniciação da Proposta</label>
                        <textarea 
                            rows="4" 
                            className="w-full border-slate-200 rounded-lg text-sm"
                            value={settings.proposal_initiation}
                            onChange={e => setSettings({...settings, proposal_initiation: e.target.value})}
                        ></textarea>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Observações Padrão</label>
                        <textarea 
                            rows="4" 
                            className="w-full border-slate-200 rounded-lg text-sm"
                            value={settings.proposal_observations}
                            onChange={e => setSettings({...settings, proposal_observations: e.target.value})}
                        ></textarea>
                    </div>
                </div>

                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mt-10 mb-6 border-b border-slate-100 pb-4">
                    Faixas de Comissão (Vendas)
                </h3>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="grid grid-cols-3 gap-4 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">De (R$)</label>
                                <input 
                                    type="number" 
                                    className="w-full border-slate-200 rounded-lg text-sm" 
                                    value={settings[`bracket_${i}_start`]}
                                    onChange={e => setSettings({...settings, [`bracket_${i}_start`]: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Até (R$)</label>
                                <input 
                                    type="number" 
                                    className="w-full border-slate-200 rounded-lg text-sm" 
                                    value={settings[`bracket_${i}_end`]}
                                    onChange={e => setSettings({...settings, [`bracket_${i}_end`]: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Comissão (%)</label>
                                <input 
                                    type="number" 
                                    className="w-full border-slate-200 rounded-lg text-sm" 
                                    value={settings[`bracket_${i}_commission`]}
                                    onChange={e => setSettings({...settings, [`bracket_${i}_commission`]: e.target.value})}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 pt-6 border-t border-slate-100">
                    <button 
                        onClick={handleSave}
                        className="bg-primary-600 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-primary-700 transition-all"
                    >
                        Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
