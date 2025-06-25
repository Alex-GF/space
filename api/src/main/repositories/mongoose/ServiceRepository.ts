import RepositoryBase from '../RepositoryBase.js';
import PricingMongoose from './models/PricingMongoose.js';
import ServiceMongoose from './models/ServiceMongoose.js';
import type { LeanService } from '../../types/models/Service.js';
import { toPlainObject } from '../../utils/mongoose.js';
import type { LeanPricing } from '../../types/models/Pricing.js';

export type ServiceQueryFilters = {
  name?: string;
  page?: number;
  offset?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

class ServiceRepository extends RepositoryBase {
  async findAll(queryFilters?: ServiceQueryFilters, disabled = false) {
    const { name, page = 1, offset = 0, limit = 20, order = 'asc' } = queryFilters || {};
    
    const services = await ServiceMongoose.find({
      ...(name ? { name: { $regex: name, $options: 'i' } } : {}),
      disabled: disabled,
    })
      .skip(offset == 0 ? (page - 1) * limit : offset)
      .limit(limit)
      .sort({ name: order === 'asc' ? 1 : -1 });
    
    return services.map((service) => toPlainObject<LeanService>(service.toJSON()));
  }

  async findAllNoQueries(disabled = false): Promise<LeanService[] | null> {
    const services = await ServiceMongoose.find({disabled: disabled});

    if (!services || Array.isArray(services) && services.length === 0) {
      return null;
    }
    
    return services.map((service) => toPlainObject<LeanService>(service.toJSON()));
  }

  async findByName(name: string, disabled = false): Promise<LeanService | null> {
    const service = await ServiceMongoose.findOne({ name: { $regex: name, $options: 'i' }, disabled: disabled });
    if (!service) {
      return null;
    }

    return toPlainObject<LeanService>(service.toJSON());
  }

  async findByNames(names: string[], disabled = false): Promise<LeanService[] | null> {
    const services = await ServiceMongoose.find({ name: { $in: names.map(name => new RegExp(name, 'i')) }, disabled: disabled });
    if (!services || Array.isArray(services) && services.length === 0) {
      return null;
    }
    return services.map((service) => toPlainObject<LeanService>(service.toJSON()));
  }

  async findPricingsByServiceName(serviceName: string, versionsToRetrieve: string[], disabled = false): Promise<LeanPricing[] | null> {
    const pricings = await PricingMongoose.find({ _serviceName: { $regex: serviceName, $options: 'i' }, version: { $in: versionsToRetrieve } });
    if (!pricings || Array.isArray(pricings) && pricings.length === 0) {
      return null;
    }

    return pricings.map((p) => toPlainObject<LeanPricing>(p.toJSON()));
  }

  async create(data: any) {
    
    const service = await ServiceMongoose.insertOne(data);
    
    return toPlainObject<LeanService>(service.toJSON());
  }

  async update(name: string, data: any) {
    const service = await ServiceMongoose.findOne({ name: { $regex: name, $options: 'i' } });
    if (!service) {
      return null;
    }

    service.set(data);
    await service.save();

    return toPlainObject<LeanService>(service.toJSON());
  }

  async disable(name: string) {
    const service = await ServiceMongoose.findOne({ name: { $regex: name, $options: 'i' } });

    if (!service) {
      return null;
    }

    service.set({ disabled: true });
    await service.save();
    
    return toPlainObject<LeanService>(service.toJSON());
  }

  async destroy(name: string, ...args: any) {
    const result = await ServiceMongoose.deleteOne({ name: { $regex: name, $options: 'i' } });
    
    if (!result) {
      return null;
    }
    if (result.deletedCount === 0) {
      return null;
    }
  
    if (result.deletedCount === 1) {
      await PricingMongoose.deleteMany({ _serviceName: name });
    }

    return true;
  }

  async prune() {
    const result = await ServiceMongoose.deleteMany({});

    if (result.deletedCount === 0) {
      return null;
    }

    return result.deletedCount;
  }
}

export default ServiceRepository;
