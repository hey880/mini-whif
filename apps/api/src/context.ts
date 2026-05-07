import { createContextKey } from '@connectrpc/connect';

export type User = {
  id: string;
  email: string;
};

// Create a context key for the authenticated user
export const userContextKey = createContextKey<User | undefined>(undefined, {
  description: 'Authenticated user from auth middleware',
});
