const messaging = () => ({
  setBackgroundMessageHandler: jest.fn(),
  getToken: jest.fn().mockResolvedValue('fcm-test-token'),
  requestPermission: jest.fn().mockResolvedValue(1),
  hasPermission: jest.fn().mockResolvedValue(1),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
});
module.exports = messaging;
module.exports.default = messaging;
