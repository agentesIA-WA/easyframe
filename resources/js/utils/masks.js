export const maskCEP = (value) => {
    if (!value) return '';
    return String(value)
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .slice(0, 9);
};

export const maskCPF = (value) => {
    if (!value) return '';
    return String(value)
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCNPJ = (value) => {
    if (!value) return '';
    // Novo CNPJ Alfanumérico: 
    // Aceita letras (A-Z) e números (0-9) nos primeiros 12 caracteres.
    // Os últimos 2 (DVs) permanecem numéricos.
    
    // Remove caracteres especiais, mas mantém letras e números
    const cleanValue = String(value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    return cleanValue
        .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
        .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
        .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3/$4')
        .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})\/([A-Z0-9]{4})([0-9])/, '$1.$2.$3/$4-$5')
        .slice(0, 18);
};

export const maskCPFCNPJ = (value) => {
    if (!value) return '';
    const raw = String(value).replace(/[^a-zA-Z0-9]/g, '');
    
    // Se contiver qualquer letra, tratamos como CNPJ Novo
    if (/[A-Z]/i.test(raw)) {
        return maskCNPJ(String(value));
    }
    
    // Se for apenas números, decidimos pelo tamanho
    if (raw.length <= 11) {
        return maskCPF(String(value));
    }
    return maskCNPJ(String(value));
};

export const unmask = (value) => {
    if (!value) return '';
    // Remove apenas a pontuação, mantendo letras e números
    return String(value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

export const maskPhone = (value) => {
    if (!value) return '';
    return String(value)
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})/, '$1-$2')
        .slice(0, 15);
};
