import yahooFinance from 'yahoo-finance2';

async function test() {
    try {
        console.log(typeof yahooFinance);
        if (typeof yahooFinance === 'function') {
            const yf = new (yahooFinance as any)();
            console.log(await yf.quote('AAPL'));
        } else {
            console.log(await (yahooFinance as any).quote('AAPL'));
        }
    } catch (e: any) {
        console.error('ERROR:', e.message);
    }
}
test();
