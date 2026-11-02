
import { describe, it, expect } from "vitest";
import { detectRolePermissionDrift } from "./rolePermissionDriftService";

const roleChanges = [{
  identityId: "employee-1",
  previousRole: "Administrator",
  currentRole: "Analyst",
}];

const policies = [
  {
    applicationId: "AppA",
    role: "Administrator",
    permissions: ["read", "admin"],
  },
  {
    applicationId: "AppA",
    role: "Analyst",
    permissions: ["read"],
  },
  {
    applicationId: "AppB",
    role: "Administrator",
    permissions: ["read", "admin"],
  },
  {
    applicationId: "AppB",
    role: "Analyst",
    permissions: ["read"],
  },
];

describe("Hyperion role-permission drift detection", () => {
  it("flags a retained admin permission in another application", () => {
    const result = detectRolePermissionDrift(
      roleChanges,
      policies,
      [
        {
          applicationId: "AppA",
          complete: true,
          permissions: [
            { identityId: "employee-1", permission: "read", verified: true },
          ],
        },
        {
          applicationId: "AppB",
          complete: true,
          permissions: [
            { identityId: "employee-1", permission: "read", verified: true },
            { identityId: "employee-1", permission: "admin", verified: true },
          ],
        },
      ],
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      identityId: "employee-1",
      applicationId: "AppB",
      permission: "admin",
      previousRole: "Administrator",
      currentRole: "Analyst",
    });
    expect(result.inconclusive).toHaveLength(0);
  });

  it("does not flag permissions correctly updated in both apps", () => {
    const result = detectRolePermissionDrift(
      roleChanges,
      policies,
      ["AppA", "AppB"].map((applicationId) => ({
        applicationId,
        complete: true,
        permissions: [
          { identityId: "employee-1", permission: "read", verified: true },
        ],
      })),
    );

    expect(result.findings).toHaveLength(0);
    expect(result.inconclusive).toHaveLength(0);
  });

  it("does not flag an admin permission still allowed by the current role", () => {
    const approvedPolicies = policies.map((policy) =>
  policy.applicationId === "AppB" && policy.role === "Analyst"
    ? { ...policy, permissions: ["read", "admin"] }
    : policy,
);

    const result = detectRolePermissionDrift(
      roleChanges,
      approvedPolicies,
      [{
        applicationId: "AppB",
        complete: true,
        permissions: [
          { identityId: "employee-1", permission: "admin", verified: true },
        ],
      }],
    );

    expect(result.findings).toHaveLength(0);
  });

  it("marks incomplete application data as inconclusive", () => {
    const result = detectRolePermissionDrift(
      roleChanges,
      policies,
      [{
        applicationId: "AppB",
        complete: false,
        permissions: [
          { identityId: "employee-1", permission: "admin", verified: true },
        ],
      }],
    );

    expect(result.findings).toHaveLength(0);
    expect(result.inconclusive).toHaveLength(1);
  });

  it("flags only the specific retained permission", () => {
    const result = detectRolePermissionDrift(
      roleChanges,
      policies,
      [{
        applicationId: "AppB",
        complete: true,
        permissions: [
          { identityId: "employee-1", permission: "read", verified: true },
          { identityId: "employee-1", permission: "admin", verified: true },
        ],
      }],
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].permission).toBe("admin");
  });

  it("marks unverified permission data as inconclusive", () => {
    const result = detectRolePermissionDrift(
      roleChanges,
      policies,
      [{
        applicationId: "AppB",
        complete: true,
        permissions: [
          { identityId: "employee-1", permission: "admin", verified: false },
        ],
      }],
    );

    expect(result.findings).toHaveLength(0);
    expect(result.inconclusive).toHaveLength(1);
  });
  
  it("flags a verified permission not allowed by either role", () => {
    const result = detectRolePermissionDrift(
      roleChanges,
      policies,
      [{
        applicationId: "AppB",
        complete: true,
        permissions: [
          {
            identityId: "employee-1",
            permission: "superuser",
            verified: true,
          },
        ],
      }],
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      identityId: "employee-1",
      applicationId: "AppB",
      permission: "superuser",
      previousRole: "Administrator",
      currentRole: "Analyst",
      reason:
        "Verified observed permission is not allowed by either the previous or current role.",
    });
    expect(result.inconclusive).toHaveLength(0);
  });

});

