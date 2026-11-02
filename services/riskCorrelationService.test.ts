
import { describe, it, expect } from "vitest";
import { correlateRisks } from "./riskCorrelationService";

describe("Hyperion Cross-Domain Risk Correlation", () => {
  it("detects combined identity, cloud and vulnerability risk", () => {
    const results = correlateRisks(
      [
        {
          id: "user-104",
          name: "Test Admin",
          privileged: true,
        },
      ],
      [
        {
          id: "cloud-vm-22",
          name: "Test Cloud Server",
          internetExposed: true,
        },
      ],
      [
        {
          id: "finding-9001",
          assetId: "cloud-vm-22",
          severity: "Critical",
          description: "Example critical vulnerability",
          cve: "CVE-EXAMPLE",
        },
      ],
      [
        {
          identityId: "user-104",
          assetId: "cloud-vm-22",
          accessVerified: true,
        },
      ],
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(95);
    expect(results[0].severity).toBe("Critical");
    expect(results[0].domains).toContain("Identity Security");
    expect(results[0].domains).toContain("Cloud Security");
    expect(results[0].domains).toContain(
      "Vulnerability Management",
    );
  });
  
  it("scores a high vulnerability without privileged access at 60", () => {
    const results = correlateRisks(
      [],
      [{ id: "asset-2", internetExposed: true }],
      [{
        id: "vuln-2",
        assetId: "asset-2",
        severity: "High",
        description: "High severity test",
      }],
      [],
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(60);
    expect(results[0].severity).toBe("Medium");
    expect(results[0].affectedIdentities).toHaveLength(0);
  });

  it("does not report an asset that is not internet-exposed", () => {
    const results = correlateRisks(
      [],
      [{ id: "asset-3", internetExposed: false }],
      [{
        id: "vuln-3",
        assetId: "asset-3",
        severity: "Critical",
        description: "Critical test",
      }],
      [],
    );

    expect(results).toHaveLength(0);
  });

  it("does not report an asset with only medium severity vulnerabilities", () => {
    const results = correlateRisks(
      [],
      [{ id: "asset-4", internetExposed: true }],
      [{
        id: "vuln-4",
        assetId: "asset-4",
        severity: "Medium",
        description: "Medium severity test",
      }],
      [],
    );

    expect(results).toHaveLength(0);
  });
  it("does not report a risk when access is unverified", () => {
    const results = correlateRisks(
      [
        { id: "user-1", privileged: true },
      ],
      [
        { id: "asset-1", internetExposed: true },
      ],
      [
        {
          id: "finding-1",
          assetId: "asset-1",
          severity: "Critical",
          description: "Synthetic test vulnerability",
        },
      ],
      [
        {
          identityId: "user-1",
          assetId: "asset-1",
          accessVerified: false,
        },
      ],
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(75);
    expect(results[0].affectedIdentities).toHaveLength(0);
    expect(results[0].domains).not.toContain("Identity Security");
  });

  it("ignores access relationships to unknown identities", () => {
    const results = correlateRisks(
      [],
      [
        { id: "asset-1", internetExposed: true },
      ],
      [
        {
          id: "finding-1",
          assetId: "asset-1",
          severity: "High",
          description: "Synthetic test vulnerability",
        },
      ],
      [
        {
          identityId: "unknown-user",
          assetId: "asset-1",
          accessVerified: true,
        },
      ],
    );

    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(60);
    expect(results[0].affectedIdentities).toHaveLength(0);
    expect(results[0].domains).not.toContain("Identity Security");
  });

  it("does not report vulnerabilities for unknown assets", () => {
    const results = correlateRisks(
      [],
      [
        { id: "known-asset", internetExposed: true },
      ],
      [
        {
          id: "finding-unknown",
          assetId: "unknown-asset",
          severity: "Critical",
          description: "Synthetic test vulnerability",
        },
      ],
      [],
    );

    expect(results).toHaveLength(0);
  });
});
