import axios from 'axios';

async function testPlaceOrder() {
  try {
    // 1. Get token
    const loginRes = await axios.post('http://localhost:8000/api/auth/login', {
      username: 'testuser',
      password: 'password'
    });
    const token = loginRes.data.token;
    
    // 2. Place order
    const res = await axios.post('http://localhost:8000/api/trading/positions', {
      symbol: 'USDCAD',
      type: 'BUY',
      volume: 0.1,
      openPrice: 1.42,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testPlaceOrder();
