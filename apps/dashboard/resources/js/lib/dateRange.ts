import { format, subDays } from 'date-fns';

export type DateRangePreset =
    | 'today'
    | 'since_yesterday'
    | '15_days'
    | 'custom';

export const DATE_RANGE_PRESETS: {
    value: DateRangePreset;
    label: string;
}[] = [
    { value: 'today', label: 'Today' },
    { value: 'since_yesterday', label: 'Since yesterday' },
    { value: '15_days', label: 'Last 15 days' },
    { value: 'custom', label: 'Custom date' },
];

export const DEFAULT_DATE_RANGE_PRESET: DateRangePreset = '15_days';

export function todayString(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

export function resolveDateRange(
    preset: DateRangePreset,
    customFrom?: string,
    customTo?: string,
): { from: string; to: string } {
    const today = todayString();

    switch (preset) {
        case 'today':
            return { from: today, to: today };
        case 'since_yesterday':
            return {
                from: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
                to: today,
            };
        case '15_days':
            return {
                from: format(subDays(new Date(), 15), 'yyyy-MM-dd'),
                to: today,
            };
        case 'custom':
            return {
                from: customFrom ?? format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                to: customTo ?? today,
            };
    }
}

export function isDateRangePreset(value: string): value is DateRangePreset {
    return DATE_RANGE_PRESETS.some((preset) => preset.value === value);
}

/** Local calendar dates → UTC instants for the API (ClickHouse stores UTC). */
export function toApiDateBounds(
    from: string,
    to: string,
): { from: string; to: string } {
    const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
    const [toYear, toMonth, toDay] = to.split('-').map(Number);

    return {
        from: new Date(fromYear, fromMonth - 1, fromDay, 0, 0, 0, 0).toISOString(),
        to: new Date(toYear, toMonth - 1, toDay, 23, 59, 59, 999).toISOString(),
    };
}

export function resolveApiDateRange(
    preset: DateRangePreset,
    customFrom?: string,
    customTo?: string,
): { from: string; to: string } {
    const local = resolveDateRange(preset, customFrom, customTo);

    return toApiDateBounds(local.from, local.to);
}

export function buildLogsHref(options: {
    type?: 'error' | 'log';
    range: DateRangePreset;
    customFrom?: string;
    customTo?: string;
}): string {
    const params = new URLSearchParams();

    if (options.type) {
        params.set('type', options.type);
    }

    if (options.range !== DEFAULT_DATE_RANGE_PRESET) {
        params.set('range', options.range);
    }

    if (options.range === 'custom') {
        const { from, to } = resolveDateRange(
            'custom',
            options.customFrom,
            options.customTo,
        );
        params.set('from', from);
        params.set('to', to);
    }

    const query = params.toString();

    return query ? `/logs?${query}` : '/logs';
}
