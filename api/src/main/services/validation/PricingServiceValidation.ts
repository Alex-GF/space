import type { ExpectedPricingType } from "../../types/models/Pricing.js";

function validatePricingData(pricingData: ExpectedPricingType): string[] {
  const errors: string[] = [];
  const requiredFields: (keyof ExpectedPricingType)[] = ["version", "currency", "createdAt", "features"];

  requiredFields.forEach((field) => {
    if (!pricingData[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Ensure that Mixed types are handled correctly
  if (pricingData.plans){
    Object.values(pricingData.plans).forEach((plan) => {
      if (typeof plan.price !== "number" && typeof plan.price !== "string") {
        errors.push(`Invalid price for plan: ${plan.name}. Only number or string allowed.`);
      }
    });
  }

  if (pricingData.addOns){
    Object.values(pricingData.addOns).forEach((addOn) => {
      if (typeof addOn.price !== "number" && typeof addOn.price !== "string") {
        errors.push(`Invalid price for addOn: ${addOn.name}. Only number or string allowed.`);
      }
    });
  }

  return errors;
}

export {validatePricingData};