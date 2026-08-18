export const USER_ROLES = ['admin', 'editor', 'viewer'];

export function isValidUserRole(role) {
  return USER_ROLES.includes(role);
}

