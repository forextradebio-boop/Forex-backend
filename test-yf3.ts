import yahooFinance from 'yahoo-finance2';
console.log(typeof yahooFinance, typeof yahooFinance.quote, typeof (yahooFinance as any).default);
