
import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { correlateRisks } from "./riskCorrelationService";

describe("Hyperion risk correlation benchmark", () => {
  it("measures processing time for 20,000 assets", () => {
    const count = 20_000;

    const identities = Array.from({ length: count }, (_, i) => ({
      id: `user-${i}`,
      privileged: i % 10 === 0,
    }));

    const assets = Array.from({ length: count }, (_, i) => ({
      id: `asset-${i}`,
      internetExposed: true,
    }));

    const vulnerabilities = Array.from({ length: count }, (_, i) => ({
      id: `finding-${i}`,
      assetId: `asset-${i}`,
      severity: "High" as const,
      description: "Synthetic benchmark finding",
    }));

    const access = Array.from({ length: count }, (_, i) => ({
      identityId: `user-${i}`,
      assetId: `asset-${i}`,
      accessVerified: true,
    }));

    // Warm up the function before measuring.
    correlateRisks(identities, assets, vulnerabilities, access);

    const runs = 30;
    const timings: number[] = [];
    let resultCount = 0;

    for (let i = 0; i < runs; i++) {
      const start = performance.now();

      const results = correlateRisks(
        identities,
        assets,
        vulnerabilities,
        access,
      );

      timings.push(performance.now() - start);
      resultCount = results.length;
    }

    timings.sort((a, b) => a - b);

const middle = Math.floor(timings.length / 2);

const medianMs =
  timings.length % 2 === 1
    ? timings[middle]
    : (timings[middle - 1] + timings[middle]) / 2;

const minMs = timings[0];
const maxMs = timings[timings.length - 1];

const p95Index = Math.ceil(timings.length * 0.95) - 1;
const p95Ms = timings[p95Index];

    console.log("Benchmark assets:", count);
    console.log("Benchmark runs:", runs);
    console.log("Findings returned:", resultCount);
    console.log("Median engine time (ms):", medianMs.toFixed(3));
    console.log("Minimum engine time (ms):", minMs.toFixed(3));
    console.log("Maximum engine time (ms):", maxMs.toFixed(3));
    console.log("P95 engine time (ms):", p95Ms.toFixed(3));
    console.log("All run times (ms):", timings.map(
      (time) => time.toFixed(3),
    ));

    expect(resultCount).toBe(count);
    expect(Number.isFinite(medianMs)).toBe(true);
    expect(medianMs).toBeGreaterThanOrEqual(0);
  });
});
