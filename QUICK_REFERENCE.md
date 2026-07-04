# Quick Reference Guide

## API Endpoints Quick Reference

### Authentication
```bash
# Register
POST /api/auth/register
{ "username": "john", "password": "pass123" }

# Login
POST /api/auth/login
{ "username": "john", "password": "pass123" }

# Get Profile
GET /api/auth/me
[Authorization: Bearer TOKEN]
```

### Wallet
```bash
# Get Wallet
GET /api/wallet
[Authorization: Bearer TOKEN]

# Update Wallet
PUT /api/wallet
[Authorization: Bearer TOKEN]
{ "balance": 15000 }
```

### Trading
```bash
# Create Order
POST /api/trading/orders
[Authorization: Bearer TOKEN]
{
  "symbol": "EURUSD",
  "type": "BUY",
  "volume": 1.0,
  "price": 1.0850,
  "stopLoss": 1.0800,
  "takeProfit": 1.0900
}

# Get Orders
GET /api/trading/orders?status=OPEN
[Authorization: Bearer TOKEN]

# Close Order
POST /api/trading/orders/{orderId}/close
[Authorization: Bearer TOKEN]
{ "closePrice": 1.0900 }
```

### Market Data
```bash
# Get Tickers
GET /api/market/tickers?symbols=EURUSD,GBPUSD

# Get Price History
GET /api/market/history/EURUSD?timeframe=H1&limit=100
```

### News
```bash
# Get News
GET /api/news?limit=20
```

### Economic Calendar
```bash
# Get Events
GET /api/economic-calendar?country=US&importance=HIGH
```

### Deposits
```bash
# Create Deposit
POST /api/deposits
[Authorization: Bearer TOKEN]
{ "amount": 1000, "paymentMethod": "credit_card", "currency": "USD" }

# Get Deposits
GET /api/deposits
[Authorization: Bearer TOKEN]
```

### Withdrawals
```bash
# Create Withdrawal
POST /api/withdrawals
[Authorization: Bearer TOKEN]
{ "amount": 500, "bankAccount": "1234567890", "currency": "USD" }

# Get Withdrawals
GET /api/withdrawals
[Authorization: Bearer TOKEN]
```

### KYC
```bash
# Get KYC Status
GET /api/kyc
[Authorization: Bearer TOKEN]

# Submit Documents
POST /api/kyc/submit
[Authorization: Bearer TOKEN]
[Content-Type: multipart/form-data]
file: [binary], documentType: ID
```

### Watchlist
```bash
# Create Watchlist
POST /api/watchlist
[Authorization: Bearer TOKEN]
{ "name": "My Pairs", "symbols": ["EURUSD", "GBPUSD"] }

# Get Watchlists
GET /api/watchlist
[Authorization: Bearer TOKEN]
```

### Alerts
```bash
# Create Alert
POST /api/alerts
[Authorization: Bearer TOKEN]
{ "symbol": "EURUSD", "type": "PRICE_ABOVE", "value": 1.1000 }

# Get Alerts
GET /api/alerts
[Authorization: Bearer TOKEN]
```

### Copy Trading
```bash
# Get Traders
GET /api/copy-trading/traders?sort=performance&limit=20

# Follow Trader
POST /api/copy-trading/follow/{traderId}
[Authorization: Bearer TOKEN]
{ "copyVolume": 1.0, "riskPercent": 2 }
```

### Profile
```bash
# Update Profile
PUT /api/profile
[Authorization: Bearer TOKEN]
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

---

## Common Frontend Patterns

### Store Auth Data
```typescript
// After login/register
localStorage.setItem('token', response.token);
localStorage.setItem('refreshToken', response.refreshToken);
localStorage.setItem('profile', JSON.stringify(response.profile));
```

### Send Authenticated Request
```typescript
const headers = {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
};
```

### Handle Errors
```typescript
try {
  const res = await api.post('/endpoint', data);
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired - logout
    localStorage.clear();
    window.location.href = '/login';
  }
}
```

### Setup Axios Instance
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/forex-factory
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
```

---

## Status Codes

- **200** - OK
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **500** - Server Error

---

## Key Features

✅ **No OTP** - Direct login with username/password
✅ **JWT Auth** - Token-based authentication
✅ **Live Trading** - Real-time order execution
✅ **Market Data** - Live price updates
✅ **News Feed** - Market news and analysis
✅ **Economic Calendar** - Economic events
✅ **Copy Trading** - Follow other traders
✅ **KYC Verification** - User verification process
✅ **Wallet Management** - Deposits and withdrawals

---

## Troubleshooting

### 401 Unauthorized
- Check if token is stored in localStorage
- Token might be expired - login again
- Check Authorization header format

### CORS Error
- Ensure backend is running
- Check FRONTEND_URL in backend .env
- Frontend URL must be in allowed origins

### Connection Refused
- Check if backend server is running
- Verify API_URL in frontend .env
- Check port 8000 is not blocked

### Order Creation Failed
- Ensure sufficient balance
- Check order parameters are valid
- Verify trading hours

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error
```json
{
  "error": "Error message",
  "statusCode": 400
}
```

---

## WebSocket Events (Real-time)

```typescript
// Subscribe to prices
socket.emit('subscribe', { symbols: ['EURUSD', 'GBPUSD'] });

// Listen for updates
socket.on('price_update', (data) => {
  // { symbol: 'EURUSD', bid: 1.0845, ask: 1.0847 }
});

// Trade notifications
socket.on('trade_executed', (data) => {
  // { orderId: '...', status: 'CLOSED', closePrice: 1.0900 }
});
```

---

## Rate Limits

Most endpoints are rate-limited to:
- 100 requests per minute per IP
- 1000 requests per hour per user

Check response headers for rate limit info:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1234567890
```

---

## Common Workflows

### Complete Registration & Login
```
1. POST /api/auth/register → Get token
2. Store token in localStorage
3. GET /api/auth/me → Verify login
4. POST /api/wallet → Get wallet details
5. GET /api/kyc → Check KYC status
```

### Open & Close Trade
```
1. GET /api/market/tickers → Get current price
2. POST /api/trading/orders → Create order
3. GET /api/trading/orders → Monitor position
4. POST /api/trading/orders/{id}/close → Close trade
```

### Deposit & Start Trading
```
1. POST /api/deposits → Request deposit
2. Wait for deposit approval
3. GET /api/wallet → Check balance
4. POST /api/trading/orders → Start trading
```

---

## Useful Links

- Full API Documentation: `API_DOCUMENTATION.md`
- Frontend Integration Guide: `FRONTEND_INTEGRATION_GUIDE.md`
- Changes Summary: `CHANGES_SUMMARY.md`
