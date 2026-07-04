# Frontend Integration Guide

## Quick Start

### 1. Environment Configuration

Create `.env` in the frontend root:
```env
VITE_API_URL=http://localhost:8000/api
VITE_SOCKET_URL=http://localhost:8000
```

### 2. API Configuration File

Update or create `src/api/axios.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('profile');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Authentication Examples

### Registration Component

```typescript
import { useState } from 'react';
import api from '../api/axios';

export const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/register', {
        username,
        password,
      });

      // Store tokens and profile
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('profile', JSON.stringify(data.profile));

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username (min 4 characters)"
        minLength={4}
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 8 characters)"
        minLength={8}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};
```

### Login Component

```typescript
import { useState } from 'react';
import api from '../api/axios';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        username,
        password,
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('profile', JSON.stringify(data.profile));

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username or Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};
```

---

## Custom Hooks for Common Operations

### useAuth Hook

```typescript
import { useCallback, useState } from 'react';
import api from '../api/axios';

interface User {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  role: string;
  kycStatus: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(() => {
    const profile = localStorage.getItem('profile');
    return profile ? JSON.parse(profile) : null;
  });
  const [loading, setLoading] = useState(false);

  const register = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('profile', JSON.stringify(data.profile));
      setUser(data.profile);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('profile', JSON.stringify(data.profile));
      setUser(data.profile);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('profile');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const getProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.profile);
      localStorage.setItem('profile', JSON.stringify(data.profile));
      return data.profile;
    } catch (error) {
      throw error;
    }
  }, []);

  const isAuthenticated = !!localStorage.getItem('token');

  return {
    user,
    loading,
    isAuthenticated,
    register,
    login,
    logout,
    getProfile,
  };
};
```

### useWallet Hook

```typescript
import { useState, useEffect } from 'react';
import api from '../api/axios';

interface Wallet {
  id: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  pnl: number;
  currency: string;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/wallet');
      setWallet(data.wallet);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
    // Refresh wallet every 1 second for live updates
    const interval = setInterval(fetchWallet, 1000);
    return () => clearInterval(interval);
  }, []);

  return { wallet, loading, error, refetch: fetchWallet };
};
```

### useOrders Hook

```typescript
import { useState, useEffect } from 'react';
import api from '../api/axios';

interface Order {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  createdAt: string;
}

export const useOrders = (status?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = status ? { status } : {};
      const { data } = await api.get('/trading/orders', { params });
      setOrders(data.orders);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [status]);

  const createOrder = async (order: {
    symbol: string;
    type: 'BUY' | 'SELL';
    volume: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => {
    try {
      const { data } = await api.post('/trading/orders', order);
      setOrders([data.order, ...orders]);
      return data.order;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to create order');
    }
  };

  const closeOrder = async (orderId: string, closePrice: number) => {
    try {
      const { data } = await api.post(`/trading/orders/${orderId}/close`, { closePrice });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'CLOSED' } : o));
      return data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to close order');
    }
  };

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    createOrder,
    closeOrder,
  };
};
```

### useMarket Hook

```typescript
import { useState, useEffect } from 'react';
import api from '../api/axios';

interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  change: number;
  changePercent: number;
}

export const useMarket = (symbols: string[]) => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/market/tickers', {
        params: { symbols: symbols.join(',') },
      });
      setTickers(data.tickers);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch tickers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbols.length > 0) {
      fetchTickers();
      // Refresh every 3 seconds
      const interval = setInterval(fetchTickers, 3000);
      return () => clearInterval(interval);
    }
  }, [symbols.join(',')]);

  return { tickers, loading, error, refetch: fetchTickers };
};
```

---

## Integration with React Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/axios';

// Fetch orders with React Query
export const useOrdersQuery = (status?: string) => {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params = status ? { status } : {};
      const { data } = await api.get('/trading/orders', { params });
      return data.orders;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

// Create order mutation
export const useCreateOrderMutation = () => {
  return useMutation({
    mutationFn: (order: any) => api.post('/trading/orders', order),
  });
};

// Usage in component
import { useOrdersQuery, useCreateOrderMutation } from '../hooks';

export const OrdersComponent = () => {
  const { data: orders, isLoading } = useOrdersQuery('OPEN');
  const { mutate: createOrder, isPending } = useCreateOrderMutation();

  return (
    <div>
      {isLoading ? <p>Loading...</p> : (
        <ul>
          {orders?.map((order) => (
            <li key={order.id}>{order.symbol} - {order.type}</li>
          ))}
        </ul>
      )}
      <button onClick={() => createOrder({
        symbol: 'EURUSD',
        type: 'BUY',
        volume: 1.0,
        price: 1.0850,
      })} disabled={isPending}>
        Create Order
      </button>
    </div>
  );
};
```

---

## Protected Routes

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return children;
};

// Usage in router
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
</Routes>
```

---

## Error Handling Pattern

```typescript
const handleApiCall = async () => {
  try {
    const { data } = await api.post('/some-endpoint', payload);
    // Handle success
    console.log('Success:', data);
  } catch (error: any) {
    if (error.response?.status === 400) {
      // Bad request - validation error
      console.error('Validation error:', error.response.data.error);
    } else if (error.response?.status === 401) {
      // Unauthorized - token expired
      console.error('Authentication required');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - insufficient permissions
      console.error('Access denied');
    } else if (error.response?.status === 404) {
      // Not found
      console.error('Resource not found');
    } else if (error.response?.status === 500) {
      // Server error
      console.error('Server error');
    } else {
      // Network or other error
      console.error('Error:', error.message);
    }
  }
};
```

---

## WebSocket Real-Time Updates

```typescript
import io from 'socket.io-client';
import { useEffect, useState } from 'react';

export const useRealtimeData = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const socket = io(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000',
      {
        auth: {
          token: localStorage.getItem('token'),
        },
      }
    );

    // Subscribe to price updates
    socket.emit('subscribe', { symbols: ['EURUSD', 'GBPUSD', 'USDJPY'] });

    // Listen for updates
    socket.on('price_update', (update) => {
      setData(update);
    });

    // Cleanup
    return () => {
      socket.disconnect();
    };
  }, []);

  return data;
};
```

---

## Common Issues & Solutions

### Issue: CORS Error
**Solution**: Ensure backend is running and frontend URL is in `FRONTEND_URL` environment variable

### Issue: 401 Unauthorized
**Solution**: Token might be expired or invalid. Clear localStorage and login again

### Issue: Network timeout
**Solution**: Check backend is running and API_URL is correct

### Issue: Undefined profile after login
**Solution**: Ensure localStorage is being set correctly in login handler
