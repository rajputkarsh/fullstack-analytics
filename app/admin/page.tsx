import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { isAdmin } from '@/lib/auth';

export default async function AdminPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Check if user is admin
  const userIsAdmin = await isAdmin();
  
  if (!userIsAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <header className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Admin Panel
          </h2>
          <p className="text-gray-600 dark:text-neutral-400 mb-6">
            This is an admin-only page. Only users with the admin role can access this area.
          </p>
          
          <div className="space-y-4">
            <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">User Management</h3>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                Manage user accounts, roles, and permissions.
              </p>
            </div>
            
            <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">System Health</h3>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                Monitor system metrics and performance.
              </p>
            </div>
            
            <div className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Analytics Overview</h3>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                View platform-wide analytics and insights.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

