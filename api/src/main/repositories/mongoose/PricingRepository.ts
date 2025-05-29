import RepositoryBase from '../RepositoryBase';
import PricingMongoose from './models/PricingMongoose';
import { toPlainObject } from '../../utils/mongoose';
import { LeanPricing } from '../../types/models/Pricing';

class PricingRepository extends RepositoryBase {
  async findById(id: string): Promise<any> {
    const pricing = await PricingMongoose.findById(id);
    if (!pricing) {
      return null;
    }
    return pricing.toJSON();
  }

  async create(data: any): Promise<LeanPricing | null> {
    const pricing = await PricingMongoose.create(data);
    if (!pricing) {
      return null;
    }
    return toPlainObject<LeanPricing>(pricing.toObject());
  }

  async addServiceNameToPricing(pricingId: string, serviceName: string): Promise<any> {
    const pricing = await PricingMongoose.updateOne(
      { _id: pricingId },
      { $set: { _serviceName: serviceName } }
    );

    if (!pricing) {
      return null;
    }

    return true;
  }

  async destroy(id: string): Promise<LeanPricing | null> {
    const pricing = await PricingMongoose.findByIdAndDelete(id);
    if (!pricing) {
      return null;
    }
    return toPlainObject<LeanPricing>(pricing.toObject());
  }
}

export default PricingRepository;
