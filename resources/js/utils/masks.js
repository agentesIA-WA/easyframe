export const maskCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .slice(0, 9);
};

export const maskCPF = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCNPJ = (value) => {
    // Novo CNPJ Alfanumérico: 
    // Aceita letras (A-Z) e números (0-9) nos primeiros 12 caracteres.
    // Os últimos 2 (DVs) permanecem numéricos.
    
    // Remove caracteres especiais, mas mantém letras e números
    const cleanValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    return cleanValue
        .replace(/^([A-Z0-9]{2})([A-Z0-9])/, '$1.$2')
        .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3')
        .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})([A-Z0-9])/, '$1.$2.$3/$4')
        .replace(/^([A-Z0-9]{2})\.([A-Z0-9]{3})\.([A-Z0-9]{3})\/([A-Z0-9]{4})([0-9])/, '$1.$2.$3/$4-$5')
        .slice(0, 18);
};

export const maskCPFCNPJ = (value) => {
    const raw = value.replace(/[^a-zA-Z0-9]/g, '');
    
    // Se contiver qualquer letra, tratamos como CNPJ Novo
    if (/[A-Z]/i.test(raw)) {
        return maskCNPJ(value);
    }
    
    // Se for apenas números, decidimos pelo tamanho
    if (raw.length <= 11) {
        return maskCPF(value);
    }
    return maskCNPJ(value);
};

export const unmask = (value) => {
    // Remove apenas a pontuação, mantendo letras e números
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

export const maskPhone = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})/, '$1-$2')
        .slice(0, 15);
};
