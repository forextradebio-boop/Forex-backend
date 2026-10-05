import yahooFinance from 'yahoo-finance2';
async function run() {
  const yf = new (yahooFinance as any)();
  const quote = await yf.quote('CL=F');
  console.log(quote.price);
}
run();
