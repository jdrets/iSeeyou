/**
 * Fetches the XSRF token cookie value set by Laravel.
 */
function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Base fetch helper that includes Laravel CSRF headers and credentials.
 */
async function apiFetch<T>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
}

export type StatsParams = {
    from?: string;
    to?: string;
};

export type StatsResponse = {
    errors: number;
    logs: number;
    total: number;
};

export type LogEntry = {
    id: string;
    type: 'error' | 'log';
    message: string;
    timestamp: string;
    name?: string;
    url?: string;
    browser?: string;
    os?: string;
};

export type LogDetail = {
    id: string;
    type: 'error' | 'log';
    timestamp: string;
    message: string;
    name: string;
    stack_trace: string;
    url: string;
    referrer: string;
    session_id: string;
    user_id: string;
    user_agent: string;
    browser: string;
    os: string;
    extra: Record<string, unknown> | unknown[];
};

export type LogsParams = {
    type?: 'error' | 'log' | 'all';
    from?: string;
    to?: string;
    page?: number;
    per_page?: number;
};

export type PaginationMeta = {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
};

export type LogsResponse = {
    data: LogEntry[];
    meta: PaginationMeta;
};

export const api = {
    stats(params: StatsParams = {}): Promise<StatsResponse> {
        const query = new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
        ).toString();
        return apiFetch<StatsResponse>(`/api/stats${query ? `?${query}` : ''}`);
    },

    logs(params: LogsParams = {}): Promise<LogsResponse> {
        const query = new URLSearchParams(
            Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
        ).toString();
        return apiFetch<LogsResponse>(`/api/logs${query ? `?${query}` : ''}`);
    },

    logDetail(type: 'error' | 'log', id: string): Promise<LogDetail> {
        return apiFetch<LogDetail>(`/api/logs/${type}/${id}`);
    },
};
