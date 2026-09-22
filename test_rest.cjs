const axios = require('axios');

async function test() {
    const apiKey = 'f0fa488f2f5b45968826c6394c09e3d3';
    const tdSymbol = 'EUR/USD';
    const url = `https://api.twelvedata.com/quote?symbol=${tdSymbol}&apikey=${apiKey}`;
    try {
        const response = await axios.get(url, { timeout: 8000 });
        console.log(response.data);
    } catch(e) {
        console.error(e.message);
    }
}
test();
