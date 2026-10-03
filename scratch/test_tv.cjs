const axios = require('axios');

async function run() {
  try {
    const res = await axios.get('https://tradingview-api1.p.rapidapi.com/market/get-charts?symbol=BINANCE:BTCUSD&interval=1d', {
      headers: {
        'x-rapidapi-host': 'tradingview-api1.p.rapidapi.com',
        'x-rapidapi-key': 'a6df3265bfmsh3aa3cf83a70355bp1e512cjsn053f5afeced9'
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}

run();
