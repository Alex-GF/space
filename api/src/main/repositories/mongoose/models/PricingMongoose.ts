import mongoose, { Schema } from 'mongoose';

import Feature from './schemas/Feature.js';
import UsageLimit from './schemas/UsageLimit.js';
import Plan from './schemas/Plan.js';
import AddOn from './schemas/AddOn.js';

const pricingSchema = new Schema(
  {
    _serviceName: { type: String },
    version: { type: String, required: true },
    currency: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now },
    features: { type: Map, of: Feature, required: true },
    usageLimits: { type: Map, of: UsageLimit },
    plans: { type: Map, of: Plan },
    addOns: { type: Map, of: AddOn },
  },
  {
    toJSON: {
      virtuals: true,
      transform: function (doc, resultObject, options) {
        delete resultObject._id;
        delete resultObject.__v;
        delete resultObject._serviceName;
        delete resultObject.id;
        
        return resultObject;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, resultObject, options) {
        delete resultObject._id;
        delete resultObject.__v;

        return resultObject;
      },
    }
  }
);

pricingSchema.virtual('service', {
  ref: 'Service',
  localField: '_serviceName',
  foreignField: '_id',
  justOne: true,
});

// Adding unique index for [name, owner, version]
pricingSchema.index({ _serviceName: 1, version: 1 }, { unique: true });

const pricingModel = mongoose.model('Pricing', pricingSchema, 'pricings');

export default pricingModel;
