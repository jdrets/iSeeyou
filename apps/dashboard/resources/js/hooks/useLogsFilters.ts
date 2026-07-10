import { useCallback, useMemo, useState } from 'react';
import {
    DEFAULT_DATE_RANGE_PRESET,
    isDateRangePreset,
    resolveApiDateRange,
    resolveDateRange,
    todayString,
    type DateRangePreset,
} from '@/lib/dateRange';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';

export type LogTypeFilter = 'all' | 'error' | 'log';

const DEFAULT_TYPE: LogTypeFilter = 'all';
const DEFAULT_PER_PAGE = 20;

type AppliedFilters = {
    type: LogTypeFilter;
    range: DateRangePreset;
    customFrom: string;
    customTo: string;
    page: number;
    perPage: number;
};

function parseType(value: string | null): LogTypeFilter {
    if (value === 'error' || value === 'log' || value === 'all') {
        return value;
    }

    return DEFAULT_TYPE;
}

function parsePositiveInt(
    value: string | null,
    fallback: number,
    max?: number,
): number {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }

    if (max !== undefined) {
        return Math.min(max, Math.floor(parsed));
    }

    return Math.floor(parsed);
}

function parseInitialState(getParam: (key: string) => string | null): AppliedFilters {
    const type = parseType(getParam('type'));
    const range = isDateRangePreset(getParam('range') ?? '')
        ? (getParam('range') as DateRangePreset)
        : DEFAULT_DATE_RANGE_PRESET;
    const page = parsePositiveInt(getParam('page'), 1);
    const perPage = parsePositiveInt(getParam('per_page'), DEFAULT_PER_PAGE, 100);
    const customFrom = getParam('from') ?? todayString();
    const customTo = getParam('to') ?? todayString();

    return {
        type,
        range,
        customFrom,
        customTo,
        page,
        perPage,
    };
}

export function useLogsFilters() {
    const { getParam, setParams } = useUrlSyncedState();
    const initial = useMemo(() => parseInitialState(getParam), [getParam]);

    const [applied, setApplied] = useState<AppliedFilters>(initial);
    const [draftCustomFrom, setDraftCustomFrom] = useState(initial.customFrom);
    const [draftCustomTo, setDraftCustomTo] = useState(initial.customTo);

    const appliedRange = useMemo(
        () =>
            resolveApiDateRange(
                applied.range,
                applied.customFrom,
                applied.customTo,
            ),
        [applied.range, applied.customFrom, applied.customTo],
    );

    const syncUrl = useCallback(
        (next: AppliedFilters) => {
            const updates: Record<string, string | number | undefined> = {
                type: next.type === DEFAULT_TYPE ? undefined : next.type,
                range:
                    next.range === DEFAULT_DATE_RANGE_PRESET
                        ? undefined
                        : next.range,
                page: next.page === 1 ? undefined : next.page,
                per_page:
                    next.perPage === DEFAULT_PER_PAGE
                        ? undefined
                        : next.perPage,
            };

            const remove: string[] = [];

            if (next.range === 'custom') {
                updates.from = next.customFrom;
                updates.to = next.customTo;
            } else {
                remove.push('from', 'to');
            }

            setParams(updates, remove);
        },
        [setParams],
    );

    const applyFilters = useCallback(
        (next: AppliedFilters) => {
            setApplied(next);

            if (next.range === 'custom') {
                setDraftCustomFrom(next.customFrom);
                setDraftCustomTo(next.customTo);
            }

            syncUrl(next);
        },
        [syncUrl],
    );

    const setTypeFilter = useCallback(
        (type: LogTypeFilter) => {
            applyFilters({ ...applied, type, page: 1 });
        },
        [applyFilters, applied],
    );

    const setDatePreset = useCallback(
        (range: DateRangePreset) => {
            if (range === 'custom') {
                const activeRange = resolveDateRange(
                    applied.range,
                    applied.customFrom,
                    applied.customTo,
                );
                const next = {
                    ...applied,
                    range,
                    customFrom: activeRange.from,
                    customTo: activeRange.to,
                };

                setApplied(next);
                setDraftCustomFrom(next.customFrom);
                setDraftCustomTo(next.customTo);
                syncUrl(next);
                return;
            }

            applyFilters({
                ...applied,
                range,
                page: 1,
            });
        },
        [applyFilters, applied, syncUrl],
    );

    const applyCustomRange = useCallback(() => {
        applyFilters({
            ...applied,
            range: 'custom',
            customFrom: draftCustomFrom,
            customTo: draftCustomTo,
            page: 1,
        });
    }, [applyFilters, applied, draftCustomFrom, draftCustomTo]);

    const setPageFilter = useCallback(
        (page: number) => {
            applyFilters({ ...applied, page });
        },
        [applyFilters, applied],
    );

    const setPerPageFilter = useCallback(
        (perPage: number) => {
            applyFilters({ ...applied, perPage, page: 1 });
        },
        [applyFilters, applied],
    );

    return {
        type: applied.type,
        range: applied.range,
        customFrom: draftCustomFrom,
        customTo: draftCustomTo,
        from: appliedRange.from,
        to: appliedRange.to,
        page: applied.page,
        perPage: applied.perPage,
        setTypeFilter,
        setDatePreset,
        setCustomFrom: setDraftCustomFrom,
        setCustomTo: setDraftCustomTo,
        applyCustomRange,
        setPageFilter,
        setPerPageFilter,
        isCustomRange: applied.range === 'custom',
        hasPendingCustomRange:
            applied.range === 'custom' &&
            (draftCustomFrom !== applied.customFrom ||
                draftCustomTo !== applied.customTo),
    };
}
