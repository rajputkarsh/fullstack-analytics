"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import RealTimeActiveUsers from "./real-time-active";
import type { AnalyticsGranularity, TimeSeriesPoint, OverviewMetrics, BreakdownData } from "./queries";

type DashboardFilters = {
  from: string;
  to: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  browser?: string;
  country?: string;
};

type FilterOptions = {
  browsers: string[];
  countries: string[];
};

type AnalyticsDashboardProps = {
  website: { id: string; name: string; domain: string };
  overview: OverviewMetrics;
  timeSeries: TimeSeriesPoint[];
  granularity: AnalyticsGranularity;
  filters: DashboardFilters;
  filterOptions: FilterOptions;
  activeMinutes: number;
  deviceTypeBreakdown: BreakdownData;
  browserBreakdown: BreakdownData;
  countryBreakdown: BreakdownData;
  topPages: BreakdownData;
  osBreakdown: BreakdownData;
  referrerBreakdown: BreakdownData;
};

const chartConfig: ChartConfig = {
  pageViews: { label: "Page views", color: "#3b82f6" },
  visitors: { label: "Visitors", color: "#10b981" },
  sessions: { label: "Sessions", color: "#8b5cf6" },
  value: { label: "Value", color: "#3b82f6" },
};

// Vibrant color palette for charts
const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#84cc16", // Lime
  "#6366f1", // Indigo
  "#f97316", // Orange
];

// Color palette for bar charts (gradient from blue to purple)
const BAR_COLORS = [
  "#3b82f6", // Blue
  "#2563eb", // Blue-600
  "#1d4ed8", // Blue-700
  "#8b5cf6", // Purple
  "#7c3aed", // Purple-600
  "#6d28d9", // Purple-700
  "#10b981", // Green
  "#059669", // Green-600
  "#047857", // Green-700
  "#f59e0b", // Amber
];

const deviceOptions: Array<{ value: DashboardFilters["deviceType"]; label: string }> = [
  { value: undefined, label: "All devices" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
];

const granularityOptions: Array<{ value: AnalyticsGranularity; label: string }> = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatBucketLabel(value: string, granularity: AnalyticsGranularity) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (granularity === "monthly") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  if (granularity === "weekly") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{formatNumber(value)}</div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsDashboard({
  website,
  overview,
  timeSeries,
  granularity,
  filters,
  filterOptions,
  activeMinutes,
  deviceTypeBreakdown,
  browserBreakdown,
  countryBreakdown,
  topPages,
  osBreakdown,
  referrerBreakdown,
}: AnalyticsDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const chartData = useMemo(
    () =>
      timeSeries.map((point) => ({
        label: formatBucketLabel(point.bucket, granularity),
        pageViews: point.pageViews,
        visitors: point.visitors,
        sessions: point.sessions,
      })),
    [timeSeries, granularity],
  );

  const hasSeriesData = useMemo(
    () =>
      chartData.some((point) => {
        const pageViews = Number(point.pageViews) || 0;
        const visitors = Number(point.visitors) || 0;
        const sessions = Number(point.sessions) || 0;
        return pageViews > 0 || visitors > 0 || sessions > 0;
      }),
    [chartData],
  );

  const updateFilters = (updates: Partial<DashboardFilters> & { granularity?: string }) => {
    const params = new URLSearchParams();
    const next = { ...filters, ...updates } as DashboardFilters;
    const nextGranularity = updates.granularity ?? granularity;

    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.deviceType) params.set("device", next.deviceType);
    if (next.browser) params.set("browser", next.browser);
    if (next.country) params.set("country", next.country);
    if (nextGranularity) params.set("granularity", nextGranularity);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleReset = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <header className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                {website.name} · {website.domain}
              </p>
            </div>
            <div className="ml-auto">
              <Link
                href="/dashboard/websites"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                ← Back to websites
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Filters
              {isPending ? <Spinner /> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={filters.from}
                onChange={(event) => updateFilters({ from: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={filters.to}
                onChange={(event) => updateFilters({ to: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Device</label>
              <Select
                value={filters.deviceType ?? "all"}
                onValueChange={(value) =>
                  updateFilters({ deviceType: value === "all" ? undefined : (value as DashboardFilters["deviceType"]) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All devices" />
                </SelectTrigger>
                <SelectContent>
                  {deviceOptions.map((option) => (
                    <SelectItem key={option.label} value={option.value ?? "all"}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Browser</label>
              <Select
                value={filters.browser ?? "all"}
                onValueChange={(value) =>
                  updateFilters({ browser: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All browsers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All browsers</SelectItem>
                  {filterOptions.browsers.map((browser) => (
                    <SelectItem key={browser} value={browser}>
                      {browser}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Country</label>
              <Select
                value={filters.country ?? "all"}
                onValueChange={(value) =>
                  updateFilters({ country: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All countries</SelectItem>
                  {filterOptions.countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Granularity</label>
              <Select
                value={granularity}
                onValueChange={(value) => updateFilters({ granularity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {granularityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleReset}>
                Reset filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total visitors" value={overview.visitors} />
          <MetricCard label="Page views" value={overview.pageViews} />
          <MetricCard label="Sessions" value={overview.sessions} />
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active users
                </CardTitle>
                <Badge variant="outline">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <RealTimeActiveUsers
                websiteId={website.id}
                initialValue={overview.activeUsers}
                activeMinutes={activeMinutes}
                filters={{
                  deviceType: filters.deviceType,
                  browser: filters.browser,
                  country: filters.country,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Traffic over time</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasSeriesData ? (
              <Empty className="border-dashed">
                <EmptyHeader>
                  <EmptyTitle>No data for this range</EmptyTitle>
                  <EmptyDescription>
                    Adjust filters or wait for more traffic to appear.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                {granularity === "monthly" ? (
                  <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="pageViews" fill="#3b82f6" radius={4} />
                    <Bar dataKey="visitors" fill="#10b981" radius={4} />
                    <Bar dataKey="sessions" fill="#8b5cf6" radius={4} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="pageViews"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="visitors"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                )}
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Device Types</CardTitle>
            </CardHeader>
            <CardContent>
              {deviceTypeBreakdown.length === 0 ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No data</EmptyTitle>
                    <EmptyDescription>No device type data available</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={deviceTypeBreakdown}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {deviceTypeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Browsers</CardTitle>
            </CardHeader>
            <CardContent>
              {browserBreakdown.length === 0 ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No data</EmptyTitle>
                    <EmptyDescription>No browser data available</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={browserBreakdown} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={4}>
                      {browserBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Countries</CardTitle>
            </CardHeader>
            <CardContent>
              {countryBreakdown.length === 0 ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No data</EmptyTitle>
                    <EmptyDescription>No country data available</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={countryBreakdown} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={60} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={4}>
                      {countryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operating Systems</CardTitle>
            </CardHeader>
            <CardContent>
              {osBreakdown.length === 0 ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No data</EmptyTitle>
                    <EmptyDescription>No OS data available</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={osBreakdown} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={4}>
                      {osBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No data</EmptyTitle>
                    <EmptyDescription>No page data available</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={topPages} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={150} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={4}>
                      {topPages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {referrerBreakdown.length === 0 ? (
                <Empty className="border-dashed">
                  <EmptyHeader>
                    <EmptyTitle>No data</EmptyTitle>
                    <EmptyDescription>No referrer data available</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={referrerBreakdown}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    >
                      {referrerBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


