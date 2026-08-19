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

export const formatLongDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
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
