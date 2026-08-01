import React from 'react';

const ViewModal = ({ isOpen, onClose, title, data, ignoredFields = [], fields = null }) => {
    if (!isOpen || !data) return null;

    // Campos que não fazem sentido exibir numa visualização genérica
    const defaultIgnored = ['id', 'created_at', 'updated_at', 'deleted_at', 'password', 'remember_token', 'company_id'];
    const fieldsToIgnore = new Set([...defaultIgnored, ...ignoredFields]);

    const formatKey = (key) => {
        if (!key) return '';
        const ptTranslations = {
            name: 'Nome / Descrição',
            code: 'Código',
            email: 'E-mail',
            description: 'Descrição',
            unit_price: 'Preço Unitário',
            unit_cost: 'Custo Unitário',
            price: 'Preço',
            cost: 'Custo',
            stock_balance: 'Saldo em Estoque',
            category_id: 'Categoria',
            category: 'Categoria',
            supplier_id: 'Fornecedor',
            supplier: 'Fornecedor',
            customer_id: 'Cliente',
            customer: 'Cliente',
            purchase_date: 'Data da Compra',
            invoice_number: 'Nota Fiscal / Documento',
            total_value: 'Valor Total',
            total_amount: 'Valor Total',
            discount: 'Desconto',
            seller: 'Vendedor',
            seller_id: 'Vendedor',
            framer: 'Moldurista',
            framer_id: 'Moldurista',
            delivery_date: 'Previsão de Entrega',
            delivered_at: 'Data da Entrega Realizada',
            delivery_observation: 'Observação da Entrega',
            items: 'Itens / Composição',
            sub_items: 'Materiais / Insumos',
            payments: 'Pagamentos / Parcelas',
            payment_method_id: 'Forma de Pagamento',
            tax_id: 'CPF / CNPJ',
            document: 'Documento / CPF / CNPJ',
            company_name: 'Razão Social',
            company_social_name: 'Nome Fantasia',
            width: 'Largura (cm)',
            height: 'Altura (cm)',
            thickness: 'Espessura (cm)',
            calculation_type: 'Tipo de Cálculo',
            phone: 'Telefone',
            address: 'Endereço',
            city: 'Cidade',
            state: 'Estado / UF',
            uf: 'UF',
            status: 'Situação / Status',
            notes: 'Observações',
            observation: 'Observações',
            role: 'Função / Cargo',
            is_admin: 'Privilégio Administrativo',
            quantity: 'Quantidade',
            date: 'Data'
        };
        if (ptTranslations[key]) return ptTranslations[key];

        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatValue = (value) => {
        if (value === null || value === undefined || value === '') return <span className="text-slate-300 italic">Não informado</span>;
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (React.isValidElement(value)) return value;
        if (typeof value === 'object') {
            if (Array.isArray(value)) return `[ ${value.length} itens ]`;
            // Se for um objeto com id e nome (como uma relação)
            if (value.name || value.description) return value.name || value.description;
            return JSON.stringify(value);
        }
        return value.toString();
    };

    const displayEntries = fields 
        ? fields.map(f => {
            const formatter = f.format || f.render;
            return [f.label || formatKey(f.key), formatter ? formatter(data[f.key], data) : data[f.key]];
        })
        : Object.entries(data).filter(([key]) => !fieldsToIgnore.has(key)).map(([k, v]) => [formatKey(k), v]);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                <div className="bg-slate-800 text-white px-5 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <h2 className="text-sm font-black uppercase tracking-widest">Visualizar: {title}</h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition text-lg font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <dl className="divide-y divide-slate-100">
                            {displayEntries.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 italic text-sm">Nenhum dado disponível.</div>
                            ) : (
                                displayEntries.map(([label, value], idx) => (
                                    <div key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-slate-50 transition-colors`}>
                                        <dt className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center">
                                            {label}
                                        </dt>
                                        <dd className="md:col-span-2 text-sm font-bold text-slate-800 break-words">
                                            {formatValue(value)}
                                        </dd>
                                    </div>
                                ))
                            )}
                        </dl>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex justify-end bg-white shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs uppercase hover:bg-slate-700 shadow-md transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ViewModal;
