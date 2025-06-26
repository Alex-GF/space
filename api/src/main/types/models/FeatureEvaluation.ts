import type { LeanPricingFeature } from './Pricing.js';

export interface LeanFeature {
  info: LeanPricingFeature;
  service: string;
  pricingVersion: string;
}

export interface FeatureIndexQueryParams {
  featureName?: string;
  serviceName?: string;
  pricingVersion?: string;
  page?: number;
  offset?: number;
  limit?: number;
  sort?: 'featureName' | 'serviceName';
  order?: 'asc' | 'desc';
  show?: 'active' | 'archived' | 'all';
}

export interface FeatureEvalQueryParams {
  details?: boolean;
  server?: boolean;
  returnContexts?: boolean;
}

export type SimpleFeatureEvaluation = Record<string, boolean>;

export type DetailedFeatureEvaluation = Record<string, FeatureEvaluationResult>;

export type PricingContext = {features: Record<string, string | boolean>, usageLimits: Record<string, number | boolean>};

export type SubscriptionContext = Record<string, number>;

export type EvaluationContext = Record<string, string>;

export interface FeatureEvaluationResult {
  eval: boolean;
  used: Record<string, number | boolean> | null;
  limit: Record<string, number | boolean> | null;
  error: {
    code: string;
    message: string;
  } | null;
}

export type SingleFeatureEvalQueryParams = Omit<FeatureEvalQueryParams, "details"> & {revert?: boolean, latest?: boolean};