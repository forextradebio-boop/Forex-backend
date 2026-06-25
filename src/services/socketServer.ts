import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketServer {
  private static io: Server;

  static init(server: HttpServer) {
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',') 
      : ['http://localhost:5173', 'http://localhost:5174'];

    this.io = new Server(server, {
      cors: {
        origin: true, // Allow all origins to prevent CORS errors
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  static broadcastPrices(prices: any) {
    if (this.io) {
      this.io.emit('prices', prices);
    }
  }

  static broadcastPnlUpdate(userId: string, positions: any[]) {
    if (this.io) {
      // For simplicity broadcasting to all, in prod should join user rooms
      this.io.emit(`pnl_${userId}`, positions);
    }
  }

  static broadcastWalletUpdate(userId: string, wallet: any) {
    if (this.io) {
      this.io.emit(`wallet_${userId}`, wallet);
    }
  }
}
