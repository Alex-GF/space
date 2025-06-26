import type { UsageLevel } from '../../types/models/Contract.js';
import type { LeanPricing } from '../../types/models/Pricing.js';
import { addPeriodToDate, escapeVersion, resetEscapeVersion } from '../helpers.js';

function generateUsageLevels(pricing: LeanPricing): Record<string, UsageLevel> | undefined {
  const serviceUsageLevels: Record<string, UsageLevel> = {};

  if (!pricing.usageLimits) {
    return undefined;
  }

  for (const usageLimit of Object.values(pricing.usageLimits)) {
    const mustBeTracked = usageLimit.period || usageLimit.trackable;

    if (mustBeTracked) {
      if (usageLimit.type === 'RENEWABLE') {
        if (!usageLimit.period) {
          throw new Error(
            `Usage limit ${usageLimit.name} must have a period defined, since it is RENEWABLE`
          );
        }

        let resetTimeStamp = new Date();
        resetTimeStamp = addPeriodToDate(resetTimeStamp, usageLimit.period);

        serviceUsageLevels[usageLimit.name] = {
          resetTimeStamp: resetTimeStamp,
          consumed: 0,
        };
      } else {
        serviceUsageLevels[usageLimit.name] = {
          consumed: 0,
        };
      }
    }
  }
  return Object.keys(serviceUsageLevels).length === 0 ? undefined : serviceUsageLevels;
}

function escapeContractedServiceVersions(contractedServices: Record<string, string>): Record<string, string> {
  const escapedServices: Record<string, string> = {};
  
  for (const [serviceName, version] of Object.entries(contractedServices)) {
    const escapedVersion = escapeVersion(version);
    escapedServices[serviceName] = escapedVersion;
  }

  return escapedServices;
}

function resetEscapeContractedServiceVersions(escapedServices: Record<string, string>): Record<string, string> {
  const contractedServices: Record<string, string> = {};
  
  for (const [serviceName, escapedVersion] of Object.entries(escapedServices)) {
    const version = resetEscapeVersion(escapedVersion);
    contractedServices[serviceName] = version;
  }

  return contractedServices;
}

export {generateUsageLevels, escapeContractedServiceVersions, resetEscapeContractedServiceVersions}