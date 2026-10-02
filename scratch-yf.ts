import yahooFinance from 'yahoo-finance2';
async function run() {
    try {
        const result = await yahooFinance.quote('CL=F');
        console.log(result);
    } catch (e) {
        console.error(e);
    }
}
run();
