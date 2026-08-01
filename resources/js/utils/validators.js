export const isValidCPF = (cpf) => {
    if (!cpf) return false;
    const clean = String(cpf).replace(/\D/g, '');
    if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(clean.charAt(i), 10) * (10 - i);
    }
    let rev = (sum * 10) % 11;
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(9), 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(clean.charAt(i), 10) * (11 - i);
    }
    rev = (sum * 10) % 11;
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(clean.charAt(10), 10)) return false;

    return true;
};

export const isValidCNPJ = (cnpj) => {
    if (!cnpj) return false;
    const clean = String(cnpj).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length !== 14 || /^([a-zA-Z0-9])\1{13}$/.test(clean)) return false;

    // Os dois últimos caracteres (dígitos verificadores) devem ser obrigatoriamente numéricos (0-9)
    if (!/^\d{2}$/.test(clean.slice(12))) return false;

    const charVal = (ch) => {
        const code = ch.charCodeAt(0);
        return code - 48;
    };

    const b1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += charVal(clean[i]) * b1[i];
    }
    let rev = sum % 11;
    let dv1 = rev < 2 ? 0 : 11 - rev;
    if (dv1 !== parseInt(clean[12], 10)) return false;

    const b2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
        sum += charVal(clean[i]) * b2[i];
    }
    rev = sum % 11;
    let dv2 = rev < 2 ? 0 : 11 - rev;
    if (dv2 !== parseInt(clean[13], 10)) return false;

    return true;
};

export const isValidCPFCNPJ = (val) => {
    if (!val) return false;
    const clean = String(val).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length === 11) {
        return isValidCPF(clean);
    }
    if (clean.length === 14) {
        return isValidCNPJ(clean);
    }
    return false;
};

export const isValidEmail = (email) => {
    if (!email || String(email).trim() === '') return true; // Opcional, se em branco não invalida o formulário
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).trim());
};
