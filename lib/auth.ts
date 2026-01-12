import { currentUser } from '@clerk/nextjs/server';

export type UserRole = 'user' | 'admin';

/**
 * Get the role of the current authenticated user
 * @returns The user's role ('user' or 'admin'), defaults to 'user'
 */
export async function getUserRole(): Promise<UserRole> {
  const user = await currentUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check publicMetadata first, then privateMetadata
  const role = (user.publicMetadata?.role as UserRole) || 
               (user.privateMetadata?.role as UserRole) || 
               'user';
  
  return role;
}

/**
 * Check if the current user is an admin
 * @returns true if user is an admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const role = await getUserRole();
    return role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Check if the current user has a specific role
 * @param requiredRole The role to check for
 * @returns true if user has the required role, false otherwise
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  try {
    const role = await getUserRole();
    return role === requiredRole;
  } catch {
    return false;
  }
}

