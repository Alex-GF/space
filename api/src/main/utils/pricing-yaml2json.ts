import { Plan as ParsedPlan, Pricing as ParsedPricing, Feature as ParsedFeature, UsageLimit as ParsedUsageLimit, AddOn as ParsedAddOn} from "pricing4ts";

import { validateLegalKeysInObject } from "../controllers/validation/ServiceValidation.js";
import type { LeanAddOn, LeanPricingFeature, LeanPlan, LeanUsageLimit, ExpectedPricingType } from "../types/models/Pricing.js";
import { escapeVersion } from "./helpers.js";

export function parsePricingToSpacePricingObject(pricing: ParsedPricing): ExpectedPricingType {
  const json: ExpectedPricingType = {} as ExpectedPricingType;
  
  validateLegalKeysInObject(pricing.features, "features");
  validateLegalKeysInObject(pricing.usageLimits || {}, "usageLimits");
  validateLegalKeysInObject(pricing.plans || {}, "plans");
  validateLegalKeysInObject(pricing.addOns || {}, "addOns");

  json.version = escapeVersion(pricing.version);
  json.currency = pricing.currency;
  json.createdAt = pricing.createdAt;
  json.features = formatPricingFeatures(pricing.features);
  json.usageLimits = formatPricingUsageLimits(pricing.usageLimits ?? {});
  json.plans = formatPricingPlans(pricing.plans ?? {});
  json.addOns = formatPricingAddOns(pricing.addOns ?? {});

  return json;
}

function formatPricingFeatures(features: Record<string, ParsedFeature>): Record<string, LeanPricingFeature> {
  const formattedFeatures: Record<string, LeanPricingFeature> = {};
  for (const featureName in features) {
    const feature = features[featureName];
    formattedFeatures[featureName] = {
      ...feature,
      value: feature.value as string | boolean | undefined,
      defaultValue: feature.defaultValue as string | boolean,
    };
  }
  return formattedFeatures;
}

function formatPricingUsageLimits(usageLimits: Record<string, ParsedUsageLimit>): Record<string, LeanUsageLimit> {
  const formattedUsageLimits: Record<string, LeanUsageLimit> = {};
  for (const usageLimitName in usageLimits) {
    const usageLimit = usageLimits[usageLimitName];
    formattedUsageLimits[usageLimitName] = {
      ...usageLimit,
      valueType: usageLimit.valueType as "BOOLEAN" | "NUMERIC",
      type: usageLimit.type as "RENEWABLE" | "NON_RENEWABLE",
      value: usageLimit.value as number | boolean | undefined,
      defaultValue: usageLimit.defaultValue as number | boolean,
    };
  }
  return formattedUsageLimits;
}

function formatPricingPlans(plans: Record<string, ParsedPlan>): Record<string, LeanPlan> {
  const formattedPlans: Record<string, LeanPlan> = {};

  for (const planName in plans) {
    const plan = plans[planName];
    formattedPlans[planName] = {
      ...plan,
      features: Object.fromEntries(
        Object.entries(plan.features).map(([key, feature]) => [key, ((feature.value ?? feature.defaultValue) as string | boolean)])
      ),
      usageLimits: plan.usageLimits
        ? Object.fromEntries(
            Object.entries(plan.usageLimits).map(([key, usageLimit]) => [key, ((usageLimit.value ?? usageLimit.defaultValue) as number | boolean)])
          )
        : undefined,
    };
  }

  return formattedPlans;

}

function formatPricingAddOns(addOns: Record<string, ParsedAddOn>): Record<string, LeanAddOn> {
  const formattedAddOns: Record<string, LeanAddOn> = {};

  for (const addOnName in addOns) {
    const addOn = addOns[addOnName];
    formattedAddOns[addOnName] = {
      ...addOn,
      price: addOn.price as string | number,
      features: addOn.features ? Object.fromEntries(
        Object.entries(addOn.features).map(([key, feature]) => [key, (feature.value as string | boolean)])
      ) : undefined,
      usageLimits: addOn.usageLimits
        ? Object.fromEntries(
            Object.entries(addOn.usageLimits).map(([key, usageLimit]) => [key, (usageLimit.value as number | boolean)])
          )
        : undefined,
      usageLimitsExtensions: addOn.usageLimitsExtensions
        ? Object.fromEntries(
            Object.entries(addOn.usageLimitsExtensions).map(([key, usageLimit]) => [key, (usageLimit.value as number)])
          )
        : undefined,
    };
  }
  return formattedAddOns;
}