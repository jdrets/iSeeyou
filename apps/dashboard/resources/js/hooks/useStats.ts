import { useQuery } from '@tanstack/react-query';
import { api, type StatsParams, type StatsResponse } from '@/lib/api';

export function useStats(params: StatsParams = {}) {
    return useQuery<StatsResponse, Error>({
        queryKey: ['stats', params],
        queryFn: () => api.stats(params),
        staleTime: 1000 * 60, // 1 minute
    });
}
