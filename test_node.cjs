const axios = require('axios');
(async () => {
    try {
        const res = await axios.put('http://127.0.0.1:8000/api/v1/core/stores/1', {
            name: 'LOJA 1',
            company_name: 'LOJA 1',
            is_wholesale: true
        });
        console.log("Success:", res.data.is_wholesale);
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
})();
