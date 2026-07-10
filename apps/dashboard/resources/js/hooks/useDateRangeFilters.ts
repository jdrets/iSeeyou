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

type AppliedDateRange = {
    range: DateRangePreset;
    customFrom: string;
    customTo: string;
};

function parseInitialDateRange(
    getParam: (key: string) => string | null,
): AppliedDateRange {
    const range = isDateRangePreset(getParam('range') ?? '')
        ? (getParam('range') as DateRangePreset)
        : DEFAULT_DATE_RANGE_PRESET;

    return {
        range,
        customFrom: getParam('from') ?? todayString(),
        customTo: getParam('to') ?? todayString(),
    };
}

function buildDateRangeUrlUpdates(next: AppliedDateRange): {
    updates: Record<string, string | undefined>;
    remove: string[];
} {
    const updates: Record<string, string | undefined> = {
        range:
            next.range === DEFAULT_DATE_RANGE_PRESET ? undefined : next.range,
    };
    const remove: string[] = [];

    if (next.range === 'custom') {
        updates.from = next.customFrom;
        updates.to = next.customTo;
    } else {
        remove.push('from', 'to');
    }

    return { updates, remove };
}

export function useDateRangeFilters() {
    const { getParam, setParams } = useUrlSyncedState();
    const initial = useMemo(() => parseInitialDateRange(getParam), [getParam]);

    const [applied, setApplied] = useState<AppliedDateRange>(initial);
    const [draftCustomFrom, setDraftCustomFrom] = useState(initial.customFrom);
    const [draftCustomTo, setDraftCustomTo] = useState(initial.customTo);

    const apiRange = useMemo(
        () =>
            resolveApiDateRange(
                applied.range,
                applied.customFrom,
                applied.customTo,
            ),
        [applied.range, applied.customFrom, applied.customTo],
    );

    const syncUrl = useCallback(
        (next: AppliedDateRange) => {
            const { updates, remove } = buildDateRangeUrlUpdates(next);
            setParams(updates, remove);
        },
        [setParams],
    );

    const applyDateRange = useCallback(
        (next: AppliedDateRange) => {
            setApplied(next);

            if (next.range === 'custom') {
                setDraftCustomFrom(next.customFrom);
                setDraftCustomTo(next.customTo);
            }

            syncUrl(next);
        },
        [syncUrl],
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

            applyDateRange({ ...applied, range });
        },
        [applyDateRange, applied, syncUrl],
    );

    const applyCustomRange = useCallback(() => {
        applyDateRange({
            ...applied,
            range: 'custom',
            customFrom: draftCustomFrom,
            customTo: draftCustomTo,
        });
    }, [applyDateRange, applied, draftCustomFrom, draftCustomTo]);

    return {
        range: applied.range,
        customFrom: draftCustomFrom,
        customTo: draftCustomTo,
        from: apiRange.from,
        to: apiRange.to,
        setDatePreset,
        setCustomFrom: setDraftCustomFrom,
        setCustomTo: setDraftCustomTo,
        applyCustomRange,
        isCustomRange: applied.range === 'custom',
        hasPendingCustomRange:
            applied.range === 'custom' &&
            (draftCustomFrom !== applied.customFrom ||
                draftCustomTo !== applied.customTo),
    };
}
