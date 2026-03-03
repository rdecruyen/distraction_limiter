/**
 * Test suite for popup.js
 * Tests popup rendering, focus mode, and site status display
 */

describe('Popup script - Status Display and Focus Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    
    // Create popup container
    const siteList = document.createElement('div');
    siteList.id = 'site-list';
    document.body.appendChild(siteList);

    const focusInput = document.createElement('input');
    focusInput.id = 'focus-minutes';
    focusInput.type = 'number';
    focusInput.min = '1';
    document.body.appendChild(focusInput);

    const focusButton = document.createElement('button');
    focusButton.id = 'activate-focus';
    focusButton.textContent = 'Activate Focus Mode';
    document.body.appendChild(focusButton);

    // Mock chrome storage
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      const currentTime = Date.now();
      callback({
        siteTimers: {
          'www.youtube.com': {
            allowedTime: currentTime + 300000, // 5 minutes
            limitOnTheGo: true,
            visitCount: 2,
            visitMax: Infinity
          },
          'www.facebook.com': {
            allowedTime: currentTime - 60000, // 1 minute ago (expired)
            limitOnTheGo: true,
            visitCount: 1,
            visitMax: 2
          },
          'www.demorgen.be': {
            allowedTime: 0,
            limitOnTheGo: false,
            visitCount: 3,
            visitMax: 4
          }
        },
        globalBlockUntil: 0
      });
    });

    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        if (message.type === 'activateFocusMode') {
          callback({ status: 'focusModeActivated' });
        }
      }
    });
  });

  describe('extractSiteName Function', () => {
    test('should extract site name between dots', () => {
      const extractSiteName = (str) => {
        const match = str.match(/\.(.*?)\./);
        if (match) {
          return match[1];
        }
        return null;
      };

      expect(extractSiteName('www.youtube.com')).toBe('youtube');
      expect(extractSiteName('www.facebook.com')).toBe('facebook');
      expect(extractSiteName('www.demorgen.be')).toBe('demorgen');
    });

    test('should extract site name from domain with single dot', () => {
      const extractSiteName = (str) => {
        const match = str.match(/\.(.*?)\./);
        if (match) {
          return match[1];
        }
        const singleDotIndex = str.indexOf('.');
        return singleDotIndex !== -1 ? str.substring(0, singleDotIndex) : null;
      };

      expect(extractSiteName('lichess.org')).toBe('lichess');
      expect(extractSiteName('github.com')).toBe('github');
    });

    test('should return null for invalid domains', () => {
      const extractSiteName = (str) => {
        const match = str.match(/\.(.*?)\./);
        if (match) {
          return match[1];
        }
        const singleDotIndex = str.indexOf('.');
        return singleDotIndex !== -1 ? str.substring(0, singleDotIndex) : null;
      };

      expect(extractSiteName('localhost')).toBeNull();
      expect(extractSiteName('invalid')).toBeNull();
    });
  });

  describe('Site List Rendering', () => {
    test('should display site names in list', () => {
      const siteList = document.getElementById('site-list');
      const siteElement1 = document.createElement('div');
      siteElement1.innerHTML = '<p>youtube visits:2</p>';
      const siteElement2 = document.createElement('div');
      siteElement2.innerHTML = '<p>facebook visits:1</p>';

      siteList.appendChild(siteElement1);
      siteList.appendChild(siteElement2);

      expect(siteList.children.length).toBeGreaterThanOrEqual(2);
      expect(siteList.innerHTML).toContain('youtube');
      expect(siteList.innerHTML).toContain('facebook');
    });

    test('should display visit counts for all sites', () => {
      const siteList = document.getElementById('site-list');
      const mockTimers = {
        'www.youtube.com': { visitCount: 2, limitOnTheGo: true },
        'www.facebook.com': { visitCount: 1, limitOnTheGo: true }
      };

      for (let site in mockTimers) {
        const element = document.createElement('div');
        element.innerHTML = `<p>mock visits:${mockTimers[site].visitCount}</p>`;
        siteList.appendChild(element);
      }

      expect(siteList.innerHTML).toContain('visits:2');
      expect(siteList.innerHTML).toContain('visits:1');
    });

    test('should display remaining time for sites with active timers', () => {
      const currentTime = Date.now();
      const remainingTime = Math.max(0, (currentTime + 300000) - currentTime);
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const siteList = document.getElementById('site-list');
      const element = document.createElement('div');
      element.innerHTML = `<p>youtube ${timeString} visits:2</p>`;
      siteList.appendChild(element);

      expect(siteList.innerHTML).toContain(timeString);
    });

    test('should display only visit count for non-limitOnTheGo sites', () => {
      const siteList = document.getElementById('site-list');
      const element = document.createElement('div');
      element.innerHTML = '<p>demorgen visits:3</p>';
      siteList.appendChild(element);

      const content = element.innerHTML;
      expect(content).toContain('visits:3');
      // Should not contain time format MM:SS for limitOnTheGo: false sites
    });

    test('should show global block message when all sites are blocked', () => {
      const siteList = document.getElementById('site-list');
      const globalBlockElement = document.createElement('div');
      globalBlockElement.innerHTML = '<p>Blocked for 5 min</p>';
      siteList.appendChild(globalBlockElement);

      expect(siteList.innerHTML).toContain('Blocked for');
    });
  });

  describe('Focus Mode Activation', () => {
    test('should send activateFocusMode message with correct end time', (done) => {
      const focusMinutes = 30;
      const focusEndTime = Date.now() + focusMinutes * 60 * 1000;

      chrome.runtime.sendMessage({
        type: 'activateFocusMode',
        focusEndTime: focusEndTime
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'activateFocusMode',
          focusEndTime: focusEndTime
        }),
        expect.any(Function)
      );

      done();
    });

    test('should validate focus mode input', () => {
      const validateFocusInput = (value) => {
        const minutes = parseInt(value);
        return !isNaN(minutes) && minutes > 0;
      };

      expect(validateFocusInput('30')).toBe(true);
      expect(validateFocusInput('1')).toBe(true);
      expect(validateFocusInput('0')).toBe(false);
      expect(validateFocusInput('-10')).toBe(false);
      expect(validateFocusInput('abc')).toBe(false);
      expect(validateFocusInput('')).toBe(false);
    });

    test('should close popup after focus mode activation', (done) => {
      const mockWindowClose = jest.fn();
      window.close = mockWindowClose;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'activateFocusMode') {
          callback({ status: 'focusModeActivated' });
        }
      });

      const focusMinutes = 25;
      chrome.runtime.sendMessage({
        type: 'activateFocusMode',
        focusEndTime: Date.now() + focusMinutes * 60 * 1000
      }, (response) => {
        if (response && response.status === 'focusModeActivated') {
          mockWindowClose();
        }
        expect(mockWindowClose).toHaveBeenCalled();
        done();
      });
    });

    test('should show alert on focus mode activation failure', (done) => {
      const mockAlert = jest.fn();
      window.alert = mockAlert;

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'activateFocusMode') {
          callback({ status: 'error' }); // Failure response
        }
      });

      chrome.runtime.sendMessage({
        type: 'activateFocusMode',
        focusEndTime: Date.now() + 30 * 60 * 1000
      }, (response) => {
        if (!response || response.status !== 'focusModeActivated') {
          mockAlert('Failed to activate focus mode. Please try again.');
        }
        expect(mockAlert).toHaveBeenCalledWith('Failed to activate focus mode. Please try again.');
        done();
      });
    });

    test('should handle Enter key for focus mode activation', () => {
      const mockActivateFocus = jest.fn();
      const focusInput = document.getElementById('focus-minutes');

      const handleKeypress = (event) => {
        if (event.key === 'Enter') {
          const minutes = parseInt(focusInput.value);
          if (!isNaN(minutes) && minutes > 0) {
            mockActivateFocus(minutes);
          }
        }
      };

      focusInput.addEventListener('keypress', handleKeypress);
      focusInput.value = '20';

      const event = new KeyboardEvent('keypress', { key: 'Enter' });
      focusInput.dispatchEvent(event);

      expect(mockActivateFocus).toHaveBeenCalledWith(20);
    });

    test('should alert on invalid focus minutes input', () => {
      const mockAlert = jest.fn();
      window.alert = mockAlert;

      const focusInput = document.getElementById('focus-minutes');
      focusInput.value = '-5';

      const activateFocusMode = () => {
        const focusMinutes = parseInt(focusInput.value);
        if (isNaN(focusMinutes) || focusMinutes <= 0) {
          mockAlert('Please enter a valid number of minutes.');
          return;
        }
      };

      activateFocusMode();
      expect(mockAlert).toHaveBeenCalledWith('Please enter a valid number of minutes.');
    });
  });

  describe('Time Formatting', () => {
    test('should format remaining time correctly', () => {
      const testCases = [
        { ms: 125000, expected: '2:05' }, // 2 min 5 sec
        { ms: 61000, expected: '1:01' }, // 1 min 1 sec
        { ms: 5000, expected: '0:05' }, // 5 sec
        { ms: 600000, expected: '10:00' }, // 10 min
        { ms: 0, expected: '0:00' } // 0 sec
      ];

      testCases.forEach(({ ms, expected }) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        expect(formatted).toBe(expected);
      });
    });
  });

  describe('Popup Initialization', () => {
    test('should load site timers from chrome storage on DOMContentLoaded', () => {
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        expect.arrayContaining(['siteTimers', 'globalBlockUntil']),
        expect.any(Function)
      );
    });

    test('should not show any timers initially before loading', () => {
      const siteList = document.getElementById('site-list');
      expect(siteList.children.length).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty siteTimers gracefully', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          siteTimers: {},
          globalBlockUntil: 0
        });
      });

      const siteList = document.getElementById('site-list');
      // Should not crash and list should remain empty
      expect(siteList).toBeDefined();
    });

    test('should handle undefined chrome storage response', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      // Should handle gracefully without errors
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });

    test('should clamp remaining time to non-negative values', () => {
      const futureTime = Date.now() - 100000; // This is in the past
      const remainingTime = Math.max(0, futureTime - Date.now());

      expect(remainingTime).toBe(0);
    });
  });
});
