import React, { useState } from 'react';
import { maskCEP } from '../../utils/masks';

const CepModal = ({ isOpen, onClose, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/support/cep/search?description=${searchTerm}`);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Busca de Endereço (SCR-008)</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        className="flex-1 border rounded px-3 py-2" 
                        placeholder="Digite o nome da rua ou CEP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button 
                        onClick={handleSearch}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Buscar
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                    {loading ? <p>Carregando...</p> : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2">CEP</th>
                                    <th>Logradouro</th>
                                    <th>Bairro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((res, i) => (
                                    <tr 
                                        key={i} 
                                        className="hover:bg-blue-50 cursor-pointer border-b"
                                        onClick={() => { onSelect(res); onClose(); }}
                                    >
                                        <td className="py-2">{maskCEP(res.cep)}</td>
                                        <td>{res.address}</td>
                                        <td>{res.neighborhood}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CepModal;
