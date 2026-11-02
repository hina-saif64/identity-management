
export type RiskSeverity = "Critical" | "High" | "Medium" | "Low";

export interface IdentityRecord {
  id: string;
  name?: string;
  privileged: boolean;
}

export interface CloudAsset {
  id: string;
  name?: string;
  internetExposed: boolean;
}

export interface VulnerabilityRecord {
  id: string;
  assetId: string;
  severity: RiskSeverity;
  description: string;
  cve?: string;
}

export interface AssetAccess {
  identityId: string;
  assetId: string;
  accessVerified: boolean;
}

export interface CorrelatedRisk {
  id: string;
  title: string;
  severity: RiskSeverity;
  score: number;
  domains: string[];
  affectedAssets: string[];
  affectedIdentities: string[];
  evidence: string[];
  recommendedActions: string[];
}

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  Critical: 40,
  High: 25,
  Medium: 12,
  Low: 5,
};

/**
 * Hyperion cross-domain risk correlation.
 *
 * Correlates verified identity-to-asset relationships
 * with cloud exposure and vulnerability findings.
 *
 * Scores are prioritisation heuristics, not probabilities.
 */
export function correlateRisks(
  identities: IdentityRecord[],
  assets: CloudAsset[],
  vulnerabilities: VulnerabilityRecord[],
  accessRelationships: AssetAccess[],
): CorrelatedRisk[] {
  const identityById = new Map(
    identities.map((identity) => [identity.id, identity]),
  );

  const assetById = new Map(
    assets.map((asset) => [asset.id, asset]),
  );

  const vulnerabilitiesByAsset = new Map<
    string,
    VulnerabilityRecord[]
  >();

  for (const vulnerability of vulnerabilities) {
    if (!assetById.has(vulnerability.assetId)) continue;

    const existing =
      vulnerabilitiesByAsset.get(vulnerability.assetId) ?? [];

    existing.push(vulnerability);
    vulnerabilitiesByAsset.set(vulnerability.assetId, existing);
  }

  const accessByAsset = new Map<string, AssetAccess[]>();

  for (const relationship of accessRelationships) {
    if (
      !relationship.identityId ||
      !assetById.has(relationship.assetId)
    ) {
      continue;
    }

    const existing =
      accessByAsset.get(relationship.assetId) ?? [];

    existing.push(relationship);
    accessByAsset.set(relationship.assetId, existing);
  }

  const risks: CorrelatedRisk[] = [];

  for (const asset of assets) {
    if (!asset.internetExposed) continue;

    const seriousVulnerabilities = (
      vulnerabilitiesByAsset.get(asset.id) ?? []
    ).filter(
      (vulnerability) =>
        vulnerability.severity === "Critical" ||
        vulnerability.severity === "High",
    );

    if (seriousVulnerabilities.length === 0) continue;

    const privilegedIdentities = (
      accessByAsset.get(asset.id) ?? []
    )
      .filter((relationship) => relationship.accessVerified)
      .map((relationship) =>
        identityById.get(relationship.identityId),
      )
      .filter(
        (identity): identity is IdentityRecord =>
          identity !== undefined && identity.privileged,
      );

    const highestVulnerabilityWeight = Math.max(
      ...seriousVulnerabilities.map(
        (vulnerability) =>
          SEVERITY_WEIGHT[vulnerability.severity],
      ),
    );

    const score = Math.min(
      100,
      35 +
        highestVulnerabilityWeight +
        (privilegedIdentities.length > 0 ? 20 : 0),
    );

    const severity: RiskSeverity =
      score >= 85
        ? "Critical"
        : score >= 65
          ? "High"
          : score >= 40
            ? "Medium"
            : "Low";

    const domains = [
      "Cloud Security",
      "Vulnerability Management",
      ...(privilegedIdentities.length > 0
        ? ["Identity Security"]
        : []),
    ];

    const evidence = [
      `Asset ${asset.id} is marked as internet-exposed.`,
      ...seriousVulnerabilities.map(
        (vulnerability) =>
          `${vulnerability.severity} vulnerability: ` +
          `${vulnerability.cve ?? vulnerability.id} — ` +
          vulnerability.description,
      ),
      ...privilegedIdentities.map(
        (identity) =>
          `Verified access relationship to privileged identity: ` +
          `${identity.name ?? identity.id}.`,
      ),
    ];

    const recommendedActions = [
      "Validate the exposure and vulnerability findings.",
      "Apply the appropriate security fix or mitigation.",
      "Review network exposure and restrict unnecessary access.",
    ];

    if (privilegedIdentities.length > 0) {
      recommendedActions.push(
        "Review privileged identity permissions and remove " +
          "unnecessary access through an approved workflow.",
      );
    }

    risks.push({
      id: `HYP-CORR-${asset.id}`,
      title:
        privilegedIdentities.length > 0
          ? "Exposed vulnerable asset with privileged access"
          : "Internet-exposed asset with serious vulnerability",
      severity,
      score,
      domains,
      affectedAssets: [asset.id],
      affectedIdentities: privilegedIdentities.map(
        (identity) => identity.id,
      ),
      evidence,
      recommendedActions,
    });
  }

  return risks.sort((a, b) => b.score - a.score);
}
