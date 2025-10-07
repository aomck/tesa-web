import { useQuery } from '@tanstack/react-query';
import { getRecentDetections } from '../api/detection';

export const useDetections = (camId: string, token: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['detections', camId],
    queryFn: () => getRecentDetections(camId, token),
    enabled: enabled && !!camId && !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
