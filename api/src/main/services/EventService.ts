import type { Server } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Servicio encargado de gestionar eventos en tiempo real usando WebSockets.
 * Este servicio permite emitir eventos a los clientes conectados.
 */
class EventService {
  private io: SocketIOServer | null = null;

  /**
   * Inicializa el servicio de eventos con un servidor HTTP.
   * @param server - El servidor HTTP de la aplicación
   */
  initialize(server: Server): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/events'
    });

    this.setupEventHandlers();
  }

  /**
   * Configura los manejadores de eventos para las conexiones de WebSockets.
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    // Namespace para eventos relacionados con pricings
    const pricingsNamespace = this.io.of('/pricings');

    pricingsNamespace.on('connection', (socket) => {
      console.log(`New client connected to pricing events: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`Client disconnected from pricing events: ${socket.id}`);
      });
    });
  }

  /**
   * Emits a pricing change event to all connected clients.
   * @param serviceName - Name of the service to which the pricing belongs
   * @param pricingVersion - Version of the pricing that has changed
   */
  emitPricingCreatedMessage(serviceName: string, pricingVersion: string): void {
    if (!this.io) {
      console.error('Websocket server is not initialized');
      return;
    }

    this.io.of('/pricings').emit('message', {
      code: 'PRICING_CREATED',
      details: {
        serviceName,
        pricingVersion
      }
    });
  }

  emitPricingArchivedMessage(serviceName: string, pricingVersion: string): void {
    if (!this.io) {
      console.error('Websocket server is not initialized');
      return;
    }

    this.io.of('/pricings').emit('message', {
      code: 'PRICING_ARCHIVED',
      details: {
        serviceName,
        pricingVersion
      }
    });
  }

  emitPricingActivedMessage(serviceName: string, pricingVersion: string): void {
    if (!this.io) {
      console.error('Websocket server is not initialized');
      return;
    }

    this.io.of('/pricings').emit('message', {
      code: 'PRICING_ACTIVED',
      details: {
        serviceName,
        pricingVersion
      }
    });
  }

  emitServiceDisabledMessage(serviceName: string): void {
    if (!this.io) {
      console.error('Websocket server is not initialized');
      return;
    }

    this.io.of('/pricings').emit('message', {
      code: 'SERVICE_DISABLED',
      details: {
        serviceName
      }
    });
  }
}

export default EventService;
