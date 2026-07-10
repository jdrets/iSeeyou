import { useCallback, useMemo } from 'react';

type UrlParamValue = string | number | undefined | null;

function readSearchParams(): URLSearchParams {
    return new URLSearchParams(window.location.search);
}

function writeSearchParams(params: URLSearchParams): void {
    const query = params.toString();
    const nextUrl = query
        ? `${window.location.pathname}?${query}`
        : window.location.pathname;

    window.history.replaceState(window.history.state, '', nextUrl);
}

export function useUrlSyncedState() {
    const params = useMemo(() => readSearchParams(), []);

    const getParam = useCallback(
        (key: string): string | null => params.get(key),
        [params],
    );

    const setParams = useCallback(
        (updates: Record<string, UrlParamValue>, remove: string[] = []) => {
            const next = readSearchParams();

            for (const key of remove) {
                next.delete(key);
            }

            for (const [key, value] of Object.entries(updates)) {
                if (value === undefined || value === null || value === '') {
                    next.delete(key);
                    continue;
                }

                next.set(key, String(value));
            }

            writeSearchParams(next);
        },
        [],
    );

    return { getParam, setParams };
}
