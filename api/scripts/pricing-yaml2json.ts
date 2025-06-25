import * as fs from "fs";
import * as path from "path";
import { retrievePricingFromPath } from "pricing4ts/server";

import { parsePricingToSpacePricingObject } from "../src/main/utils/pricing-yaml2json";
import type { ExpectedPricingType } from "../src/main/types/models/Pricing";

const pricing = retrievePricingFromPath("./public/test-pricings/zoom/2024.yml");

const json: ExpectedPricingType = parsePricingToSpacePricingObject(pricing);

const outputDir = path.resolve(__dirname, "./output");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, pricing.saasName.split(" ")[0] + ".json");

fs.writeFileSync(outputPath, JSON.stringify(json, null, 2), "utf-8");

console.log(`JSON has been written to ${outputPath}`);