import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { AlertTriangle, FileText, BarChart3, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import AppLayout from '@/Layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { useStats } from '@/hooks/useStats';
import { cn } from '@/lib/utils';

type MetricCardProps = {
    title: string;
    value: number | undefined;
    icon: React.ComponentType<{ className?: string }>;
    loading: boolean;
    accent?: string;
};

function MetricCard({ title, value, icon: Icon, loading, accent }: MetricCardProps) {
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
            </CardContent>
        </Card>
    );
}

export default function DashboardIndex() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    const [from, setFrom] = useState(sevenDaysAgo);
    const [to, setTo] = useState(today);
    const [appliedFrom, setAppliedFrom] = useState(sevenDaysAgo);
    const [appliedTo, setAppliedTo] = useState(today);

    const { data, isPending, isError, refetch, isFetching } = useStats({
        from: appliedFrom,
        to: appliedTo,
    });

    const handleApply = () => {
        setAppliedFrom(from);
        setAppliedTo(to);
    };

    return (
        <AppLayout>
            <Head title="Dashboard" />

            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        Dashboard
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Overview of events and errors
                    </p>
                </div>

                {/* Date range filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                            From
                        </label>
                        <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-36"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                            To
                        </label>
                        <Input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-36"
                        />
                    </div>
                    <Button
                        size="sm"
                        onClick={handleApply}
                        disabled={isFetching}
                    >
                        Apply
                    </Button>
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

            {/* Error state */}
            {isError && (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-400">
                    Failed to load stats. Please try again.
                </div>
            )}

            {/* Metric cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                    title="Errors"
                    value={data?.errors}
                    icon={AlertTriangle}
                    loading={isPending}
                    accent="text-red-400"
                />
                <MetricCard
                    title="Logs"
                    value={data?.logs}
                    icon={FileText}
                    loading={isPending}
                    accent="text-blue-400"
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
