import { describe, it, expect } from 'vitest';
import { evaluateFeature } from '../main/utils/feature-evaluation/featureEvaluation';
import type {
  EvaluationContext,
  FeatureEvaluationResult,
  PricingContext,
  SubscriptionContext,
} from '../main/types/models/FeatureEvaluation';

/**
 * An expected consumption of zero.
 *
 * A caller who provides `expectedConsumption` must provide it for every limit
 * involved in the feature's evaluation, or be refused. So the only way to say
 * "this limit takes part in the evaluation but this call does not spend it" is
 * to pass zero - which two falsy checks rejected as if the limit had been left
 * out altogether.
 *
 * The second of those checks also refused a perfectly ordinary positive
 * consumption, whenever the current usage level happened to be zero: a brand
 * new contract, or the first call of a renewal period.
 */

const FEATURE = 'petclinic-pets';
const LIMIT = 'petclinic-maxPets';

const EXPRESSION = `subscriptionContext['${LIMIT}'] < pricingContext['usageLimits']['${LIMIT}']`;

const pricingContext: PricingContext = {
  features: { [FEATURE]: true },
  usageLimits: { [LIMIT]: 10 },
};

const evaluationContext: EvaluationContext = { [FEATURE]: EXPRESSION };

/** @param usageLevel what the contract has consumed so far. */
async function evaluate(usageLevel: number, expectedConsumption?: Record<string, number>) {
  const subscriptionContext: SubscriptionContext = { [LIMIT]: usageLevel };

  return (await evaluateFeature(FEATURE, pricingContext, subscriptionContext, evaluationContext, {
    simple: false,
    expectedConsumption,
    // No userId, so nothing is written: this is about the verdict, not the
    // bookkeeping that follows it.
  })) as FeatureEvaluationResult;
}

describe('expectedConsumption of zero', () => {
  it('is accepted, and leaves the usage level where it was', async () => {
    const result = await evaluate(5, { [LIMIT]: 0 });

    expect(result.error).toBeNull();
    expect(result.eval).toBe(true);
    expect(result.used).toEqual({ [LIMIT]: 5 });
  });

  it('is accepted on a contract that has consumed nothing yet', async () => {
    // Both zeroes at once: the usage level and the consumption. This is the
    // case a `!updatedUsageLevel` check gets wrong even after `0 + 0` has been
    // computed correctly.
    const result = await evaluate(0, { [LIMIT]: 0 });

    expect(result.error).toBeNull();
    expect(result.used).toEqual({ [LIMIT]: 0 });
  });

  it('is not reported as a missing value', async () => {
    const result = await evaluate(0, { [LIMIT]: 0 });

    expect(result.error?.code).not.toBe('INVALID_EXPECTED_CONSUMPTION');
  });
});

describe('expectedConsumption on an untouched usage level', () => {
  it('adds to a usage level of zero', async () => {
    // Not about zero consumption at all: a plain consumption of 1 on a brand
    // new contract. `1` is truthy, but only because the addition happens to
    // leave a truthy total.
    const result = await evaluate(0, { [LIMIT]: 1 });

    expect(result.error).toBeNull();
    expect(result.used).toEqual({ [LIMIT]: 1 });
  });

  it('adds to a non-zero usage level, as before', async () => {
    const result = await evaluate(5, { [LIMIT]: 3 });

    expect(result.used).toEqual({ [LIMIT]: 8 });
  });
});

describe('expectedConsumption that really is missing', () => {
  it('is still refused when the limit is left out', async () => {
    const result = await evaluate(5, { 'petclinic-someOtherLimit': 1 });

    expect(result.error?.code).toBe('INVALID_EXPECTED_CONSUMPTION');
  });

  it('reports the current usage level when no consumption is given at all', async () => {
    const result = await evaluate(5, undefined);

    expect(result.error).toBeNull();
    expect(result.used).toEqual({ [LIMIT]: 5 });
  });

  it('treats an empty object as no consumption', async () => {
    const result = await evaluate(5, {});

    expect(result.error).toBeNull();
    expect(result.used).toEqual({ [LIMIT]: 5 });
  });
});
