import { addDays } from "date-fns";

import type { LeanContract } from "../../types/models/Contract.js";
import { escapeContractedServiceVersions } from "./helpers.js";

export function performNovation(contract: LeanContract, newSubscription: any): LeanContract {
  const newContract: LeanContract = {
    ...contract,
    contractedServices: escapeContractedServiceVersions(newSubscription.contractedServices),
    subscriptionPlans: newSubscription.subscriptionPlans,
    subscriptionAddOns: newSubscription.subscriptionAddOns,
  };

  newContract.history.push({
    startDate: contract.billingPeriod.startDate,
    endDate: new Date(),
    contractedServices: contract.contractedServices,
    subscriptionPlans: contract.subscriptionPlans,
    subscriptionAddOns: contract.subscriptionAddOns,
  });

  const startDate = new Date();
  const renewalDays = newContract.billingPeriod?.renewalDays ?? 30; // Default to 30 days if not provided
  const endDate = addDays(new Date(startDate), renewalDays);

  newContract.billingPeriod = {
    startDate: startDate,
    endDate: endDate,
    autoRenew: newSubscription.billingPeriod?.autoRenew ?? contract.billingPeriod.autoRenew,
    renewalDays: renewalDays,
  };

  return newContract;
}