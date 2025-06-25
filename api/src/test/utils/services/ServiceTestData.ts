import path from 'node:path';

const githubPricingPath = path.resolve(__dirname, '../../data/pricings/github-2025.yml');
const clockifyPricingPath = path.resolve(__dirname, '../../data/pricings/clockify-2025.yml');
const zoomPricingPath = path.resolve(__dirname, '../../data/pricings/zoom-2025.yml');

export {
  githubPricingPath,
  clockifyPricingPath,
  zoomPricingPath,
};