/**
 * Utilitário para formatação e envio de Orçamentos/Pedidos via WhatsApp.
 * Inclui detalhamento dos itens e link direto para o PDF / Ordem de Serviço.
 */
export const sendWhatsApp = (item) => {
    if (!item) return;

    const customer = item.customer || {};
    const rawPhone = customer.mobile_phone || customer.phone || customer.phone_number || customer.celular || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    const isOrder = item.status && item.status !== 'draft';
    const typeLabel = isOrder ? 'Pedido' : 'Orçamento';
    const idLabel = item.id ? `#${item.id}` : '';

    let itemsText = '';
    if (Array.isArray(item.items) && item.items.length > 0) {
        itemsText = item.items.map(it => {
            const dims = (it.height && it.width) ? ` (${it.height}x${it.width}cm)` : '';
            const qty = it.quantity > 1 ? ` [${it.quantity}x]` : '';
            return `• ${it.description || 'Item'}${dims}${qty}`;
        }).join('\n');
    }

    const totalVal = parseFloat(item.total_value || item.totalValue || 0);
    const valFormatted = totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let message = `Olá, *${customer.name || 'Cliente'}*! 👋\n\n` +
        `Segue o resumo do seu *${typeLabel} ${idLabel}*:\n\n`;

    if (itemsText) {
        message += `*Itens:*\n${itemsText}\n\n`;
    }

    message += `*Valor Total:* R$ ${valFormatted}\n\n`;

    const accessKey = item.uuid || item.id;
    if (accessKey) {
        const baseUrl = window.location.origin;
        const printUrl = `${baseUrl}/orders/${accessKey}/print`;
        message += `📄 *Visualize o Documento em PDF completo:*\n\n${printUrl}\n\n`;
    }

    message += `Qualquer dúvida, estamos à disposição! 🖼️✨`;

    const encodedText = encodeURIComponent(message);

    let url = '';
    if (cleanPhone) {
        const phoneWithCountry = (cleanPhone.length >= 10 && !cleanPhone.startsWith('55'))
            ? `55${cleanPhone}`
            : cleanPhone;
        url = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodedText}`;
    } else {
        url = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    window.open(url, '_blank');
};
