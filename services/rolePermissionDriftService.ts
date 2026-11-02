
export interface RoleChange {
  identityId: string;
  previousRole: string;
  currentRole: string;
}

export interface RolePermissionPolicy {
  applicationId: string;
  role: string;
  permissions: string[];
}

export interface ObservedPermission {
  identityId: string;
  permission: string;
  verified: boolean;
}

export interface ApplicationPermissionSnapshot {
  applicationId: string;
  complete: boolean;
  permissions: ObservedPermission[];
}

export interface RoleDriftFinding {
  identityId: string;
  applicationId: string;
  permission: string;
  previousRole: string;
  currentRole: string;
  reason: string;
}

export interface RoleDriftResult {
  findings: RoleDriftFinding[];
  inconclusive: {
    identityId: string;
    applicationId: string;
    reason: string;
  }[];
}

export function detectRolePermissionDrift(
  roleChanges: RoleChange[],
  policies: RolePermissionPolicy[],
  snapshots: ApplicationPermissionSnapshot[],
): RoleDriftResult {
  const findings: RoleDriftFinding[] = [];
  const inconclusive: RoleDriftResult["inconclusive"] = [];

  for (const change of roleChanges) {
    for (const snapshot of snapshots) {
      const previousPolicy = policies.find(
        (p) =>
          p.applicationId === snapshot.applicationId &&
          p.role === change.previousRole,
      );

      const currentPolicy = policies.find(
        (p) =>
          p.applicationId === snapshot.applicationId &&
          p.role === change.currentRole,
      );

      if (!snapshot.complete) {
        inconclusive.push({
          identityId: change.identityId,
          applicationId: snapshot.applicationId,
          reason: "Application permission snapshot is incomplete.",
        });
        continue;
      }

      if (!previousPolicy || !currentPolicy) {
        inconclusive.push({
          identityId: change.identityId,
          applicationId: snapshot.applicationId,
          reason: "Previous-role or current-role policy is missing.",
        });
        continue;
      }

      const observed = snapshot.permissions.filter(
        (p) => p.identityId === change.identityId,
      );

      if (observed.some((p) => !p.verified)) {
        inconclusive.push({
          identityId: change.identityId,
          applicationId: snapshot.applicationId,
          reason: "One or more observed permissions are unverified.",
        });
        continue;
      }

      const previousPermissions = new Set(previousPolicy.permissions);
      const currentPermissions = new Set(currentPolicy.permissions);

      for (const permission of observed) {
        const wasAllowed = previousPermissions.has(permission.permission);
        const allowedNow = currentPermissions.has(permission.permission);

        if (!allowedNow) {
          findings.push({
            identityId: change.identityId,
            applicationId: snapshot.applicationId,
            permission: permission.permission,
            previousRole: change.previousRole,
            currentRole: change.currentRole,
            reason: wasAllowed
  ? "Verified permission allowed by the previous role is not allowed by the current role."
  : "Verified observed permission is not allowed by either the previous or current role.",
          });
        }
      }
    }
  }

  return { findings, inconclusive };
}
