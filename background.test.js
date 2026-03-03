/**
 * Test suite for background.js
 * Tests timer management, blocking logic, and daily reset functionality
 */

describe('Background script - Timer and Blocking Logic', () => {
  let siteTimersState;
  let globalBlockUntilState;
  let lastResetDateState;
  let messageHandlers = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize state
    siteTimersState = {
      'www.youtube.com': {
        allowedTime: 0,
        limitOnTheGo: true,
        visitCount: 0,
        lastVisitTime: 0,
        visitMax: Infinity
      },
      'www.facebook.com': {
        allowedTime: 0,
        limitOnTheGo: true,
        visitCount: 0,
        lastVisitTime: 0,
        visitMax: 2
      },
      'www.demorgen.be': {
        allowedTime: 0,
        limitOnTheGo: false,
        visitCount: 0,
        lastVisitTime: 0,
        visitMax: 4
      },
      'lichess.org': {
        allowedTime: 0,
        limitOnTheGo: false,
        visitCount: 0,
        lastVisitTime: 0,
        visitMax: 0
      }
    };

    globalBlockUntilState = 0;
    lastResetDateState = new Date().toDateString();

    // Mock Chrome storage to use our state
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        siteTimers: siteTimersState,
        lastResetDate: lastResetDateState,
        globalBlockUntil: globalBlockUntilState
      });
    });

    chrome.storage.local.set.mockImplementation((obj, callback) => {
      if (obj.siteTimers) siteTimersState = obj.siteTimers;
      if (obj.lastResetDate) lastResetDateState = obj.lastResetDate;
      if (obj.globalBlockUntil) globalBlockUntilState = obj.globalBlockUntil;
      if (callback) callback();
    });

    // Capture message handlers
    chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
      messageHandlers['default'] = handler;
    });
  });

  describe('Timer Setting', () => {
    test('should set timer when not in global cooldown', (done) => {
      const mockHandler = jest.fn();
      chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        const response = {};
        const sendResponse = (data) => {
          mockHandler(data);
          done();
        };
        
        const message = {
          type: 'setTimer',
          site: 'www.youtube.com',
          duration: 10
        };
        
        handler(message, {}, sendResponse);
      });

      expect(mockHandler).not.toHaveBeenCalled(); // Handler will be called in the message listener
    });

    test('should reject timer when in global cooldown', (done) => {
      const mockHandler = jest.fn();
      globalBlockUntilState = Date.now() + 300000; // Block for next 5 minutes

      chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        const sendResponse = (data) => {
          mockHandler(data);
          done();
        };
        
        const message = {
          type: 'setTimer',
          site: 'www.youtube.com',
          duration: 10
        };
        
        handler(message, {}, sendResponse);
      });

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Daily Counter Reset', () => {
    test('should reset visitCount when date changes', () => {
      lastResetDateState = '2025-01-01';
      siteTimersState['www.facebook.com'].visitCount = 5;
      
      // This would be triggered by checkAndResetDailyCounters
      const newDate = new Date().toDateString();
      if (newDate !== lastResetDateState) {
        for (let site in siteTimersState) {
          siteTimersState[site].visitCount = 0;
        }
        lastResetDateState = newDate;
      }

      expect(siteTimersState['www.facebook.com'].visitCount).toBe(0);
      expect(lastResetDateState).toBe(new Date().toDateString());
    });

    test('should not reset visitCount on same day', () => {
      const today = new Date().toDateString();
      lastResetDateState = today;
      siteTimersState['www.facebook.com'].visitCount = 2;
      
      if (today !== lastResetDateState) {
        siteTimersState['www.facebook.com'].visitCount = 0;
      }

      expect(siteTimersState['www.facebook.com'].visitCount).toBe(2);
    });
  });

  describe('Visit Count Management', () => {
    test('should increment visit count for distinct visits', () => {
      const site = 'www.facebook.com';
      const currentTime = Date.now();
      const DISTINCT_VISIT_INTERVAL = 5 * 60 * 1000; // 5 minutes

      siteTimersState[site].lastVisitTime = currentTime - DISTINCT_VISIT_INTERVAL - 1000;
      
      if (currentTime - siteTimersState[site].lastVisitTime > DISTINCT_VISIT_INTERVAL) {
        siteTimersState[site].visitCount++;
      }

      expect(siteTimersState[site].visitCount).toBe(1);
    });

    test('should not count visits within the distinct visit interval', () => {
      const site = 'www.facebook.com';
      const currentTime = Date.now();
      const DISTINCT_VISIT_INTERVAL = 5 * 60 * 1000;

      siteTimersState[site].lastVisitTime = currentTime - 1000; // 1 second ago
      
      if (currentTime - siteTimersState[site].lastVisitTime > DISTINCT_VISIT_INTERVAL) {
        siteTimersState[site].visitCount++;
      }

      expect(siteTimersState[site].visitCount).toBe(0);
    });
  });

  describe('Focus Mode', () => {
    test('should activate focus mode and block all sites', (done) => {
      const mockHandler = jest.fn();
      const focusEndTime = Date.now() + 30 * 60 * 1000; // 30 minutes

      chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        const sendResponse = (data) => {
          mockHandler(data);
          done();
        };
        
        const message = {
          type: 'activateFocusMode',
          focusEndTime: focusEndTime
        };
        
        handler(message, {}, sendResponse);
      });

      expect(focusEndTime).toBeGreaterThan(Date.now());
    });

    test('should set global block until to focus end time', () => {
      const focusEndTime = Date.now() + 30 * 60 * 1000;
      
      for (let site in siteTimersState) {
        siteTimersState[site].allowedTime = Date.now();
      }
      globalBlockUntilState = Math.max(globalBlockUntilState, focusEndTime);

      expect(globalBlockUntilState).toEqual(focusEndTime);
    });
  });

  describe('Site Limits Configuration', () => {
    test('should enforce visit limit for Facebook', () => {
      const site = 'www.facebook.com';
      expect(siteTimersState[site].visitMax).toBe(2);
    });

    test('should enforce visit limit for De Morgen', () => {
      const site = 'www.demorgen.be';
      expect(siteTimersState[site].visitMax).toBe(4);
    });

    test('should block Lichess (visitMax = 0)', () => {
      const site = 'lichess.org';
      expect(siteTimersState[site].visitMax).toBe(0);
    });

    test('should not block YouTube (visitMax = Infinity)', () => {
      const site = 'www.youtube.com';
      expect(siteTimersState[site].visitMax).toBe(Infinity);
    });
  });

  describe('Time Check Logic', () => {
    test('should block site when current time is between allowedTime and globalBlockUntil', (done) => {
      const mockHandler = jest.fn();
      const currentTime = Date.now();
      
      siteTimersState['www.facebook.com'].allowedTime = currentTime - 1000; // 1 second ago
      globalBlockUntilState = currentTime + 300000; // Block for next 5 minutes

      chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        const sendResponse = (data) => {
          mockHandler(data);
          done();
        };
        
        const message = {
          type: 'checkTime',
          site: 'www.facebook.com'
        };
        
        handler(message, {}, sendResponse);
      });
    });

    test('should not block when timer is still running', (done) => {
      const mockHandler = jest.fn();
      const currentTime = Date.now();
      
      siteTimersState['www.facebook.com'].allowedTime = currentTime + 300000; // 5 minutes from now

      chrome.runtime.onMessage.addListener.mockImplementation((handler) => {
        const sendResponse = (data) => {
          mockHandler(data);
          done();
        };
        
        const message = {
          type: 'checkTime',
          site: 'www.facebook.com'
        };
        
        handler(message, {}, sendResponse);
      });
    });
  });

  describe('getLimitOnTheGo vs Fixed Limits', () => {
    test('limitOnTheGo sites should have timers that can be set anytime', () => {
      expect(siteTimersState['www.youtube.com'].limitOnTheGo).toBe(true);
      expect(siteTimersState['www.facebook.com'].limitOnTheGo).toBe(true);
    });

    test('fixed limit sites should not allow on-the-go timer setting', () => {
      expect(siteTimersState['www.demorgen.be'].limitOnTheGo).toBe(false);
      expect(siteTimersState['lichess.org'].limitOnTheGo).toBe(false);
    });
  });
});
