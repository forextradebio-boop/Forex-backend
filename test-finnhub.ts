import axios from 'axios';

async function test() {
  try {
    const symbol = 'OANDA:EUR_USD';
    const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=daoh0chr01qh3po2nns0daoh0chr01qh3po2nnsg`);
    console.log("REST Quote:", res.data);
  } catch (e) {
    console.error(e.message);
  }
}
test();
