const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
yahooFinance.quote('CL=F').then(console.log).catch(console.error);
