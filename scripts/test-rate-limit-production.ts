import https from "node:https";

const TOTAL_REQUESTS = 200;
const CONCURRENT_REQUESTS = 50;

const BASE_URL =
  process.env.RATE_LIMIT_URL ??
  "https://space.score.us.es/api/v1/healthcheck";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function makeRequest(): Promise<number> {
  return new Promise((resolve) => {
    const req = https.get(BASE_URL, (res) => {
      resolve(res.statusCode ?? 0);
      res.resume();
    });

    req.on("error", () => {
      resolve(0);
    });
  });
}

async function runBatch(size: number): Promise<number[]> {
  return Promise.all(
    Array.from({ length: size }, () => makeRequest())
  );
}

async function main(): Promise<void> {
  const results: number[] = [];

  for (
    let i = 0;
    i < TOTAL_REQUESTS;
    i += CONCURRENT_REQUESTS
  ) {
    const batch = await runBatch(CONCURRENT_REQUESTS);
    results.push(...batch);
  }

  const grouped = results.reduce<Record<number, number>>(
    (acc, code) => {
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    },
    {}
  );

  console.log("Response distribution:");
  console.log(grouped);

  const has429 = (grouped[429] ?? 0) > 0;
  const has200 = (grouped[200] ?? 0) > 0;

  if (!has429) {
    console.error(
      "Rate limiting did not trigger any 429 responses."
    );

    process.exit(1);
  }

  if (!has200) {
    console.error(
      "All requests failed. Backend may be unhealthy."
    );

    process.exit(1);
  }

  console.log("Rate limiting is working.");
}

main();