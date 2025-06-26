import container from '../config/container.js';
import { removeOptionalFieldsOfQueryParams } from '../utils/controllerUtils.js';
import FeatureEvaluationService from '../services/FeatureEvaluationService.js';
import type { FeatureEvalQueryParams, FeatureEvaluationResult, FeatureIndexQueryParams, SingleFeatureEvalQueryParams } from '../types/models/FeatureEvaluation.js';

class FeatureEvaluationController {
  private readonly featureEvaluationService: FeatureEvaluationService;

  constructor() {
    this.featureEvaluationService = container.resolve('featureEvaluationService');
    this.index = this.index.bind(this);
    this.eval = this.eval.bind(this);
    this.generatePricingToken = this.generatePricingToken.bind(this);
    this.evalFeature = this.evalFeature.bind(this);
  }

  async index(req: any, res: any) {
    try {
      const queryParams: FeatureIndexQueryParams = this._transformIndexQueryParams(req.query);

      const features = await this.featureEvaluationService.index(queryParams);
      res.json(features);
    } catch (err: any) {
      res.status(500).send({ error: err.message });
    }
  }

  async eval(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const options = this._transformEvalQueryParams(req.query);
      const featureEvaluation = await this.featureEvaluationService.eval(userId, options);
      res.json(featureEvaluation);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      }else if (err.message.toLowerCase().includes('invalid')) {
        res.status(400).send({ error: err.message });
      }else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async generatePricingToken(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const options = this._transformGenerateTokenQueryParams(req.query);
      const token = await this.featureEvaluationService.generatePricingToken(userId, options);
      res.json({pricingToken: token});
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      }else if (err.message.toLowerCase().includes('invalid')) {
        res.status(400).send({ error: err.message });
      }else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async evalFeature(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const featureId = req.params.featureId;
      const expectedConsumption = req.body ?? {};
      const options = this._transformFeatureEvalQueryParams(req.query);
      const featureEvaluation: boolean | FeatureEvaluationResult = await this.featureEvaluationService.evalFeature(userId, featureId, expectedConsumption, options);

      if (typeof featureEvaluation === 'boolean') {
        res.status(204).json("Usage level reset successfully");
      }else{
        res.json(featureEvaluation);
      }
    }
    catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      }else if (err.message.toLowerCase().includes('invalid')) {
        res.status(400).send({ error: err.message });
      }else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  _transformIndexQueryParams(
    indexQueryParams: Record<string, string | number>
  ): FeatureIndexQueryParams {
    const transformedData: FeatureIndexQueryParams = {
      featureName: indexQueryParams['featureName'] as string,
      serviceName: indexQueryParams['serviceName'] as string,
      pricingVersion: indexQueryParams['pricingVersion'] as string,
      page: parseInt(indexQueryParams['page'] as string) || 1,
      offset: parseInt(indexQueryParams['offset'] as string) || 0,
      limit: parseInt(indexQueryParams['limit'] as string) || 20,
      sort: indexQueryParams.sort as 'featureName' | 'serviceName',
      order: (indexQueryParams.order as 'asc' | 'desc') || 'asc',
      show: indexQueryParams.show as 'active' | 'archived' | 'all',
    };

    const optionalFields: string[] = Object.keys(transformedData);

    removeOptionalFieldsOfQueryParams(transformedData, optionalFields);

    return transformedData;
  }

  _transformEvalQueryParams(
    indexQueryParams: Record<string, string | number>
  ): FeatureEvalQueryParams {
    const transformedData: FeatureEvalQueryParams = {
      details: indexQueryParams['details'] === "true",
      server: indexQueryParams['server'] === "true",
    };

    return transformedData;
  }

  _transformGenerateTokenQueryParams(
    indexQueryParams: Record<string, string | number>
  ): {server: boolean} {
    const transformedData: {server: boolean} = {
      server: indexQueryParams['server'] === "true",
    };

    return transformedData;
  }

  _transformFeatureEvalQueryParams(
    queryParams: Record<string, string | number>
  ): SingleFeatureEvalQueryParams {
    const transformedData: SingleFeatureEvalQueryParams = {
      server: queryParams['server'] === "true",
      revert: queryParams['revert'] === "true",
      latest: queryParams['latest'] === "true",
    };

    return transformedData;
  }
}

export default FeatureEvaluationController;
