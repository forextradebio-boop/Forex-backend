import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketServer {
  private static io: Server | null = null;
  private static connectedUsers = new Set<string>();

  static init(server: HttpServer) {
    if (this.io) {
      return this.io;
    }

    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://localhost:5174')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    this.io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          // Allow requests with no origin (like mobile apps)
          if (!origin) {
            return callback(null, true);
          }
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          console.warn(`[Socket.IO CORS] Rejected Origin: ${origin}`);
          return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000,
    });

    this.io.on('connection', (socket) => {
      this.connectedUsers.add(socket.id);
      console.log('Client connected:', socket.id);

      socket.on('subscribe', (userId: string) => {
        if (userId) {
          socket.join(userId);
          console.log(`Socket ${socket.id} joined room ${userId}`);
        }
      });

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        console.log('Client disconnected:', socket.id);
      });
    });

    return this.io;
  }

  static getIO() {
    return this.io;
  }

  static broadcastPrices(prices: any) {
    if (this.io) {
      this.io.emit('prices', prices);
    }
  }

  static broadcastMarketUpdate(updates: any[]) {
    if (this.io && Array.isArray(updates) && updates.length > 0) {
      this.io.emit('market:update', updates);
    }
  }

  static broadcastPnlUpdate(userId: string, positions: any[]) {
    if (this.io) {
      this.io.to(userId).emit('pnl', positions);
    }
  }

  static broadcastWalletUpdate(userId: string, wallet: any) {
    if (this.io) {
      this.io.to(userId).emit('wallet', wallet);
    }
  }

  static broadcastTransactionUpdate(userId: string) {
    if (this.io) {
      this.io.to(userId).emit('transaction');
    }
  }
}
