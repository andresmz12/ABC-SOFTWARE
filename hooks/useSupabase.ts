import { useState, useCallback } from 'react';

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await queryFn();
    if (error) setError(error.message);
    else setData(data);
    setLoading(false);
    return data;
  }, [queryFn]);

  return { data, loading, error, execute };
}
