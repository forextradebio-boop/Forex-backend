import YahooFinance from 'yahoo-finance2';

async function run() {
  const yahooFinance = new YahooFinance();
  yahooFinance.suppressNotices(['unsupportedEnv', 'yahooSurvey']);
  
  const now = new Date();
  const past = new Date();
  past.setDate(now.getDate() - 5);

  const results = await yahooFinance.chart('BTC-USD', {
    period1: past,
    interval: '1m'
  });
  
  console.log(results.quotes.length + " quotes found.");
}

run().catch(console.error);
