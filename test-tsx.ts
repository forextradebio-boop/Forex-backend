import yahooFinance from 'yahoo-finance2';
console.log(typeof yahooFinance);
console.log(Object.keys(yahooFinance));
if (typeof yahooFinance.default === 'function') {
  console.log('yahooFinance.default is a function');
}
