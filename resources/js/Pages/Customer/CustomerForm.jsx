import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CepModal from '../../Components/Modals/CepModal';
import { maskCEP, maskCPFCNPJ, maskPhone, unmask } from '../../utils/masks';
import { useNotification } from '../../Contexts/NotificationContext';

const CustomerForm = ({ customer = null, onSaved = null, onCancel = null, embedded = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        tax_id: '',
        email: '',
        phone: '',
        cep: '',
        uf: '',
        city: '',
        address: '',
        notes: '',
    });
    const [isCepModalOpen, setIsCepModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { notify } = useNotification();

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                tax_id: maskCPFCNPJ(customer.tax_id || ''),
                email: customer.email || '',
                phone: maskPhone(customer.phone || ''),
                cep: maskCEP(customer.cep || ''),
                uf: customer.uf || '',
                city: customer.city || '',
                address: customer.address || '',
                notes: customer.notes || '',
            });
        }
    }, [customer]);

    const handleCepSelect = (cepData) => {
        setFormData(prev => ({
            ...prev,
            cep: maskCEP(cepData.cep),
            uf: cepData.uf || prev.uf,
            city: cepData.city || prev.city,
            address: cepData.address || prev.address
        }));
    };

    const handleDirectCepSearch = async () => {
        const cleanCep = unmask(formData.cep);
        if (cleanCep.length === 8) {
            try {
                setLoading(true);
                const response = await axios.get(`/api/v1/support/cep/search?cep=${cleanCep}`);
                const data = response.data;
                if (Array.isArray(data) && data.length > 0) {
                    handleCepSelect(data[0]);
                    notify('success', 'Endereço localizado com sucesso!');
                    return;
                } else {
                    notify('warning', 'CEP não encontrado. Abrindo busca manual...');
                }
            } catch (error) {
                console.error('Erro na busca de CEP:', error);
            } finally {
                setLoading(false);
            }
        }
        setIsCepModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const dataToSave = {
            ...formData,
            tax_id: unmask(formData.tax_id),
            phone: unmask(formData.phone),
            cep: unmask(formData.cep)
        };

        try {
            let savedCustomer;
            if (customer) {
                const response = await axios.put(`/api/v1/customers/${customer.id}`, dataToSave);
                savedCustomer = response.data;
                notify('success', 'Cadastro do cliente atualizado com sucesso.');
            } else {
                const response = await axios.post('/api/v1/customers', dataToSave);
                savedCustomer = response.data;
                notify('success', 'Novo cliente cadastrado com sucesso no sistema.');
            }
            
            if (onSaved) {
                onSaved(savedCustomer);
            } else if (!customer) {
                setFormData({ name: '', tax_id: '', email: '', phone: '', cep: '', uf: '', city: '', address: '', notes: '' });
            }
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            const msg = error.response?.status === 409 
                ? 'Este CPF/CNPJ já está vinculado a outro cliente.' 
                : 'Não foi possível salvar os dados. Verifique sua conexão ou as tabelas do sistema.';
            notify('error', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={embedded ? "p-6" : "p-8 max-w-4xl mx-auto"}>
            {!embedded && (
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Cadastro de Cliente (SCR-003)</h1>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`${!embedded ? 'bg-white shadow-xl rounded-xl border border-gray-100' : ''} px-8 pt-8 pb-8 mb-4`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">Nome Completo</label>
                        <input 
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">CPF/CNPJ</label>
                        <input 
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
                            type="text"
                            value={formData.tax_id}
                            onChange={(e) => setFormData({...formData, tax_id: maskCPFCNPJ(e.target.value)})}
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">E-mail de Contato</label>
                        <input 
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
                            type="email"
                            placeholder="email@exemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">Telefone de Contato</label>
                        <input 
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
                            type="text"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: maskPhone(e.target.value)})}
                        />
                    </div>
                </div>

                <div className="mt-6">
                    <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">Observação</label>
                    <textarea 
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[48px]"
                        rows="2"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="md:col-span-2">
                            <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">CEP</label>
                            <div className="flex gap-3">
                                <input 
                                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    type="text"
                                    value={formData.cep}
                                    onChange={(e) => setFormData({...formData, cep: maskCEP(e.target.value)})}
                                />
                                <button type="button" onClick={handleDirectCepSearch} className="bg-blue-50 text-blue-600 px-6 py-3 rounded-lg font-bold hover:bg-blue-100 transition">Buscar</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">UF</label>
                            <input className="w-full px-4 py-3 rounded-lg border border-gray-300" type="text" value={formData.uf} maxLength="2" onChange={(e) => setFormData({...formData, uf: e.target.value.toUpperCase()})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">Cidade</label>
                            <input className="w-full px-4 py-3 rounded-lg border border-gray-300" type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-gray-600 text-sm font-semibold mb-2 uppercase tracking-wider">Logradouro</label>
                            <input className="w-full px-4 py-3 rounded-lg border border-gray-300" type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end mt-10 gap-4">
                    {onCancel && (
                        <button type="button" onClick={onCancel} className="px-8 py-4 border border-gray-200 text-gray-600 rounded-xl font-bold">Cancelar</button>
                    )}
                    <button 
                        disabled={loading}
                        className={`${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-4 px-10 rounded-xl shadow-lg transition-all`} 
                        type="submit"
                    >
                        {loading ? 'Processando...' : 'Salvar Cliente'}
                    </button>
                </div>
            </form>

            <CepModal isOpen={isCepModalOpen} onClose={() => setIsCepModalOpen(false)} onSelect={handleCepSelect} />
        </div>
    );
};

export default CustomerForm;
