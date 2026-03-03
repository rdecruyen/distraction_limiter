// Mock Chrome API for tests
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({
          siteTimers: {},
          lastResetDate: new Date().toDateString(),
          globalBlockUntil: 0
        });
      }),
      set: jest.fn((obj, callback) => {
        if (callback) callback();
      })
    }
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://mock/${path}`),
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn()
  },
  tabs: {
    query: jest.fn(),
    update: jest.fn(),
    onUpdated: {
      addListener: jest.fn()
    },
    onActivated: {
      addListener: jest.fn()
    }
  },
  windows: {
    onFocusChanged: {
      addListener: jest.fn()
    }
  }
};
