'use client';

import { useState, useEffect, useRef } from 'react';
import { jobsApi } from '@/lib/api';

interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  processed_comments: number;
  total_comments: number;
  error_message?: string;
}

export function useJobProgress(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const data = await jobsApi.get(jobId);
        setJob(data);

        // Stop polling when terminal state
        if (['completed', 'failed', 'paused'].includes(data.status)) {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err) {
        console.error('[useJobProgress] Poll error:', err);
      }
    };

    poll(); // immediate first call
    intervalRef.current = setInterval(poll, 2000); // poll every 2s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  return job;
}
