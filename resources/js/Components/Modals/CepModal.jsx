import React, { useState } from 'react';
import axios from 'axios';
import { maskCEP } from '../../utils/masks';

const CepModal = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!searchTerm || searchTerm.trim().length === 0) return;
        setLoading(true);
        setSearched(true);
        try {
            const digits = searchTerm.replace(/\D/g, '');
            const queryParam = digits.length === 8 
                ? `cep=${digits}` 
                : `description=${encodeURIComponent(searchTerm.trim())}`;
            
            const response = await axios.get(`/api/v1/support/cep/search?${queryParam}`);
            const data = response.data;
            setResults(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Busca de Endereço (SCR-008)</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        className="flex-1 border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="Digite o CEP (ex: 01001000) ou nome do logradouro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    <button 
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-blue-600 text-white px-5 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                    {loading ? (
                        <p className="text-center py-6 text-gray-500 font-bold">Buscando endereço...</p>
                    ) : results.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-xs uppercase text-gray-400 font-bold">
                                    <th className="py-2">CEP</th>
                                    <th>Logradouro</th>
                                    <th>Bairro</th>
                                    <th>Cidade/UF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((res, i) => (
                                    <tr 
                                        key={i} 
                                        className="hover:bg-blue-50 cursor-pointer border-b text-sm"
                                        onClick={() => { onSelect(res); onClose(); }}
                                    >
                                        <td className="py-2 font-mono font-bold text-blue-600">{maskCEP(res.cep)}</td>
                                        <td>{res.address || '-'}</td>
                                        <td>{res.neighborhood || '-'}</td>
                                        <td className="text-gray-500">{res.city}/{res.uf}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : searched ? (
                        <p className="text-center py-6 text-amber-600 font-bold text-sm">Nenhum endereço foi localizado com os termos informados.</p>
                    ) : (
                        <p className="text-center py-6 text-gray-400 text-sm">Digite o CEP ou nome do logradouro para realizar a busca.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CepModal;
