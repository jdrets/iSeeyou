import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, FileText, BarChart3, RefreshCw, ArrowRight } from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import DateRangeFilter from '@/Components/filters/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { useDateRangeFilters } from '@/hooks/useDateRangeFilters';
import { useStats } from '@/hooks/useStats';
import { buildLogsHref } from '@/lib/dateRange';
import { cn } from '@/lib/utils';

type MetricCardProps = {
    title: string;
    value: number | undefined;
    icon: React.ComponentType<{ className?: string }>;
    loading: boolean;
    accent?: string;
    logsHref?: string;
};

function MetricCard({
    title,
    value,
    icon: Icon,
    loading,
    accent,
    logsHref,
}: MetricCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs">{title}</CardTitle>
                <Icon className={cn('h-4 w-4', accent ?? 'text-muted-foreground')} />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Skeleton className="h-9 w-28" />
                ) : (
                    <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                        {(value ?? 0).toLocaleString()}
                    </p>
                )}
                {logsHref ? (
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                    >
                        <Link href={logsHref} className="cursor-pointer">
                            View logs
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                ) : null}
            </CardContent>
        </Card>
    );
}

export default function DashboardIndex() {
    const {
        range,
        customFrom,
        customTo,
        appliedCustomFrom,
        appliedCustomTo,
        from,
        to,
        setDatePreset,
        setCustomFrom,
        setCustomTo,
        applyCustomRange,
        isCustomRange,
        hasPendingCustomRange,
    } = useDateRangeFilters();

    const logsHrefBase = {
        range,
        customFrom: appliedCustomFrom,
        customTo: appliedCustomTo,
    };

    const { data, isPending, isError, refetch, isFetching } = useStats({
        from,
        to,
    });

    return (
        <AppLayout>
            <Head title="Dashboard" />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        Dashboard
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Overview of events and errors
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <DateRangeFilter
                        preset={range}
                        customFrom={customFrom}
                        customTo={customTo}
                        onPresetChange={setDatePreset}
                        onCustomFromChange={setCustomFrom}
                        onCustomToChange={setCustomTo}
                    />

                    {isCustomRange ? (
                        <Button
                            size="sm"
                            onClick={applyCustomRange}
                            disabled={isFetching || !hasPendingCustomRange}
                        >
                            Apply
                        </Button>
                    ) : null}

                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        title="Refresh"
                    >
                        <RefreshCw
                            className={cn(
                                'h-4 w-4',
                                isFetching && 'animate-spin',
                            )}
                        />
                    </Button>
                </div>
            </div>

            {isError && (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-400">
                    Failed to load stats. Please try again.
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                    title="Errors"
                    value={data?.errors}
                    icon={AlertTriangle}
                    loading={isPending}
                    accent="text-red-400"
                    logsHref={buildLogsHref({ ...logsHrefBase, type: 'error' })}
                />
                <MetricCard
                    title="Logs"
                    value={data?.logs}
                    icon={FileText}
                    loading={isPending}
                    accent="text-blue-400"
                    logsHref={buildLogsHref({ ...logsHrefBase, type: 'log' })}
                />
                <MetricCard
                    title="Total Events"
                    value={data?.total}
                    icon={BarChart3}
                    loading={isPending}
                    accent="text-cta"
                />
            </div>
        </AppLayout>
    );
}
