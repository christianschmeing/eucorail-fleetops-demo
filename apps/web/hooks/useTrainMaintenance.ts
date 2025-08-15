"use client";
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { MaintenanceTask } from '@/types/train';

export function useTrainMaintenance(trainId: string) {
  const isTest = process.env.NEXT_PUBLIC_TEST_MODE === '1';
  return useQuery({
    queryKey: ['maintenance', trainId],
    queryFn: async (): Promise<MaintenanceTask[]> => {
      if (isTest) {
        const now = Date.now();
        return [
          { id:'t1', trainId, title:'Bremsen-Check', dueDate:new Date(now+864e5).toISOString(), status:'DUE_SOON', depot:'Köln' },
          { id:'t2', trainId, title:'Radsatzprüfung', dueDate:new Date(now-864e5*2).toISOString(), status:'OVERDUE', depot:'Köln' }
        ];
      }
      return apiGet<MaintenanceTask[]>(`/api/maintenance/${trainId}`);
    },
    staleTime: 30_000
  });
}


