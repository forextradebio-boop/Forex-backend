import axios from 'axios';

async function testPlaceOrder() {
  try {
    const timestamp = Date.now();
    // 1. Register new user
    const regRes = await axios.post('http://localhost:8000/api/auth/register', {
      username: `tester${timestamp}`,
      password: 'password123',
      confirmPassword: 'password123'
    });
    
    const token = regRes.data.token;
    console.log("Registered. Token:", token);
    
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
    console.error("Error Status:", err.response?.status);
    console.error("Error Body:", err.response?.data);
  }
}

testPlaceOrder();
