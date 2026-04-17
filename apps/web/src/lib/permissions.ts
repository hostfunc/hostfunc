export type OrgRole = "owner" | "admin" | "member";

export type OrgPermission =
  | "view_workspace"
  | "create_function"
  | "edit_draft"
  | "deploy_function"
  | "manage_secrets"
  | "manage_triggers"
  | "manage_packages"
  | "manage_tokens"
  | "manage_members"
  | "manage_workspace_settings"
  | "manage_billing";

const OWNER_PERMISSIONS: ReadonlySet<OrgPermission> = new Set([
  "view_workspace",
  "create_function",
  "edit_draft",
  "deploy_function",
  "manage_secrets",
  "manage_triggers",
  "manage_packages",
  "manage_tokens",
  "manage_members",
  "manage_workspace_settings",
  "manage_billing",
]);

const ADMIN_PERMISSIONS: ReadonlySet<OrgPermission> = new Set([
  "view_workspace",
  "create_function",
  "edit_draft",
  "deploy_function",
  "manage_secrets",
  "manage_triggers",
  "manage_packages",
  "manage_tokens",
  "manage_members",
]);

const MEMBER_PERMISSIONS: ReadonlySet<OrgPermission> = new Set([
  "view_workspace",
  "create_function",
  "edit_draft",
]);

const PERMISSIONS_BY_ROLE: Record<OrgRole, ReadonlySet<OrgPermission>> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
};

export function normalizeOrgRole(value: string | null | undefined): OrgRole {
  if (value === "owner" || value === "admin" || value === "member") return value;
  return "member";
}

export function hasOrgPermission(
  role: string | null | undefined,
  permission: OrgPermission,
): boolean {
  const normalized = normalizeOrgRole(role);
  return PERMISSIONS_BY_ROLE[normalized].has(permission);
}
