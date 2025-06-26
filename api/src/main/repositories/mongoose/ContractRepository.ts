import RepositoryBase from '../RepositoryBase.js';
import ContractMongoose from './models/ContractMongoose.js';
import type { ContractQueryFilters, ContractToCreate, LeanContract } from '../../types/models/Contract.js';
import { toPlainObject } from '../../utils/mongoose.js';

class ContractRepository extends RepositoryBase {
  async findAll(queryFilters?: ContractQueryFilters) {
    const {
      username,
      firstName,
      lastName,
      email,
      serviceName,
      page = 1,
      offset = 0,
      limit = 20,
      sort,
      order = 'asc',
    } = queryFilters || {};

    const matchConditions = [];

    if (username) {
      matchConditions.push({ 'userContact.username': { $regex: username, $options: 'i' } });
    }
    if (firstName) {
      matchConditions.push({ 'userContact.firstName': { $regex: firstName, $options: 'i' } });
    }
    if (lastName) {
      matchConditions.push({ 'userContact.lastName': { $regex: lastName, $options: 'i' } });
    }
    if (email) {
      matchConditions.push({ 'userContact.email': { $regex: email, $options: 'i' } });
    }
    if (serviceName) {
      matchConditions.push({
        contractedServicesArray: {
          $elemMatch: {
            k: { $regex: serviceName, $options: 'i' },
          },
        },
      });
    }

    const contracts = await ContractMongoose.aggregate([
      {
        $addFields: {
          contractedServicesArray: { $objectToArray: '$contractedServices' },
        },
      },
      ...(matchConditions.length > 0 ? [{ $match: { $and: matchConditions } }] : []),
      {
        $sort: {
          [`userContact.${sort ?? 'username'}`]: order === 'asc' ? 1 : -1,
        },
      },
      {
        $skip: offset === 0 ? (page - 1) * limit : offset,
      },
      {
        $limit: Math.min(limit, 100),
      },
    ]);

    return contracts.map(contract => toPlainObject<LeanContract>(contract));
  }

  async findByUserId(userId: string): Promise<LeanContract | null> {
    const contract = await ContractMongoose.findOne({ 'userContact.userId': userId });
    return contract ? toPlainObject<LeanContract>(contract.toJSON()) : null;
  }

  async create(contractData: ContractToCreate): Promise<LeanContract> {
    const contract = new ContractMongoose(contractData);
    await contract.save();
    return toPlainObject<LeanContract>(contract.toJSON());
  }

  async update(
    userId: string,
    contractData: Partial<ContractToCreate>
  ): Promise<LeanContract | null> {
    const contract = await ContractMongoose.findOneAndUpdate(
      { 'userContact.userId': userId },
      { $set: contractData },
      { new: true }
    );
    return contract ? toPlainObject<LeanContract>(contract.toJSON()) : null;
  }

  async bulkUpdate(contracts: LeanContract[], disable = false): Promise<boolean> {
    if (contracts.length === 0) {
      return true;
    }

    const bulkOps = contracts.map(contract => ({
      updateOne: {
        filter: { 'userContact.userId': contract.userContact.userId },
        update: {
          $set: {
            ...contract,
            disable: disable,
          },
        },
        upsert: true,
      },
    }));

    const result = await ContractMongoose.bulkWrite(bulkOps);

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      throw new Error('No contracts were updated or inserted');
    }

    return true;
  }

  async prune(): Promise<number> {
    const result = await ContractMongoose.deleteMany({});
    if (result.deletedCount === 0) {
      throw new Error('No contracts found to delete');
    }
    return result.deletedCount;
  }

  async destroy(userId: string): Promise<void> {
    const result = await ContractMongoose.deleteOne({ 'userContact.userId': userId });
    if (result.deletedCount === 0) {
      throw new Error(`Contract with userId ${userId} not found`);
    }
  }
}

export default ContractRepository;
