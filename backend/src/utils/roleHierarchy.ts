const HIERARCHY: Record<string, number> = {
  super_admin: 4,
  company_admin: 3,
  manager: 2,
  employee: 1,
  // hr is handled as a named exception
};

export const outranks = (roleA: string, roleB: string): boolean => {
  return (HIERARCHY[roleA] ?? 0) > (HIERARCHY[roleB] ?? 0);
};

export const canManage = (actingRole: string, targetRole: string): boolean => {
  // HR can manage both employees and managers, but not admins
  if (actingRole === 'hr') {
    return targetRole === 'employee' || targetRole === 'manager';
  }
  // A role can manage anyone strictly below it, never itself or above
  return outranks(actingRole, targetRole);
};
