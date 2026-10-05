import axios from 'axios';

async function testOilPriceAPI() {
    const key = '8d42d0c711f7b75534e2683f1b36b888283e11b1e5e1eceb186451d28ba42b7d';
    try {
        const responseWti = await axios.get('https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD', {
            headers: { 'Authorization': `Token ${key}` }
        });
        console.log('WTI_USD:', responseWti.data);
    } catch (e: any) {
        console.log('WTI_USD Error:', e.response?.data || e.message);
    }
    
    try {
        const responseBrent = await axios.get('https://api.oilpriceapi.com/v1/prices/latest?by_code=BRENT_CRUDE_USD', {
            headers: { 'Authorization': `Token ${key}` }
        });
        console.log('BRENT_CRUDE_USD:', responseBrent.data);
    } catch (e: any) {
        console.log('BRENT_CRUDE_USD Error:', e.response?.data || e.message);
    }
}

testOilPriceAPI();
