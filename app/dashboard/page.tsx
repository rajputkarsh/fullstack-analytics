import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { eq } from 'drizzle-orm';
import { db } from '@/configs/db';
import { websitesTable } from '@/configs/schema';
import { getAggregateOverviewMetrics } from '@/lib/analytics/queries';
import CreateWebsiteDialog from "./create-website-dialog";
import { createWebsite } from "./websites/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ACTIVE_MINUTES = 5;

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch user's websites
  const websites = await db
    .select({
      id: websitesTable.id,
      name: websitesTable.name,
      domain: websitesTable.domain,
    })
    .from(websitesTable)
    .where(eq(websitesTable.userId, user.id));

  // Get aggregate metrics across all websites (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const websiteIds = websites.map((w) => w.id);
  
  const metrics = await getAggregateOverviewMetrics(
    websiteIds,
    {
      from: thirtyDaysAgo,
      to: now,
    },
    ACTIVE_MINUTES,
  );

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
        <div className="space-y-6">
          {/* Welcome Section */}
          <Card>
            <CardHeader>
              <CardTitle>
                Welcome, {user.firstName || user.emailAddresses[0]?.emailAddress}!
              </CardTitle>
              <CardDescription>
                Overview of all your websites and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <CreateWebsiteDialog createWebsite={createWebsite} />
                <Button variant="outline" asChild>
                  <Link href="/dashboard/websites">Manage websites</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Visitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.visitors.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Page Views</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {metrics.pageViews.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {metrics.sessions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {metrics.activeUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Last {ACTIVE_MINUTES} minutes</p>
              </CardContent>
            </Card>
          </div>

          {/* Websites List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Websites</CardTitle>
              <CardDescription>
                {websites.length === 0
                  ? "Get started by creating your first website"
                  : `${websites.length} website${websites.length === 1 ? '' : 's'} tracked`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {websites.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You don't have any websites yet. Create one to start tracking analytics.
                  </p>
                  <CreateWebsiteDialog createWebsite={createWebsite} />
                </div>
              ) : (
                <div className="space-y-3">
                  {websites.map((website) => (
                    <div
                      key={website.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {website.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{website.domain}</p>
                      </div>
                      <Button asChild variant="outline">
                        <Link href={`/dashboard/analytics/${website.id}`}>
                          View Analytics
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

