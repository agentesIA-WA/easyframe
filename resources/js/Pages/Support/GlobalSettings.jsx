import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotification } from '../../Contexts/NotificationContext';

const GlobalSettings = () => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { notify } = useNotification();

    useEffect(() => {
        axios.get('/api/v1/core/settings')
            .then(res => {
                setSettings(res.data);
                setLoading(false);
            })
            .catch(() => notify('error', 'Falha ao carregar configurações.'));
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post('/api/v1/core/settings', settings);
            notify('success', 'Configurações globais atualizadas com sucesso.');
        } catch (error) {
            notify('error', 'Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-400 animate-pulse font-black uppercase tracking-widest italic">Carregando parâmetros do sistema...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Configurações do Sistema</h1>
                <p className="text-slate-400 text-xs font-bold tracking-[0.3em] uppercase italic">Parâmetros Globais e Regras de Negócio Legadas</p>
            </div>
            
            <form onSubmit={handleSave} className="space-y-8">
                {/* Identidade Corporativa */}
                <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                        <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Identidade Corporativa</h3>
                        <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Nome Fantasia da Empresa</label>
                            <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.company_name || ''} onChange={e => setSettings({...settings, company_name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Razão Social</label>
                            <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500 font-mono text-sm" value={settings.company_social_name || ''} onChange={e => setSettings({...settings, company_social_name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">CNPJ / CPF</label>
                            <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500 font-mono text-sm" value={settings.cnpj || ''} onChange={e => setSettings({...settings, cnpj: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Endereço Completo</label>
                            <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.address || ''} onChange={e => setSettings({...settings, address: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Cidade/UF</label>
                                <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.city || ''} onChange={e => setSettings({...settings, city: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">CEP</label>
                                <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.cep || ''} onChange={e => setSettings({...settings, cep: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Fone Comercial</label>
                                <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.phone || ''} onChange={e => setSettings({...settings, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">E-mail de Contato</label>
                                <input type="email" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.email || ''} onChange={e => setSettings({...settings, email: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Horário de Funcionamento</label>
                            <input type="text" className="w-full border-slate-200 rounded-xl font-bold focus:ring-primary-500 focus:border-primary-500" value={settings.opening_hours || ''} onChange={e => setSettings({...settings, opening_hours: e.target.value})} />
                        </div>
                    </div>
                </section>

                {/* Parâmetros de Pedidos */}
                <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="bg-slate-900 px-8 py-4">
                        <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Parâmetros de Operação (Pedidos)</h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div>
                                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Paginação de Listas</span>
                                <span className="text-xs text-slate-500 font-bold italic">Ativar navegação por páginas</span>
                            </div>
                            <select className="border-slate-200 rounded-lg font-bold text-sm" value={settings.use_pagination ? 1 : 0} onChange={e => setSettings({...settings, use_pagination: !!parseInt(e.target.value)})}>
                                <option value="0">DESATIVADO</option>
                                <option value="1">ATIVADO</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <div>
                                <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Exibir Nº do Pedido</span>
                                <span className="text-xs text-slate-500 font-bold italic">Mostrar ID nas listagens públicas</span>
                            </div>
                            <select className="border-slate-200 rounded-lg font-bold text-sm" value={settings.show_order_number ? 1 : 0} onChange={e => setSettings({...settings, show_order_number: !!parseInt(e.target.value)})}>
                                <option value="0">OCULTAR</option>
                                <option value="1">MOSTRAR</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Texto de Iniciação da Proposta</label>
                                <textarea rows="4" className="w-full border-slate-200 rounded-xl font-bold text-sm focus:ring-primary-500" value={settings.proposal_header || ''} onChange={e => setSettings({...settings, proposal_header: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Observações Padrão das Propostas</label>
                                <textarea rows="4" className="w-full border-slate-200 rounded-xl font-bold text-sm focus:ring-primary-500" value={settings.proposal_footer || ''} onChange={e => setSettings({...settings, proposal_footer: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Regras de Comissão */}
                <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="bg-slate-900 px-8 py-4">
                        <h3 className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Faixas de Comissão (Regra Legada)</h3>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-3 gap-8 mb-4 px-4">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">De (R$)</span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Até (R$)</span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Comissão (%)</span>
                        </div>
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="grid grid-cols-3 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-center">
                                    <input type="number" step="0.01" className="w-full border-slate-200 rounded-xl text-sm font-mono font-bold" value={settings[`bracket_${i}_start`] || 0} onChange={e => setSettings({...settings, [`bracket_${i}_start`]: parseFloat(e.target.value)})} />
                                    <input type="number" step="0.01" className="w-full border-slate-200 rounded-xl text-sm font-mono font-bold" value={settings[`bracket_${i}_end`] || 0} onChange={e => setSettings({...settings, [`bracket_${i}_end`]: parseFloat(e.target.value)})} />
                                    <input type="number" step="0.01" className="w-full border-primary-100 rounded-xl text-sm font-black text-primary-600 font-mono bg-white" value={settings[`bracket_${i}_commission`] || 0} onChange={e => setSettings({...settings, [`bracket_${i}_commission`]: parseFloat(e.target.value)})} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="flex justify-center pt-8">
                    <button 
                        type="submit" 
                        disabled={saving}
                        className={`bg-primary-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-primary-900/40 transition transform active:scale-95 ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-700 hover:-translate-y-1'}`}
                    >
                        {saving ? 'Aplicando Parâmetros...' : 'GRAVAR E SINCRONIZAR SISTEMA'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default GlobalSettings;
