import axios from 'axios';
import yahooFinanceLib from 'yahoo-finance2';

async function testAll() {
  const symbol = 'XAUUSD';
  
  // Test YAHOO
  try {
    const res = await yahooFinanceLib.quote('GC=F');
    console.log('YAHOO GC=F price:', res.regularMarketPrice);
  } catch(e) { console.error('YAHOO Error'); }
  
  // Test Finnhub
  try {
    const fh = 'OANDA:XAU_USD';
    const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${fh}&token=daok5e1r01qikc7t359gdaok5e1r01qikc7t35a0`);
    console.log('FINNHUB OANDA:XAU_USD price:', res.data.c);
  } catch(e) { console.error('FINNHUB Error'); }

  // Test INFOWAY (If we had key, but we don't, but let's test)
  
}
testAll();
