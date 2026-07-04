# Forex Factory Backend API Documentation

## Overview
This document provides comprehensive API documentation for the Forex Factory backend. The system has been simplified to remove OTP/2FA verification, using direct username and password authentication.

## Base URL
```
http://localhost:8000/api
```

## Environment Setup

### Backend (.env)
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
FRONTEND_URL=http://localhost:5173,http://localhost:5174
NODE_ENV=development
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
```

---

## Authentication Endpoints

### 1. Register New User
**POST** `/api/auth/register`

Request body:
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

Requirements:
- Username: minimum 4 characters, must be unique
- Password: minimum 8 characters

Response (201 Created):
```json
{
  "success": true,
  "message": "Registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "role": "user",
    "kycStatus": "PENDING",
    "status": "ACTIVE",
    "createdAt": "2024-07-03T10:00:00.000Z",
    "updatedAt": "2024-07-03T10:00:00.000Z"
  }
}
```

**On registration, the following are automatically created:**
- User account with ACTIVE status
- Default wallet with 0 balance
- Default settings (light theme, notifications enabled, English language)
- KYC record with PENDING status

---

### 2. Login
**POST** `/api/auth/login`

Request body:
```json
{
  "username": "john_doe",
  "password": "securePassword123"
}
```

Can login with:
- Username
- Email (if set in user profile)

Response (200 OK):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profile": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "user",
    "kycStatus": "APPROVED",
    "status": "ACTIVE"
  }
}
```

---

### 3. Get Authenticated User Profile
**GET** `/api/auth/me`

Headers required:
```
Authorization: Bearer {token}
```

Response (200 OK):
```json
{
  "success": true,
  "profile": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "+1234567890",
    "country": "US",
    "avatar": "https://...",
    "role": "user",
    "status": "ACTIVE",
    "kycStatus": "APPROVED",
    "createdAt": "2024-07-03T10:00:00.000Z"
  }
}
```

---

## Wallet Endpoints

### 1. Get Wallet Details
**GET** `/api/wallet`

Headers required:
```
Authorization: Bearer {token}
```

Response (200 OK):
```json
{
  "success": true,
  "wallet": {
    "id": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "balance": 10000,
    "equity": 10500,
    "margin": 5000,
    "freeMargin": 5500,
    "pnl": 500,
    "currency": "USD"
  }
}
```

### 2. Update Wallet Balance
**PUT** `/api/wallet`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "balance": 15000
}
```

---

## Trading Endpoints

### 1. Create Order
**POST** `/api/trading/orders`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "symbol": "EURUSD",
  "type": "BUY",
  "volume": 1.0,
  "price": 1.0850,
  "stopLoss": 1.0800,
  "takeProfit": 1.0900
}
```

Response (201 Created):
```json
{
  "success": true,
  "order": {
    "id": "507f1f77bcf86cd799439013",
    "userId": "507f1f77bcf86cd799439011",
    "symbol": "EURUSD",
    "type": "BUY",
    "volume": 1.0,
    "openPrice": 1.0850,
    "status": "OPEN",
    "createdAt": "2024-07-03T10:00:00.000Z"
  }
}
```

### 2. Get Orders
**GET** `/api/trading/orders`

Headers required:
```
Authorization: Bearer {token}
```

Query parameters:
- `status`: OPEN, CLOSED, PENDING
- `limit`: default 20
- `skip`: default 0

Response (200 OK):
```json
{
  "success": true,
  "orders": [
    {
      "id": "507f1f77bcf86cd799439013",
      "symbol": "EURUSD",
      "type": "BUY",
      "volume": 1.0,
      "openPrice": 1.0850,
      "status": "OPEN",
      "createdAt": "2024-07-03T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 3. Close Order
**POST** `/api/trading/orders/:orderId/close`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "closePrice": 1.0900
}
```

---

## Deposit Endpoints

### 1. Create Deposit Request
**POST** `/api/deposits`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "amount": 1000,
  "paymentMethod": "credit_card",
  "currency": "USD"
}
```

Response (201 Created):
```json
{
  "success": true,
  "deposit": {
    "id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "amount": 1000,
    "status": "PENDING",
    "paymentMethod": "credit_card",
    "currency": "USD",
    "createdAt": "2024-07-03T10:00:00.000Z"
  }
}
```

### 2. Get Deposits
**GET** `/api/deposits`

Headers required:
```
Authorization: Bearer {token}
```

---

## Withdrawal Endpoints

### 1. Create Withdrawal Request
**POST** `/api/withdrawals`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "amount": 500,
  "bankAccount": "1234567890",
  "currency": "USD"
}
```

---

## KYC Endpoints

### 1. Get KYC Status
**GET** `/api/kyc`

Headers required:
```
Authorization: Bearer {token}
```

Response (200 OK):
```json
{
  "success": true,
  "kyc": {
    "id": "507f1f77bcf86cd799439015",
    "userId": "507f1f77bcf86cd799439011",
    "status": "PENDING",
    "documents": [
      {
        "type": "ID",
        "url": "https://...",
        "status": "PENDING"
      }
    ],
    "createdAt": "2024-07-03T10:00:00.000Z"
  }
}
```

### 2. Submit KYC Documents
**POST** `/api/kyc/submit`

Headers required:
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

Form data:
```
file: [binary file]
documentType: ID (or PROOF_OF_ADDRESS, PROOF_OF_FUNDS, etc.)
```

---

## Market Data Endpoints

### 1. Get Market Tickers
**GET** `/api/market/tickers`

Query parameters:
- `symbols`: comma-separated list (e.g., "EURUSD,GBPUSD")

Response (200 OK):
```json
{
  "success": true,
  "tickers": [
    {
      "symbol": "EURUSD",
      "bid": 1.0845,
      "ask": 1.0847,
      "spread": 0.0002,
      "change": 0.15,
      "changePercent": 0.014
    }
  ]
}
```

### 2. Get Price History
**GET** `/api/market/history/:symbol`

Query parameters:
- `timeframe`: M1, M5, M15, H1, H4, D1
- `limit`: number of candles (default 100)

Response (200 OK):
```json
{
  "success": true,
  "candles": [
    {
      "time": 1688115600000,
      "open": 1.0820,
      "high": 1.0850,
      "low": 1.0815,
      "close": 1.0845,
      "volume": 100000
    }
  ]
}
```

---

## News Endpoints

### 1. Get Market News
**GET** `/api/news`

Query parameters:
- `limit`: default 20
- `skip`: default 0
- `category`: forex, stocks, crypto (optional)

Response (200 OK):
```json
{
  "success": true,
  "news": [
    {
      "id": "507f1f77bcf86cd799439016",
      "title": "EUR rises on strong economic data",
      "content": "The Euro strengthened today...",
      "source": "Reuters",
      "publishedAt": "2024-07-03T10:00:00.000Z",
      "impact": "HIGH"
    }
  ],
  "total": 1
}
```

---

## Economic Calendar Endpoints

### 1. Get Economic Events
**GET** `/api/economic-calendar`

Query parameters:
- `country`: US, EU, UK, JP, etc.
- `fromDate`: ISO date format
- `toDate`: ISO date format
- `importance`: HIGH, MEDIUM, LOW

Response (200 OK):
```json
{
  "success": true,
  "events": [
    {
      "id": "507f1f77bcf86cd799439017",
      "country": "US",
      "event": "Non-Farm Payroll",
      "importance": "HIGH",
      "forecast": "300K",
      "previous": "290K",
      "actual": null,
      "time": "2024-07-05T12:30:00.000Z"
    }
  ]
}
```

---

## Copy Trading Endpoints

### 1. Get Available Traders
**GET** `/api/copy-trading/traders`

Query parameters:
- `sort`: performance, followers, drawdown
- `limit`: default 20

Response (200 OK):
```json
{
  "success": true,
  "traders": [
    {
      "id": "507f1f77bcf86cd799439018",
      "username": "pro_trader_1",
      "performance": 45.5,
      "followers": 150,
      "maxDrawdown": 5.2,
      "trades": 250
    }
  ]
}
```

### 2. Follow Trader
**POST** `/api/copy-trading/follow/:traderId`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "copyVolume": 1.0,
  "riskPercent": 2
}
```

---

## Alert Endpoints

### 1. Create Price Alert
**POST** `/api/alerts`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "symbol": "EURUSD",
  "type": "PRICE_ABOVE",
  "value": 1.1000,
  "notificationType": "EMAIL"
}
```

### 2. Get Alerts
**GET** `/api/alerts`

Headers required:
```
Authorization: Bearer {token}
```

---

## Profile Endpoints

### 1. Update Profile
**PUT** `/api/profile`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "country": "US",
  "avatar": "https://..."
}
```

---

## Watchlist Endpoints

### 1. Create Watchlist
**POST** `/api/watchlist`

Headers required:
```
Authorization: Bearer {token}
```

Request body:
```json
{
  "name": "My Forex Pairs",
  "symbols": ["EURUSD", "GBPUSD", "USDJPY"]
}
```

### 2. Get Watchlists
**GET** `/api/watchlist`

Headers required:
```
Authorization: Bearer {token}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error message",
  "statusCode": 400
}
```

Common error codes:
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Frontend Integration

### 1. Setup API Client (React)

Create `src/services/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. Example: Authentication Hook

```typescript
import { useState } from 'react';
import api from '../services/api';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const register = async (username: string, password: string) => {
    try {
      setLoading(true);
      const { data } = await api.post('/auth/register', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('profile', JSON.stringify(data.profile));
      return data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('profile', JSON.stringify(data.profile));
      return data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { register, login, loading, error };
};
```

### 3. Example: Wallet Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useWallet = () => {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await api.get('/wallet');
      return data.wallet;
    },
    refetchInterval: 1000, // Refresh every second
  });
};
```

---

## WebSocket Connections

For real-time market data and trading updates, connect to WebSocket:

```typescript
const socket = io(process.env.VITE_SOCKET_URL || 'http://localhost:8000', {
  auth: {
    token: localStorage.getItem('token'),
  },
});

// Subscribe to price updates
socket.emit('subscribe', { symbols: ['EURUSD', 'GBPUSD'] });
socket.on('price_update', (data) => {
  console.log('Price update:', data);
});
```

---

## Testing Authentication Flow

### 1. Start Backend
```bash
npm run dev
```

### 2. Register User (via Terminal)
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123"}'
```

### 3. Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123"}'
```

### 4. Get Profile (replace TOKEN with actual token)
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/auth/me
```

---

## Summary of Changes

✅ **OTP System Removed:**
- No 2FA verification required
- No OTP generation or validation
- Direct login with username and password

✅ **Simplified Authentication:**
- Register: username + password only
- Login: username/email + password
- Automatic wallet and KYC initialization

✅ **All APIs Connected:**
- Wallet management
- Trading operations
- Deposits/Withdrawals
- KYC verification
- Market data
- News and economic calendar
- Copy trading
- Alerts and watchlists
