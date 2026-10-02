import axios from 'axios';

async function testMetal() {
  const apiKey = 'd68d9da35247b34486b805d429573f8b';
  const url = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=WTI,USOIL`;
  try {
    const res = await axios.get(url);
    console.log('MetalPriceAPI Response:', res.data);
  } catch (e) {
    console.error('MetalPriceAPI Error:', e.message);
  }
}

async function testVantage() {
  const apiKey = '0G9UCWEOADAMYNN2';
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=USD&apikey=${apiKey}`;
  try {
    const res = await axios.get(url);
    console.log('Vantage Response:', res.data);
  } catch (e) {
    console.error('Vantage Error:', e.message);
  }
}

testMetal();
testVantage();
