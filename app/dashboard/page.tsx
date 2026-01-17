import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <header className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}!
          </h2>
          <p className="text-gray-600 dark:text-neutral-400">
            This is your protected dashboard. Only authenticated users can access this page.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/dashboard/websites">Create new website</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/websites">Manage websites</Link>
            </Button>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">Total Visitors</h3>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">0</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-200">Page Views</h3>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">0</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 dark:text-purple-200">Sessions</h3>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">0</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

