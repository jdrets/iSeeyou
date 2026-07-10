import { format, parseISO } from 'date-fns';

/** ClickHouse timestamps arrive as UTC without a timezone suffix. */
function toUtcIso(value: string): string {
    const trimmed = value.trim();

    if (trimmed.includes('T')) {
        return /(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed)
            ? trimmed
            : `${trimmed}Z`;
    }

    return `${trimmed.replace(' ', 'T')}Z`;
}

export function parseUtcTimestamp(value: string): Date {
    return parseISO(toUtcIso(value));
}

export function formatUtcTimestamp(
    value: string | undefined | null,
    pattern = 'yyyy-MM-dd HH:mm:ss',
): string {
    if (!value) {
        return '—';
    }

    return format(parseUtcTimestamp(value), pattern);
}
