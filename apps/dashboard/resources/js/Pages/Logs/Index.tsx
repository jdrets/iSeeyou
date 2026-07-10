import { useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Search,
} from 'lucide-react';
import { formatUtcTimestamp } from '@/lib/formatTimestamp';
import AppLayout from '@/Layouts/AppLayout';
import DateRangeFilter from '@/Components/filters/DateRangeFilter';
import LogDetailDrawer from '@/Components/logs/LogDetailDrawer';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { useLogs } from '@/hooks/useLogs';
import { useLogsFilters } from '@/hooks/useLogsFilters';
import { type LogEntry } from '@/lib/api';
import { cn } from '@/lib/utils';

const PER_PAGE_OPTIONS = [20, 50, 100];

function LogsTableSkeleton({ rows = 10 }: { rows?: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell>
                        <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                        <Skeleton className="h-4 w-full" />
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}

function LogRow({
    entry,
    selected,
    onSelect,
}: {
    entry: LogEntry;
    selected: boolean;
    onSelect: (entry: LogEntry) => void;
}) {
    const isError = entry.type === 'error';
    const ts = formatUtcTimestamp(entry.timestamp);

    return (
        <TableRow
            role="button"
            tabIndex={0}
            aria-selected={selected}
            onClick={() => onSelect(entry)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(entry);
                }
            }}
            className={cn(
                'cursor-pointer transition-colors duration-150 hover:bg-accent/60',
                selected && 'bg-accent/40',
            )}
        >
            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                {ts}
            </TableCell>
            <TableCell className="align-middle">
                <Badge variant={isError ? 'error' : 'success'}>
                    {entry.type}
                </Badge>
            </TableCell>
            <TableCell className="max-w-xl truncate text-xs text-foreground">
                {entry.message}
            </TableCell>
        </TableRow>
    );
}

export default function LogsIndex() {
    const {
        type,
        range,
        customFrom,
        customTo,
        from,
        to,
        page,
        perPage,
        setTypeFilter,
        setDatePreset,
        setCustomFrom,
        setCustomTo,
        applyCustomRange,
        setPageFilter,
        setPerPageFilter,
        isCustomRange,
        hasPendingCustomRange,
    } = useLogsFilters();

    const [selected, setSelected] = useState<{
        id: string;
        type: 'error' | 'log';
    } | null>(null);

    const { data, isPending, isError, isFetching, refetch } = useLogs({
        type,
        from,
        to,
        page,
        per_page: perPage,
    });

    const meta = data?.meta;
    const logs = data?.data ?? [];

    return (
        <AppLayout>
            <Head title="Logs" />

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        Logs
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {meta
                            ? `${meta.total.toLocaleString()} events found`
                            : 'Event log stream'}
                    </p>
                </div>

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

            <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-lg p-3">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />

                <Select
                    value={type}
                    onValueChange={(value) =>
                        setTypeFilter(value as 'all' | 'error' | 'log')
                    }
                >
                    <SelectTrigger className="w-28">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="error">Errors</SelectItem>
                        <SelectItem value="log">Logs</SelectItem>
                    </SelectContent>
                </Select>

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
            </div>

            {isError && (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-red-400">
                    Failed to load logs. Please try again.
                </div>
            )}

            <div className="glass overflow-hidden rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-44">Timestamp</TableHead>
                            <TableHead className="w-20">Type</TableHead>
                            <TableHead>Message</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            <LogsTableSkeleton />
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="py-10 text-center text-sm text-muted-foreground"
                                >
                                    No logs found for the selected filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((entry) => (
                                <LogRow
                                    key={`${entry.type}-${entry.id}`}
                                    entry={entry}
                                    selected={
                                        selected?.id === entry.id &&
                                        selected?.type === entry.type
                                    }
                                    onSelect={(row) =>
                                        setSelected({
                                            id: row.id,
                                            type: row.type,
                                        })
                                    }
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {meta && meta.last_page > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Rows per page:</span>
                        <Select
                            value={String(perPage)}
                            onValueChange={(value) =>
                                setPerPageFilter(Number(value))
                            }
                        >
                            <SelectTrigger className="w-16">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PER_PAGE_OPTIONS.map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                            Page {meta.page} of {meta.last_page}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setPageFilter(meta.page - 1)}
                                disabled={meta.page <= 1 || isFetching}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={() => setPageFilter(meta.page + 1)}
                                disabled={
                                    meta.page >= meta.last_page || isFetching
                                }
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <LogDetailDrawer
                selected={selected}
                onClose={() => setSelected(null)}
            />
        </AppLayout>
    );
}
