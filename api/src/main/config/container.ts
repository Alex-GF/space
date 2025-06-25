// deno-lint-ignore-file no-explicit-any
import process from "node:process";

import { asClass, asValue, AwilixContainer,createContainer } from "awilix";
import dotenv from "dotenv";

import MongooseServiceRepository from "../repositories/mongoose/ServiceRepository.js";
import MongooseUserRepository from "../repositories/mongoose/UserRepository.js";
import MongoosePricingRepository from "../repositories/mongoose/PricingRepository.js";
import MongooseContractRepository from "../repositories/mongoose/ContractRepository.js";
import MongooseAnalyticsRepository from "../repositories/mongoose/AnalyticsRepository.js";

import CacheService from "../services/CacheService.js";
import ServiceService from "../services/ServiceService.js";
import UserService from "../services/UserService.js";
import ContractService from "../services/ContractService.js";
import FeatureEvaluationService from "../services/FeatureEvaluationService.js";
import EventService from "../services/EventService.js";
import AnalyticsService from "../services/AnalyticsService.js";

dotenv.config();

function initContainer(databaseType: string): AwilixContainer {
  const container: AwilixContainer = createContainer();
  let userRepository, serviceRepository, pricingRepository, contractRepository, analyticsRepository;
  switch (databaseType) {
    case "mongoDB":
      userRepository = new MongooseUserRepository();
      serviceRepository = new MongooseServiceRepository();
      pricingRepository = new MongoosePricingRepository();
      contractRepository = new MongooseContractRepository();
      analyticsRepository = new MongooseAnalyticsRepository();
      break;
    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
  container.register({
    userRepository: asValue(userRepository),
    serviceRepository: asValue(serviceRepository),
    pricingRepository: asValue(pricingRepository),
    contractRepository: asValue(contractRepository),
    analyticsRepository: asValue(analyticsRepository),
    userService: asClass(UserService).singleton(),
    serviceService: asClass(ServiceService).singleton(),
    cacheService: asClass(CacheService).singleton(),
    contractService: asClass(ContractService).singleton(),
    analyticsService: asClass(AnalyticsService).singleton(),
    featureEvaluationService: asClass(FeatureEvaluationService).singleton(),
    eventService: asClass(EventService).singleton(),
  });
  return container;
}

let container: AwilixContainer | null = null;
if (!container) { container = initContainer(process.env.DATABASE_TECHNOLOGY ?? "mongoDB"); }

export default container as AwilixContainer;