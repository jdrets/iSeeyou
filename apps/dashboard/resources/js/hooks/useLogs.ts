import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api, type LogsParams, type LogsResponse } from '@/lib/api';

export function useLogs(params: LogsParams = {}) {
    return useQuery<LogsResponse, Error>({
        queryKey: ['logs', params],
        queryFn: () => api.logs(params),
        staleTime: 1000 * 30, // 30 seconds
        placeholderData: keepPreviousData,
    });
}
