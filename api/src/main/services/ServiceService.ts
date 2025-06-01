import { retrievePricingFromPath } from 'pricing4ts/server';
import container from '../config/container';
import ServiceRepository, { ServiceQueryFilters } from '../repositories/mongoose/ServiceRepository';
import { parsePricingToSpacePricingObject } from '../utils/pricing-yaml2json';
import { Pricing, retrievePricingFromYaml } from 'pricing4ts';
import fetch from 'node-fetch';
import https from 'https';
import path from 'path';
import fs from 'fs';
import PricingRepository from '../repositories/mongoose/PricingRepository';
import { validatePricingData } from './validation/PricingServiceValidation';
import { LeanService } from '../types/models/Service';
import { ExpectedPricingType, LeanPricing } from '../types/models/Pricing';
import { FallBackSubscription, LeanContract } from '../types/models/Contract';
import ContractRepository from '../repositories/mongoose/ContractRepository';
import { performNovation } from '../utils/contracts/novation';
import { isSubscriptionValidInPricing } from '../controllers/validation/ContractValidation';
import { generateUsageLevels } from '../utils/contracts/helpers';
import mongoose from 'mongoose';
import { escapeVersion } from '../utils/helpers';
import { resetEscapeVersionInService } from '../utils/services/helpers';
// import CacheService from "./CacheService";

class ServiceService {
  private readonly serviceRepository: ServiceRepository;
  private readonly pricingRepository: PricingRepository;
  private readonly contractRepository: ContractRepository;
  private readonly eventService;
  // private cacheService: CacheService;

  constructor() {
    this.serviceRepository = container.resolve('serviceRepository');
    this.pricingRepository = container.resolve('pricingRepository');
    this.contractRepository = container.resolve('contractRepository');
    this.eventService = container.resolve('eventService');
    // this.cacheService = container.resolve('cacheService');
  }

  async index(queryParams: ServiceQueryFilters) {
    const services = await this.serviceRepository.findAll(queryParams);

    for (const service of services) {
      resetEscapeVersionInService(service);
    }

    return services;
  }

  async indexByNames(serviceNames: string[]) {
    if (!Array.isArray(serviceNames) || serviceNames.length === 0) {
      throw new Error('Invalid request: serviceNames must be a non-empty array');
    }

    const services = await this.serviceRepository.findByNames(serviceNames);
    return services;
  }

  async indexPricings(serviceName: string, pricingStatus: string) {
    const service = await this.serviceRepository.findByName(serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const pricingsToReturn =
      pricingStatus === 'active' ? service.activePricings : service.archivedPricings;

    if (!pricingsToReturn){
      return [];
    }

    const versionsToRetrieve = Object.keys(pricingsToReturn);

    const versionsToRetrieveLocally = versionsToRetrieve.filter(
      version => pricingsToReturn[version]?.id
    );
    const versionsToRetrieveRemotely = versionsToRetrieve.filter(
      version => !pricingsToReturn[version]?.id
    );

    const locallySavedPricings =
      (await this.serviceRepository.findPricingsByServiceName(
        service.name,
        versionsToRetrieveLocally
      )) ?? [];

    const remotePricings = [];

    for (const version of versionsToRetrieveRemotely) {
      remotePricings.push(await this._getPricingFromUrl(pricingsToReturn[version].url));
    }

    return (locallySavedPricings as unknown as ExpectedPricingType[]).concat(remotePricings);
  }

  async show(serviceName: string) {
    const service = await this.serviceRepository.findByName(serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    resetEscapeVersionInService(service);

    return service;
  }

  async showPricing(serviceName: string, pricingVersion: string) {
    const service = await this.serviceRepository.findByName(serviceName);
    const formattedPricingVersion = escapeVersion(pricingVersion);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const pricingLocator =
      service.activePricings[formattedPricingVersion] || service.archivedPricings[formattedPricingVersion];

    if (!pricingLocator) {
      throw new Error(`Pricing version ${pricingVersion} not found for service ${serviceName}`);
    }

    if (!pricingLocator.id && !pricingLocator.url) {
      throw new Error(
        `Neither Pricing URL or id found for version ${pricingVersion} in service ${serviceName}`
      );
    }

    if (pricingLocator.id) {
      return await this.pricingRepository.findById(pricingLocator.id);
    } else {
      return await this._getPricingFromUrl(pricingLocator.url);
    }
  }

  async create(receivedPricing: any, pricingType: 'file' | 'url') {
    try {
      if (pricingType === 'file') {
        return await this._createFromFile(receivedPricing);
      } else {
        return await this._createFromUrl(receivedPricing);
      }
    } catch (err) {
      throw new Error((err as Error).message);
    }
  }

  async addPricingToService(
    serviceName: string,
    receivedPricing: any,
    pricingType: 'file' | 'url'
  ) {
    try {
      if (pricingType === 'file') {
        return await this._createFromFile(receivedPricing, serviceName);
      } else {
        return await this._createFromUrl(receivedPricing, serviceName);
      }
    } catch (err) {
      throw new Error((err as Error).message);
    }
  }

  async _createFromFile(pricingFile: any, serviceName?: string) {
    let service: LeanService | null = null;

    // Step 1: Parse and validate pricing

    const uploadedPricing: Pricing = await this._getPricingFromPath(pricingFile.path);
    const formattedPricingVersion = escapeVersion(uploadedPricing.version);
    // Step 1.1: Load the service if already exists
    if (serviceName) {
      service = await this.serviceRepository.findByName(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      if (
        (service.activePricings && service.activePricings[formattedPricingVersion]) ||
        (service.archivedPricings && service.archivedPricings[formattedPricingVersion])
      ) {
        throw new Error(
          `Pricing version ${uploadedPricing.version} already exists for service ${serviceName}`
        );
      }
    }

    const pricingData: ExpectedPricingType & { _serviceName: string } = {
      _serviceName: uploadedPricing.saasName,
      ...parsePricingToSpacePricingObject(uploadedPricing),
    };

    const validationErrors: string[] = validatePricingData(pricingData);

    if (validationErrors.length > 0) {
      throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
    }

    // Step 2: Save the pricing data to the database
    const savedPricing = await this.pricingRepository.create(pricingData);
    if (!savedPricing) {
      throw new Error(`Pricing ${uploadedPricing.version} not saved`);
    }
    // Step 3:
    // - If the service does not exist, creates it
    // - If the service exists, updates it with the new pricing
    if (!service) {
      const serviceData = {
        name: uploadedPricing.saasName,
        activePricings: {
          [formattedPricingVersion]: {
            id: savedPricing.id,
          },
        },
      };

      try{
        service = await this.serviceRepository.create(serviceData);
      }catch (err) {
        throw new Error(`Service ${uploadedPricing.saasName} not saved: ${(err as Error).message}`);
      }
    } else {
      const updatedService = await this.serviceRepository.update(service.name, {
        [`activePricings.${formattedPricingVersion}`]: {
          id: savedPricing.id,
        },
      });

      service = updatedService;
    }

    if (!service) {
      throw new Error(`Service ${uploadedPricing.saasName} not saved`);
    }

    // Emit pricing creation event
    this.eventService.emitPricingCreatedMessage(service.name, uploadedPricing.version);

    // Step 4: Link the pricing to the service
    // await this.pricingRepository.addServiceNameToPricing(
    //   savedPricing.id!.toString(),
    //   service!.name.toString()
    // );

    // Step 5: If everythign was ok, remove the uploaded file

    const directory = path.dirname(pricingFile.path);
    if (fs.readdirSync(directory).length === 1) {
      fs.rmdirSync(directory, { recursive: true });
    } else {
      fs.rmSync(pricingFile.path);
    }

    // Step 6: Return the saved service
    return service;
  }

  async _createFromUrl(pricingUrl: string, serviceName?: string) {
    const uploadedPricing: Pricing = await this._getPricingFromRemoteUrl(pricingUrl);
    const formattedPricingVersion = escapeVersion(uploadedPricing.version);

    if (!serviceName) {
      // Create a new service
      const serviceData = {
        name: uploadedPricing.saasName,
        activePricings: {
          [formattedPricingVersion]: {
            url: pricingUrl,
          },
        },
      };

      const existingService = await this.serviceRepository.findByName(uploadedPricing.saasName);

      if (existingService) {
        throw new Error(`Invalid request: Service ${uploadedPricing.saasName} already exists`);
      }

      const service = await this.serviceRepository.create(serviceData);
      return service;
    } else {
      // Update an existing service
      const service = await this.serviceRepository.findByName(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      if (
        service.activePricings[formattedPricingVersion] ||
        service.archivedPricings[formattedPricingVersion]
      ) {
        throw new Error(
          `Pricing version ${uploadedPricing.version} already exists for service ${serviceName}`
        );
      }

      const updatedService = await this.serviceRepository.update(service.name, {
        [`activePricings.${formattedPricingVersion}`]: {
          url: pricingUrl,
        },
      });

      return updatedService;
    }
  }

  async update(serviceName: string, newServiceData: any) {
    const service = await this.serviceRepository.findByName(serviceName);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const updatedService = await this.serviceRepository.update(service.name, newServiceData);

    return updatedService;
  }

  async updatePricingAvailability(
    serviceName: string,
    pricingVersion: string,
    newAvailability: 'active' | 'archived',
    fallBackSubscription: FallBackSubscription
  ) {
    const service = await this.serviceRepository.findByName(serviceName);
    const formattedPricingVersion = escapeVersion(pricingVersion);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // If newAvailability is the same as the current one, return the service
    if (
      (newAvailability === 'active' && service.activePricings[formattedPricingVersion]) ||
      (newAvailability === 'archived' &&
        service.archivedPricings &&
        service.archivedPricings[formattedPricingVersion])
    ) {
      return service;
    }

    if (
      newAvailability === 'archived' &&
      Object.keys(service.activePricings).length === 1 &&
      service.activePricings[formattedPricingVersion]
    ) {
      throw new Error(`You cannot archive the last active pricing for service ${serviceName}`);
    }

    if (newAvailability === 'archived' && Object.keys(fallBackSubscription).length === 0) {
      throw new Error(
        `Invalid request: Archiving pricing version ${formattedPricingVersion} of service ${serviceName} cannot be completed. To proceed, you must provide a fallback subscription in the request body. All active contracts will be novated to this new version upon archiving.`
      );
    }

    const pricingLocator =
      service.activePricings[formattedPricingVersion] ?? service.archivedPricings[formattedPricingVersion];

    if (!pricingLocator) {
      throw new Error(`Pricing version ${pricingVersion} not found for service ${serviceName}`);
    }

    let updatedService;

    if (newAvailability === 'active') {
      updatedService = await this.serviceRepository.update(service.name, {
        [`activePricings.${formattedPricingVersion}`]: pricingLocator,
        [`archivedPricings.${formattedPricingVersion}`]: undefined,
      });

      // Emitir evento de cambio de pricing (activación)
      this.eventService.emitPricingActivedMessage(service.name, pricingVersion);
    } else {
      updatedService = await this.serviceRepository.update(service.name, {
        [`activePricings.${formattedPricingVersion}`]: undefined,
        [`archivedPricings.${formattedPricingVersion}`]: pricingLocator,
      });

      // Emitir evento de cambio de pricing (archivado)
      this.eventService.emitPricingArchivedMessage(service.name, pricingVersion);

      if (
        fallBackSubscription &&
        fallBackSubscription.subscriptionPlan === undefined &&
        fallBackSubscription.subscriptionAddOns === undefined
      ) {
        throw new Error(
          `Invalid request: In order to novate contracts to the latest version, the provided fallback subscription must contain at least a subscriptionPlan (if the pricing has plans), and optionally a subset of add-ons. If the pricing do not have plans, the set of add-ons is mandatory.`
        );
      }

      await this._novateContractsToLatestVersion(
        service.name.toLowerCase(),
        escapeVersion(pricingVersion),
        fallBackSubscription
      );
    }

    if (updatedService) {
      resetEscapeVersionInService(updatedService);
    }


    return updatedService;
  }

  async prune() {
    const result = await this.serviceRepository.prune();
    return result;
  }

  async disable(serviceName: string) {
    const service = await this.serviceRepository.findByName(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const contractNovationResult = await this._removeServiceFromContracts(service.name);

    if (!contractNovationResult) {
      throw new Error(`Failed to remove service ${serviceName} from contracts`);
    }

    const result = await this.serviceRepository.disable(service.name);

    this.eventService.emitServiceDisabledMessage(service.name);

    return result;
  }

  async destroyPricing(serviceName: string, pricingVersion: string) {
    const service = await this.serviceRepository.findByName(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    if (service.activePricings[pricingVersion]) {
      throw new Error(
        `Forbidden: You cannot delete an active pricing version ${pricingVersion} for service ${serviceName}. Please archive it first.`
      );
    }

    const pricingLocator = service.archivedPricings[pricingVersion];

    if (!pricingLocator) {
      throw new Error(
        `Invalid request: Pricing archived version ${pricingVersion} not found for service ${serviceName}`
      );
    }

    if (pricingLocator.id) {
      await this.pricingRepository.destroy(pricingLocator.id);
    }

    const result = await this.serviceRepository.update(service.name, {
      [`activePricings.${pricingVersion}`]: undefined,
      [`archivedPricings.${pricingVersion}`]: undefined,
    });

    return result;
  }

  async _novateContractsToLatestVersion(
    serviceName: string,
    pricingVersion: string,
    fallBackSubscription: FallBackSubscription
  ): Promise<void> {
    const serviceContracts: LeanContract[] = await this.contractRepository.findAll({
      serviceName: serviceName,
    });

    if (Object.keys(fallBackSubscription).length === 0) {
      throw new Error(
        `No fallback subscription provided for service ${serviceName}. Novation to new version cannot be performed to affected contracts`
      );
    }

    const pricingVersionContracts: LeanContract[] = serviceContracts.filter(
      contract => contract.contractedServices[serviceName] === pricingVersion
    );

    if (pricingVersionContracts.length === 0) {
      return;
    }

    const serviceLatestPricing = await this._getLatestActivePricing(serviceName);

    if (!serviceLatestPricing) {
      throw new Error(`No active pricing found for service ${serviceName}`);
    }

    const serviceUsageLevels = generateUsageLevels(serviceLatestPricing);

    if (serviceLatestPricing !== null) {
      pricingVersionContracts.forEach(contract => {
        contract.contractedServices[serviceName] = serviceLatestPricing.version;
        contract.subscriptionPlans[serviceName] = fallBackSubscription.subscriptionPlan;
        contract.subscriptionAddOns[serviceName] = fallBackSubscription.subscriptionAddOns;

        try {
          isSubscriptionValidInPricing(
            serviceName,
            {
              contractedServices: contract.contractedServices,
              subscriptionPlans: contract.subscriptionPlans,
              subscriptionAddOns: contract.subscriptionAddOns,
            },
            serviceLatestPricing
          );
        } catch (err) {
          throw new Error(
            `The configuration provided to novate affected contracts is not valid for version ${serviceLatestPricing.version} of service ${serviceName}. Error: ${err}`
          );
        }

        if (serviceUsageLevels) {
          contract.usageLevels[serviceName] = serviceUsageLevels;
        } else {
          delete contract.usageLevels[serviceName];
        }
      });

      const resultNovations = await this.contractRepository.bulkUpdate(pricingVersionContracts);

      if (!resultNovations) {
        throw new Error(`Failed to novate contracts for service ${serviceName}`);
      }
    }
  }

  async _getLatestActivePricing(serviceName: string): Promise<LeanPricing | null> {
    const pricings = await this.indexPricings(serviceName, 'active');

    const sortedPricings = pricings.sort((a, b) => {
      // Sort by createdAt date (descending - newest first)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return 0;
    });

    return sortedPricings.length > 0 ? sortedPricings[0] : null;
  }

  async _getPricingFromUrl(url: string) {
    const isLocalUrl = url.startsWith('public/');
    return parsePricingToSpacePricingObject(
      await (isLocalUrl ? this._getPricingFromPath(url) : this._getPricingFromRemoteUrl(url))
    );
  }

  async _getPricingFromPath(path: string) {
    try {
      const pricing = retrievePricingFromPath(path);
      return pricing;
    } catch (err) {
      throw new Error(`Pricing parsing error: ${(err as Error).message}`);
    }
  }

  async _getPricingFromRemoteUrl(url: string) {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch(url, { agent });
    if (!response.ok) {
      throw new Error(`Failed to fetch pricing from URL: ${url}, status: ${response.status}`);
    }
    const remotePricingYaml = await response.text();
    return retrievePricingFromYaml(remotePricingYaml);
  }

  async _removeServiceFromContracts(serviceName: string): Promise<boolean> {
    const contracts: LeanContract[] = await this.contractRepository.findAll({});
    const novatedContracts: LeanContract[] = [];
    const contractsToDisable: LeanContract[] = [];

    for (const contract of contracts) {
      // Remove this service from the subscription objects
      const newSubscription: Record<string, any> = {
        contractedServices: {},
        subscriptionPlans: {},
        subscriptionAddOns: {},
      };

      // Rebuild subscription objects without the service to be removed
      for (const key in contract.contractedServices) {
        if (key !== serviceName) {
          newSubscription.contractedServices[key] = contract.contractedServices[key];
        }
      }

      for (const key in contract.subscriptionPlans) {
        if (key !== serviceName) {
          newSubscription.subscriptionPlans[key] = contract.subscriptionPlans[key];
        }
      }

      for (const key in contract.subscriptionAddOns) {
        if (key !== serviceName) {
          newSubscription.subscriptionAddOns[key] = contract.subscriptionAddOns[key];
        }
      }

      // Check if objects have the same content by comparing their JSON string representation
      const hasContractChanged =
        JSON.stringify(contract.contractedServices) !==
        JSON.stringify(newSubscription.contractedServices);

      // If objects are equal, skip this contract
      if (!hasContractChanged) {
        continue;
      }

      const newContract = performNovation(contract, newSubscription);

      if (contract.usageLevels[serviceName]) {
        delete contract.usageLevels[serviceName];
      }

      if (Object.keys(newSubscription.contractedServices).length === 0) {
        newContract.usageLevels = {};
        newContract.billingPeriod = {
          startDate: new Date(),
          endDate: new Date(),
          autoRenew: false,
          renewalDays: 0,
        };

        contractsToDisable.push(newContract);
        continue;
      }

      novatedContracts.push(newContract);
    }

    const resultNovations = await this.contractRepository.bulkUpdate(novatedContracts);
    const resultDisables = await this.contractRepository.bulkUpdate(contractsToDisable, true);

    return resultNovations && resultDisables;
  }
}

export default ServiceService;
