const yahooFinance = require('yahoo-finance2').default;
yahooFinance.quote('CL=F').then(console.log).catch(console.error);
