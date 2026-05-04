module.exports = {
  createURL: jest.fn(() => 'photosnap://'),
  parse: jest.fn((url: string) => {
    const parts = url.split('?');
    const params: Record<string, string> = {};
    if (parts[1]) {
      parts[1].split('&').forEach((p) => {
        const [k, v] = p.split('=');
        params[k] = v;
      });
    }
    return { scheme: 'photosnap', hostname: '', path: '', queryParams: params };
  }),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn().mockResolvedValue(null),
};
