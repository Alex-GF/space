import container from "../config/container.js";
import EventService from "../services/EventService.js";

/**
 * Controlador para gestionar las operaciones relacionadas con eventos en tiempo real.
 */
class EventController {
  private readonly eventService: EventService;
  
  constructor() {
    this.eventService = container.resolve("eventService");
  }

  /**
   * Emite un evento de cambio de pricing.
   * @param serviceName - Nombre del servicio al que pertenece el pricing
   * @param pricingVersion - Versión del pricing que ha cambiado
   */
  emitPricingMessage(serviceName: string, pricingVersion: string): void {
    this.eventService.emitPricingArchivedMessage(serviceName, pricingVersion);
  }
}

export default EventController;
