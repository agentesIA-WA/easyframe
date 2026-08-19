/**
 * Utilitários de formatação para a interface React.
 */

/**
 * Formata um valor numérico para Moeda (BRL).
 */
export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value || 0);
};

/**
 * Formata uma data para o padrão brasileiro (DD/MM/AAAA).
 */
export const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const [year, month, day] = date.trim().split('-');
        return `${day}/${month}/${year}`;
    }
    return new Date(date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

/**
 * Formata uma data e hora para o padrão brasileiro (DD/MM/AAAA HH:mm).
 */
export const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
};

/**
 * Formata uma data para o padrão longo (Ex: segunda-feira, 20 de maio de 2024).
 */
export const formatLongDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        const [year, month, day] = date.trim().split('-');
        const utcDate = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        return utcDate.toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            timeZone: 'UTC'
        });
    }
    return new Date(date).toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });
};

/**
 * Formata uma data e hora para o padrão longo com horário.
 */
export const formatLongDateTime = (date) => {
    if (!date) return '';
    const safeDate = typeof date === 'string' ? date.replace('Z', '') : date;
    const d = new Date(safeDate);
    const datePart = d.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });
    const timePart = d.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
    return `${datePart} às ${timePart}`;
};

/**
 * Formata um número decimal.
 */
export const formatDecimal = (value, decimals = 2) => {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value || 0);
};
