'use client'

import { useUser } from '@clerk/nextjs';
import { useMemo } from 'react';

export type UserRole = 'user' | 'admin';

/**
 * Client-side hook to get the current user's role
 * @returns The user's role ('user' or 'admin'), or null if not authenticated
 */
export function useRole(): UserRole | null {
  const { user } = useUser();

  return useMemo(() => {
    if (!user) {
      return null;
    }

    // Check publicMetadata for role (privateMetadata is not accessible on client-side)
    const role = (user.publicMetadata?.role as UserRole) || 'user';

    return role;
  }, [user]);
}

/**
 * Client-side hook to check if the current user is an admin
 * @returns true if user is an admin, false otherwise
 */
export function useIsAdmin(): boolean {
  const role = useRole();
  return role === 'admin';
}

/**
 * Client-side hook to check if the current user has a specific role
 * @param requiredRole The role to check for
 * @returns true if user has the required role, false otherwise
 */
export function useHasRole(requiredRole: UserRole): boolean {
  const role = useRole();
  return role === requiredRole;
}
