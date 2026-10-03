const yahooFinance = require('yahoo-finance2').default;

async function run() {
  try {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 5);

    const results = await yahooFinance.chart('BTC-USD', {
      period1: past,
      interval: '1m'
    });
    
    console.log(results.quotes.length + " quotes found.");
  } catch (err) {
    console.error(err);
  }
}

run();
