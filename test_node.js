const axios = require('axios');
(async () => {
    try {
        const res = await axios.put('http://localhost:8000/api/v1/core/stores/1', {
            name: 'LOJA 1',
            company_name: 'LOJA 1',
            is_wholesale: true
        });
        console.log(res.data);
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
})();
