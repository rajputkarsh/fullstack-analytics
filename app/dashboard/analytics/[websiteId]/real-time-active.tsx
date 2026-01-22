"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

type ActiveFilters = {
  deviceType?: "mobile" | "desktop" | "tablet";
  browser?: string;
  country?: string;
};

type RealTimeActiveUsersProps = {
  websiteId: string;
  initialValue: number;
  activeMinutes: number;
  filters: ActiveFilters;
};

const REFRESH_INTERVAL_MS = 12000;

export default function RealTimeActiveUsers({
  websiteId,
  initialValue,
  activeMinutes,
  filters,
}: RealTimeActiveUsersProps) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      websiteId,
      minutes: String(activeMinutes),
    });
    if (filters.deviceType) params.set("device", filters.deviceType);
    if (filters.browser) params.set("browser", filters.browser);
    if (filters.country) params.set("country", filters.country);
    return params.toString();
  }, [websiteId, activeMinutes, filters.deviceType, filters.browser, filters.country]);

  useEffect(() => {
    let isMounted = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const fetchActiveUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/analytics/active?${queryString}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          activeUsers?: number;
          updatedAt?: string;
        };
        if (!isMounted) return;
        if (typeof payload.activeUsers === "number") {
          setValue(payload.activeUsers);
        }
        if (payload.updatedAt) {
          setLastUpdated(payload.updatedAt);
        }
      } catch {
        // Silently ignore polling failures to avoid UI churn.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActiveUsers();
    timer = setInterval(fetchActiveUsers, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [queryString]);

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const date = new Date(lastUpdated);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString();
  }, [lastUpdated]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
        {loading ? <Spinner /> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {updatedLabel
          ? `Updated ${updatedLabel}`
          : `Active in the last ${activeMinutes} minutes`}
      </p>
    </div>
  );
}


