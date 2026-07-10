import { formatUtcTimestamp } from '@/lib/formatTimestamp';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/Components/ui/sheet';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Skeleton } from '@/Components/ui/skeleton';
import { useLogDetail } from '@/hooks/useLogDetail';
import { cn } from '@/lib/utils';

type SelectedLog = {
    id: string;
    type: 'error' | 'log';
};

type LogDetailDrawerProps = {
    selected: SelectedLog | null;
    onClose: () => void;
};

function Field({
    label,
    value,
    mono = false,
}: {
    label: string;
    value?: string | null;
    mono?: boolean;
}) {
    if (!value) {
        return null;
    }

    return (
        <div className="space-y-1">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </dt>
            <dd
                className={cn(
                    'break-all text-sm text-foreground',
                    mono && 'font-mono text-xs',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

function StackTrace({ stack }: { stack: string }) {
    const lines = stack.split('\n');
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? lines : lines.slice(0, 5);
    const hasMore = lines.length > 5;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Stack trace
                </dt>
                {hasMore ? (
                    <button
                        type="button"
                        onClick={() => setExpanded((v) => !v)}
                        className="cursor-pointer text-xs text-cta transition-colors hover:text-cta/80"
                    >
                        {expanded ? 'Collapse' : `Show all (${lines.length})`}
                    </button>
                ) : null}
            </div>
            <pre className="overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {visible.join('\n')}
            </pre>
        </div>
    );
}

function JsonBlock({ data }: { data: Record<string, unknown> | unknown[] }) {
    if (Array.isArray(data) ? data.length === 0 : Object.keys(data).length === 0) {
        return null;
    }

    return (
        <div className="space-y-1">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Extra
            </dt>
            <pre className="overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
}

function CopyIdButton({ id }: { id: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            // ignore clipboard failures
        }
    };

    return (
        <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 text-cta" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? 'Copied' : 'Copy ID'}
        </Button>
    );
}

function DrawerSkeleton() {
    return (
        <div className="space-y-4 px-6 py-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 gap-4 pt-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
            <Skeleton className="h-40 w-full" />
        </div>
    );
}

export default function LogDetailDrawer({
    selected,
    onClose,
}: LogDetailDrawerProps) {
    const open = selected !== null;
    const { data, isPending, isError } = useLogDetail(
        selected?.type ?? null,
        selected?.id ?? null,
    );

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
        >
            <SheetContent
                side="right"
                className="flex flex-col gap-0 overflow-hidden p-0"
            >
                <SheetHeader>
                    <div className="flex items-center gap-2">
                        {data ? (
                            <Badge
                                variant={
                                    data.type === 'error' ? 'error' : 'success'
                                }
                            >
                                {data.type}
                            </Badge>
                        ) : selected ? (
                            <Badge
                                variant={
                                    selected.type === 'error'
                                        ? 'error'
                                        : 'success'
                                }
                            >
                                {selected.type}
                            </Badge>
                        ) : null}
                        <SheetTitle className="truncate">
                            {data?.name || data?.message || 'Event detail'}
                        </SheetTitle>
                    </div>
                    <SheetDescription className="flex items-center gap-2 font-mono text-xs">
                        <span className="truncate">
                            {selected?.id ?? '—'}
                        </span>
                        {selected ? <CopyIdButton id={selected.id} /> : null}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    {isPending ? <DrawerSkeleton /> : null}

                    {isError ? (
                        <div className="px-6 py-8 text-sm text-red-400">
                            Failed to load event detail.
                        </div>
                    ) : null}

                    {data && !isPending ? (
                        <dl className="space-y-5 px-6 py-5">
                            <Field label="Message" value={data.message} />
                            <Field
                                label="Timestamp"
                                value={formatUtcTimestamp(
                                    data.timestamp,
                                    'yyyy-MM-dd HH:mm:ss.SSS',
                                )}
                                mono
                            />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="URL" value={data.url} mono />
                                <Field
                                    label="Referrer"
                                    value={data.referrer}
                                    mono
                                />
                                <Field
                                    label="Browser"
                                    value={data.browser}
                                />
                                <Field label="OS" value={data.os} />
                                <Field
                                    label="Session"
                                    value={data.session_id}
                                    mono
                                />
                                <Field
                                    label="User"
                                    value={data.user_id}
                                    mono
                                />
                            </div>

                            <Field
                                label="User agent"
                                value={data.user_agent}
                                mono
                            />

                            {data.stack_trace ? (
                                <StackTrace stack={data.stack_trace} />
                            ) : null}

                            <JsonBlock data={data.extra} />
                        </dl>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
}
