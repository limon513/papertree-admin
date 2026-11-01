import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const ME_KEY = ['me'] as const;

/** When any call says "not signed in", forget the session so the app shows the login page. */
function onError(err: unknown) {
  if (err instanceof ApiError && err.status === 401 && err.code !== 'INVALID_CREDENTIALS') {
    queryClient.setQueryData(ME_KEY, null);
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status > 0 && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});
