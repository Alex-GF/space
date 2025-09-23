import axios from '@/lib/axios';
import type { Pricing, RetrievedService, Service } from '@/types/Services';
import { isAfter } from 'date-fns';

const DEFAULT_TIMEOUT = 5000;

export async function getServices(
  apiKey: string,
  filters: Record<string, boolean | number | string> = {}
) {
  return axios
    .get('/services', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      params: filters,
      timeout: DEFAULT_TIMEOUT,
    })
    .then(async response => {
      return await Promise.all(
        response.data.map(async (service: RetrievedService) => {
          return await _retrievePricingsFromService(apiKey, service.name);
        })
      );
    })
    .catch(error => {
      console.error('Error fetching services:', error);
      throw new Error('Failed to fetch services. Please try again later.');
    });
}

export async function getPricingsFromService(
  apiKey: string,
  serviceName: string,
  pricingStatus: 'active' | 'archived' = 'active'
): Promise<Pricing[]> {
  return axios
    .get(`/services/${serviceName}/pricings?pricingStatus=${pricingStatus}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(response => {
      return response.data;
    })
    .catch(() => {
      throw new Error(
        `Failed to retrieve pricings for service ${serviceName}. Please try again later.`
      );
    });
}

export async function changePricingAvailability(
  apiKey: string,
  serviceName: string,
  version: string,
  to: 'active' | 'archived'
) {
  const servicePricings = await getPricingsFromService(apiKey, serviceName, 'active');
  const mostRecentVersion = servicePricings.reduce((max, pricing) => {
    return isAfter(pricing.createdAt, max.createdAt) ? pricing : max;
  });

  const fallbackSubscriptionPlan = mostRecentVersion.plans
    ? Object.keys(mostRecentVersion.plans)[0]
    : undefined;

  if (!fallbackSubscriptionPlan && !mostRecentVersion.addOns) {
    throw new Error(`No subscription plan found for service ${serviceName} version ${version}.`);
  }

  return axios
    .put(
      `/services/${serviceName}/pricings/${version}?availability=${to}`,
      {
        subscriptionPlan: fallbackSubscriptionPlan,
        subscriptionAddOns: !fallbackSubscriptionPlan
          ? { [Object.keys(mostRecentVersion.addOns!)[0]]: 1 }
          : undefined,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        timeout: DEFAULT_TIMEOUT,
      }
    )
    .then(response => {
      return response.data;
    })
    .catch(error => {
      throw new Error(
        `Failed to change availability for pricing version ${version} in service ${serviceName}. Error: ${
          error.response?.data?.error || error.message
        }`
      );
    });
}

export async function createService(apiKey: string, iPricing: File | string): Promise<Service> {
  // If a File is provided, send multipart/form-data; if a string (URL) is provided, send JSON payload
  if (typeof iPricing === 'string') {
    return axios
      .post(
        '/services',
        { pricing: iPricing },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          timeout: DEFAULT_TIMEOUT,
        }
      )
      .then(async response => response.data as Service)
      .catch(error => {
        throw new Error('Failed to create service. Error: ' + (error.response?.data?.error || error.message));
      });
  }

  const formData = new FormData();
  formData.append('pricing', iPricing);

  return axios
    .post('/services', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(async response => response.data as Service)
    .catch(error => {
      throw new Error('Failed to create service. Error: ' + (error.response?.data?.error || error.message));
    });
}

export async function addPricingVersion(apiKey: string, serviceName: string, iPricing: File | string): Promise<Service> {
  if (typeof iPricing === 'string') {
    return axios
      .post(
        `/services/${serviceName}/pricings`,
        { pricing: iPricing },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          timeout: DEFAULT_TIMEOUT,
        }
      )
      .then(response => response.data as Service)
      .catch(error => {
        throw new Error('Failed to create pricing version. Error: ' + (error.response?.data?.error || error.message));
      });
  }

  const formData = new FormData();
  formData.append('pricing', iPricing);

  return axios
    .post(`/services/${serviceName}/pricings`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then(async response => response.data as Service)
    .catch(error => {
      throw new Error('Failed to create pricing version. Error: ' + (error.response?.data?.error || error.message));
    });
}

export async function disableService(apiKey: string, serviceName: string): Promise<boolean> {
  return axios
    .delete(`/services/${serviceName}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then((response) => {
      return response.status === 204;
    })
    .catch(error => {
      throw new Error(
        `Failed to disable service ${serviceName}. Error: ${
          error.response?.data?.error || error.message
        }`
      );
    });
}

export async function deletePricingVersion(apiKey: string, serviceName: string, version: string): Promise<boolean> {
  return axios
    .delete(`/services/${serviceName}/pricings/${version}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: DEFAULT_TIMEOUT,
    })
    .then((response) => {
      return response.status === 204;
    })
    .catch(error => {
      throw new Error(
        `Failed to delete pricing version ${version} for service ${serviceName}. Error: ${
          error.response?.data?.error || error.message
        }`
      );
    });
}

async function _retrievePricingsFromService(apiKey: string, serviceName: string): Promise<Service> {
  const [serviceActivePricings, serviceArchivedPricings] = await Promise.all([
    getPricingsFromService(apiKey, serviceName, 'active'),
    getPricingsFromService(apiKey, serviceName, 'archived'),
  ]);

  const mapPricings = (pricings: Pricing[]) =>
    pricings.reduce((acc: Record<string, Pricing>, pricing) => {
      acc[pricing.version] = pricing;
      return acc;
    }, {});

  return {
    name: serviceName,
    activePricings: mapPricings(serviceActivePricings),
    archivedPricings: serviceArchivedPricings ? mapPricings(serviceArchivedPricings) : {},
  };
}
