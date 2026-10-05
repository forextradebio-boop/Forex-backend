const { default: yahooFinance } = require('yahoo-finance2');
async function test() {
    try {
        console.log(typeof yahooFinance);
        if (typeof yahooFinance === 'function') {
           const yf = new yahooFinance();
           console.log(await yf.quote('AAPL'));
        } else {
           console.log(await yahooFinance.quote('AAPL'));
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
test();
