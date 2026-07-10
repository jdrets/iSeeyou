import { useQuery } from '@tanstack/react-query';
import { api, type LogDetail } from '@/lib/api';

export function useLogDetail(
    type: 'error' | 'log' | null,
    id: string | null,
) {
    return useQuery<LogDetail, Error>({
        queryKey: ['log-detail', type, id],
        queryFn: () => api.logDetail(type!, id!),
        enabled: Boolean(type && id),
        staleTime: 1000 * 60,
    });
}
