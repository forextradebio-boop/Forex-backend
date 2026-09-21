import yahooFinanceLib from 'yahoo-finance2';

async function test() {
  try {
    const yahooFinance = new (yahooFinanceLib as any)();
    const res = await yahooFinance.quote('AAPL');
    console.log(res.regularMarketPrice);
  } catch (e) {
    console.error(e.message);
  }
}
test();
