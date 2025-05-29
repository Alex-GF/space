import container from '../config/container.js';
import ServiceService from '../services/ServiceService.js';
import { ServiceQueryFilters } from '../repositories/mongoose/ServiceRepository.js';
import { removeOptionalFieldsOfQueryParams } from '../utils/controllerUtils.js';
import { FallBackSubscription } from '../types/models/Contract.js';
import { resetEscapePricingVersion } from '../utils/services/helpers.js';

class ServiceController {
  private readonly serviceService: ServiceService;

  constructor() {
    this.serviceService = container.resolve('serviceService');
    this.index = this.index.bind(this);
    this.indexPricings = this.indexPricings.bind(this);
    this.show = this.show.bind(this);
    this.showPricing = this.showPricing.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.updatePricingAvailability = this.updatePricingAvailability.bind(this);
    this.addPricingToService = this.addPricingToService.bind(this);
    this.prune = this.prune.bind(this);
    this.disable = this.disable.bind(this);
    this.destroyPricing = this.destroyPricing.bind(this);
  }

  async index(req: any, res: any) {
    try {
      const queryParams = this._transformIndexQueryParams(req.query);

      const services = await this.serviceService.index(queryParams);

      res.json(services);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  async indexPricings(req: any, res: any) {
    try {
      let { pricingStatus } = req.query;
      const serviceName = req.params.serviceName;

      if (!pricingStatus) {
        pricingStatus = 'active';
      } else if (pricingStatus !== 'active' && pricingStatus !== 'archived') {
        res.status(400).send({ error: 'Invalid pricing status' });
        return;
      }

      const pricings = await this.serviceService.indexPricings(serviceName, pricingStatus);

      for (const pricing of pricings) {
        resetEscapePricingVersion(pricing);
      }

      return res.json(pricings);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async show(req: any, res: any) {
    try {
      const serviceName = req.params.serviceName;
      const service = await this.serviceService.show(serviceName);

      return res.json(service);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async showPricing(req: any, res: any) {
    try {
      const serviceName = req.params.serviceName;
      const pricingVersion = req.params.pricingVersion;

      const pricing = await this.serviceService.showPricing(serviceName, pricingVersion);

      resetEscapePricingVersion(pricing);

      return res.json(pricing);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async create(req: any, res: any) {
    try {
      const receivedFile = req.file;
      let service;

      if (!receivedFile) {
        if (!req.body.pricing) {
          res.status(400).send({ error: 'No file or URL provided' });
          return;
        }
        service = await this.serviceService.create(req.body.pricing, 'url');
      } else {
        service = await this.serviceService.create(req.file, 'file');
      }
      res.status(201).json(service);
    } catch (err: any) {
      if (
        err.message.toLowerCase().includes('parsing') ||
        err.message.toLowerCase().includes('already exists') ||
        err.message.toLowerCase().includes('invalid')
      ) {
        res.status(400).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async addPricingToService(req: any, res: any) {
    try {
      const serviceName = req.params.serviceName;
      const receivedFile = req.file;
      let service;

      if (!receivedFile) {
        if (!req.body.pricing) {
          res.status(400).send({ error: 'No file or URL provided' });
          return;
        }
        service = await this.serviceService.addPricingToService(
          serviceName,
          req.body.pricing,
          'url'
        );
      } else {
        service = await this.serviceService.addPricingToService(serviceName, req.file, 'file');
      }

      res.status(201).json(service);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async update(req: any, res: any) {
    try {
      const newServiceData = req.body;
      const serviceName = req.params.serviceName;

      const service = await this.serviceService.update(serviceName, newServiceData);

      res.json(service);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  async updatePricingAvailability(req: any, res: any) {
    try {
      const serviceName = req.params.serviceName;
      const pricingVersion = req.params.pricingVersion;
      const newAvailability = req.query.availability ?? 'archived';
      const fallBackSubscription: FallBackSubscription = req.body ?? {};

      if (!newAvailability) {
        res.status(400).send({ error: 'No availability provided' });
        return;
      } else if (newAvailability !== 'active' && newAvailability !== 'archived') {
        res
          .status(400)
          .send({ error: 'Invalid availability status. Either provide "active" or "archived"' });
        return;
      } else {
        const service = await this.serviceService.updatePricingAvailability(
          serviceName,
          pricingVersion,
          newAvailability,
          fallBackSubscription
        );

        res.json(service);
      }
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('last active pricing')) {
        res.status(400).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('invalid')) {
        res.status(400).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async prune(req: any, res: any) {
    try {
      const result = await this.serviceService.prune();
      res.json({ message: `Pruned ${result} services` });
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  async disable(req: any, res: any) {
    try {
      const serviceName = req.params.serviceName;
      const result = await this.serviceService.disable(serviceName);

      if (result) {
        res.status(204).send();
      } else {
        res.status(404).send({ error: 'Service not found' });
      }
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async destroyPricing(req: any, res: any) {
    try {
      const serviceName = req.params.serviceName;
      const pricingVersion = req.params.pricingVersion;

      const result = await this.serviceService.destroyPricing(serviceName, pricingVersion);

      if (result) {
        res.status(204).send();
      } else {
        res.status(404).send({ error: 'Pricing not found' });
      }
    } catch (err: any) {
      if (
        err.message.toLowerCase().includes('not found') ||
        err.message.toLowerCase().includes('invalid')
      ) {
        res.status(404).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('last active pricing')) {
        res.status(400).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('forbidden')) {
        res.status(403).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  _transformIndexQueryParams(
    indexQueryParams: Record<string, string | number>
  ): ServiceQueryFilters {
    const transformedData: ServiceQueryFilters = {
      name: indexQueryParams.name as string,
      page: parseInt(indexQueryParams['page'] as string) || 1,
      offset: parseInt(indexQueryParams['offset'] as string) || 0,
      limit: parseInt(indexQueryParams['limit'] as string) || 20,
      order: (indexQueryParams.order as 'asc' | 'desc') || 'asc',
    };

    const optionalFields = Object.keys(transformedData);

    removeOptionalFieldsOfQueryParams(transformedData, optionalFields);

    return transformedData;
  }
}

export default ServiceController;
