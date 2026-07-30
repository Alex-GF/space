import { describe, it, expect, beforeEach, vi } from 'vitest';
import container from '../main/config/container';

/**
 * Applying expected consumption to more than one usage limit.
 *
 * Each application reads the whole contract, increments one usage level in its
 * own copy, and writes the whole contract back. Doing that once per limit -
 * concurrently, as `evaluateFeature` did - means every application starts from
 * the same state and only the last write survives, so an evaluation touching
 * two limits recorded one of them.
 *
 * These tests work against stubbed repository and cache so they can assert on
 * the reads and writes themselves, which is where the defect lives.
 */

function aContract() {
  return {
    userContact: { userId: 'user1', username: 'user1' },
    contractedServices: { petclinic: '2025' },
    subscriptionPlans: { petclinic: 'BASIC' },
    usageLevels: {
      petclinic: {
        maxPets: { consumed: 0 },
        maxVisits: { consumed: 0 },
      },
    },
  };
}

function withStubs(contract: any) {
  // The repository hands back a *copy* on read and keeps whatever it is given,
  // exactly as a database does - which is what makes a lost update visible.
  const state = { current: contract };
  let writes = 0;
  let reads = 0;

  const contractRepository = {
    findByUserId: vi.fn(async () => {
      reads += 1;
      return JSON.parse(JSON.stringify(state.current));
    }),
    update: vi.fn(async (_userId: string, updated: any) => {
      writes += 1;
      state.current = JSON.parse(JSON.stringify(updated));
      return state.current;
    }),
  };

  const cacheService = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
  };

  const original = container.resolve.bind(container);
  vi.spyOn(container, 'resolve').mockImplementation((name: any) => {
    if (name === 'contractRepository') return contractRepository as any;
    if (name === 'cacheService') return cacheService as any;
    return original(name);
  });

  return { state, contractRepository, cacheService, counts: () => ({ reads, writes }) };
}

async function aService() {
  const { default: ContractService } = await import('../main/services/ContractService');
  return new (ContractService as any)();
}

describe('Applying expected consumption to several limits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('records every limit, not just the last one written', async () => {
    const stubs = withStubs(aContract());
    const service = await aService();

    await service._applyExpectedConsumptions('user1', {
      'petclinic-maxPets': 1,
      'petclinic-maxVisits': 3,
    });

    expect(stubs.state.current.usageLevels.petclinic.maxPets.consumed).toBe(1);
    expect(stubs.state.current.usageLevels.petclinic.maxVisits.consumed).toBe(3);
  });

  it('reads and writes the contract once however many limits there are', async () => {
    // Not only correctness: one round trip instead of one per limit.
    const stubs = withStubs(aContract());
    const service = await aService();

    await service._applyExpectedConsumptions('user1', {
      'petclinic-maxPets': 1,
      'petclinic-maxVisits': 1,
    });

    expect(stubs.counts()).toEqual({ reads: 1, writes: 1 });
  });

  it('pins why the batch method exists: one call per limit still races', async () => {
    // This is what `evaluateFeature` used to do - one call per limit, in
    // parallel - and it is still lossy, because read-modify-write on a whole
    // document cannot be made safe by calling it more carefully.
    //
    // Asserted rather than fixed here so nobody simplifies the call site back
    // to Promise.all: the read-modify-write itself would have to become an
    // atomic $inc for that to be safe, which is a larger change than this one.
    const stubs = withStubs(aContract());
    const service = await aService();

    await Promise.all([
      service._applyExpectedConsumption('user1', 'petclinic-maxPets', 1),
      service._applyExpectedConsumption('user1', 'petclinic-maxVisits', 1),
    ]);

    const levels = stubs.state.current.usageLevels.petclinic;
    const recorded = levels.maxPets.consumed + levels.maxVisits.consumed;
    expect(recorded, 'one increment is lost, which is the point').toBe(1);
  });

  it('still applies a single limit', async () => {
    const stubs = withStubs(aContract());
    const service = await aService();

    await service._applyExpectedConsumption('user1', 'petclinic-maxPets', 2);

    expect(stubs.state.current.usageLevels.petclinic.maxPets.consumed).toBe(2);
  });

  it('does nothing at all when given nothing', async () => {
    const stubs = withStubs(aContract());
    const service = await aService();

    await service._applyExpectedConsumptions('user1', {});

    expect(stubs.counts()).toEqual({ reads: 0, writes: 0 });
  });

  it('refuses the whole request when one limit does not exist', async () => {
    // Rather than applying the valid ones and then throwing, which would leave
    // the contract half-updated.
    const stubs = withStubs(aContract());
    const service = await aService();

    await expect(
      service._applyExpectedConsumptions('user1', {
        'petclinic-maxPets': 1,
        'petclinic-nosuchlimit': 1,
      })
    ).rejects.toThrow(/not found in contract/);

    expect(stubs.state.current.usageLevels.petclinic.maxPets.consumed).toBe(0);
    expect(stubs.counts().writes).toBe(0);
  });

  it('keeps the previous value of every limit for reverting', async () => {
    const stubs = withStubs(aContract());
    const service = await aService();

    await service._applyExpectedConsumptions('user1', {
      'petclinic-maxPets': 1,
      'petclinic-maxVisits': 1,
    });

    const cachedKeys = stubs.cacheService.set.mock.calls.map((call: any[]) => call[0]);
    expect(cachedKeys.some((key: string) => key.includes('maxPets'))).toBe(true);
    expect(cachedKeys.some((key: string) => key.includes('maxVisits'))).toBe(true);
  });
});
