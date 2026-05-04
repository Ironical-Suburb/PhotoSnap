// Reusable Supabase query builder mock factory
export function makeQueryBuilder(resolvedValue: { data: any; error: any; count?: number } = { data: null, error: null }) {
  const builder: any = {};
  const chainMethods = ['select', 'eq', 'neq', 'or', 'in', 'is', 'not', 'gt', 'lt', 'gte', 'lte', 'order', 'limit', 'range', 'filter', 'match', 'contains', 'ilike', 'upsert', 'update', 'delete', 'insert'];
  chainMethods.forEach((m) => { builder[m] = jest.fn().mockReturnValue(builder); });
  builder.single = jest.fn().mockResolvedValue(resolvedValue);
  builder.maybeSingle = jest.fn().mockResolvedValue(resolvedValue);
  // Make the builder itself a thenable so awaiting it works
  builder.then = (resolve: any, reject: any) => Promise.resolve(resolvedValue).then(resolve, reject);
  return builder;
}

export function makeMockSupabase(overrides: Record<string, any> = {}) {
  return {
    from: jest.fn().mockReturnValue(makeQueryBuilder()),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.jpg' }, error: null }),
      }),
    },
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    }),
    removeChannel: jest.fn(),
    ...overrides,
  };
}
