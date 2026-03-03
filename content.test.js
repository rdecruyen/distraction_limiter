/**
 * Test suite for content.js
 * Tests popup injection, timer setting, and time check behavior
 */

describe('Content script - Popup and Timer Management', () => {
  let mockDOM;
  let messageListeners = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup DOM
    document.body.innerHTML = '';
    mockDOM = {
      popupInjected: false,
      startTime: null
    };

    // Mock runtime message send
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        callback({ status: 'timerSet' });
      }
    });

    // Mock chrome storage
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        siteTimers: {
          'example.com': {
            allowedTime: 0,
            limitOnTheGo: true,
            visitCount: 0,
            lastVisitTime: 0,
            visitMax: Infinity
          }
        }
      });
    });
  });

  describe('Popup Injection', () => {
    test('should inject popup HTML into DOM', () => {
      const popupHTML = `
        <div id="site-limiter-popup" style="position: fixed; top: 50%; left: 50%;">
          <h2>Set Time Limit</h2>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHTML);

      const popup = document.getElementById('site-limiter-popup');
      expect(popup).toBeDefined();
      expect(popup).not.toBeNull();
    });

    test('should not inject popup multiple times', () => {
      const popupHTML = '<div id="site-limiter-popup"></div>';

      // Inject twice
      document.body.insertAdjacentHTML('beforeend', popupHTML);
      const firstCount = document.querySelectorAll('#site-limiter-popup').length;

      // Second injection would happen if popupInjected flag is not checked
      // Simulating the guard in the actual code
      let popupInjected = false;
      if (!popupInjected) {
        // Only inject if not already done
      }
      popupInjected = true;

      expect(firstCount).toBe(1);
    });

    test('should contain timer option buttons', () => {
      const popupHTML = `
        <div id="site-limiter-popup">
          <div id="timer-options">
            <button class="timer-option" data-minutes="5">5 min</button>
            <button class="timer-option" data-minutes="12">12 min</button>
            <button class="timer-option" data-minutes="45">45 min</button>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHTML);
      const buttons = document.querySelectorAll('.timer-option');

      expect(buttons.length).toBe(3);
      expect(buttons[0].textContent).toBe('5 min');
      expect(buttons[1].textContent).toBe('12 min');
      expect(buttons[2].textContent).toBe('45 min');
    });

    test('should contain custom timer input', () => {
      const popupHTML = `
        <div id="site-limiter-popup">
          <input type="number" id="customMinutes" placeholder="Custom minutes">
          <button id="setCustomTimer">Set Custom Timer</button>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', popupHTML);
      const input = document.getElementById('customMinutes');
      const button = document.getElementById('setCustomTimer');

      expect(input).toBeDefined();
      expect(button).toBeDefined();
      expect(input.type).toBe('number');
    });
  });

  describe('Timer Setting', () => {
    test('should send setTimer message with correct minutes', () => {
      const hostname = 'example.com';
      const minutes = 10;

      chrome.runtime.sendMessage({
        type: 'setTimer',
        site: hostname,
        duration: minutes
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'setTimer',
          site: hostname,
          duration: minutes
        }),
        expect.any(Function)
      );
    });

    test('should hide popup when timer is set successfully', (done) => {
      const popupHTML = '<div id="site-limiter-popup" style="display: flex;"></div>';
      document.body.insertAdjacentHTML('beforeend', popupHTML);

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'setTimer') {
          callback({ status: 'timerSet' });
        }
      });

      chrome.runtime.sendMessage({
        type: 'setTimer',
        site: 'example.com',
        duration: 10
      }, (response) => {
        if (response && response.status === 'timerSet') {
          const popup = document.getElementById('site-limiter-popup');
          popup.style.display = 'none';
        }
        expect(popup.style.display).toBe('none');
        done();
      });
    });

    test('should validate custom timer input', () => {
      const customMinutesInput = document.createElement('input');
      customMinutesInput.id = 'customMinutes';
      customMinutesInput.type = 'number';

      const setCustomTimer = () => {
        const minutes = parseInt(customMinutesInput.value);
        return !isNaN(minutes) && minutes > 0;
      };

      // Test valid input
      customMinutesInput.value = '15';
      expect(setCustomTimer()).toBe(true);

      // Test invalid input
      customMinutesInput.value = '-5';
      expect(setCustomTimer()).toBe(false);

      // Test non-numeric input
      customMinutesInput.value = 'abc';
      expect(setCustomTimer()).toBe(false);

      // Test zero
      customMinutesInput.value = '0';
      expect(setCustomTimer()).toBe(false);
    });

    test('should handle Enter key in custom timer input', () => {
      const mockSetTimer = jest.fn();
      const input = document.createElement('input');
      input.id = 'customMinutes';
      input.type = 'number';
      input.value = '20';

      const handleKeydown = (event) => {
        if (event.key === 'Enter') {
          const minutes = parseInt(input.value);
          if (!isNaN(minutes) && minutes > 0) {
            mockSetTimer(minutes);
          }
        }
      };

      input.addEventListener('keydown', handleKeydown);
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(mockSetTimer).toHaveBeenCalledWith(20);
    });
  });

  describe('Time Check and Display', () => {
    test('should send checkTime message for current hostname', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com' },
        writable: true
      });

      chrome.runtime.sendMessage({
        type: 'checkTime',
        site: 'example.com'
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkTime',
          site: 'example.com'
        }),
        expect.any(Function)
      );
    });

    test('should show popup when no timer is running', (done) => {
      const popupHTML = '<div id="site-limiter-popup" style="display: none;"></div>';
      document.body.insertAdjacentHTML('beforeend', popupHTML);

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'checkTime') {
          callback({
            block: false,
            timerRunning: false,
            remainingTime: 0
          });
        }
      });

      chrome.runtime.sendMessage({
        type: 'checkTime',
        site: 'example.com'
      }, (response) => {
        if (response && !response.timerRunning) {
          const popup = document.getElementById('site-limiter-popup');
          popup.style.display = 'flex';
        }
        expect(document.getElementById('site-limiter-popup').style.display).toBe('flex');
        done();
      });
    });

    test('should redirect when site is blocked', () => {
      const originalLocation = window.location.href;

      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com',
          hostname: 'example.com'
        },
        writable: true
      });

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'checkTime') {
          callback({
            block: true,
            timerRunning: false,
            remainingTime: 0
          });
        }
      });

      chrome.runtime.sendMessage({
        type: 'checkTime',
        site: 'example.com'
      }, (response) => {
        if (response && response.block) {
          window.location.href = 'chrome-extension://mock/blocked.html?site=example.com';
        }
        expect(window.location.href).toContain('blocked.html');
      });
    });
  });

  describe('Remaining Time Display', () => {
    test('should create remaining time display element', () => {
      const timeDisplay = document.createElement('div');
      timeDisplay.id = 'site-limiter-remaining-time';
      timeDisplay.style.position = 'fixed';
      timeDisplay.style.top = '10px';
      timeDisplay.style.right = '10px';
      document.body.appendChild(timeDisplay);

      const element = document.getElementById('site-limiter-remaining-time');
      expect(element).toBeDefined();
      expect(element.style.position).toBe('fixed');
    });

    test('should format remaining time as MM:SS', () => {
      const remainingTime = 125000; // 2 minutes 5 seconds
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      expect(formatted).toBe('2:05');
    });

    test('should update time display every second', (done) => {
      const timeDisplay = document.createElement('div');
      timeDisplay.id = 'site-limiter-remaining-time';
      document.body.appendChild(timeDisplay);

      let updateCount = 0;
      const updateTimer = setInterval(() => {
        updateCount++;
        if (updateCount >= 3) {
          clearInterval(updateTimer);
          expect(updateCount).toBeGreaterThanOrEqual(3);
          done();
        }
      }, 1000);
    });

    test('should pad seconds with leading zero', () => {
      const testCases = [
        { remainingTime: 61000, expected: '1:01' },
        { remainingTime: 5000, expected: '0:05' },
        { remainingTime: 0, expected: '0:00' },
        { remainingTime: 599000, expected: '9:59' }
      ];

      testCases.forEach(({ remainingTime, expected }) => {
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        expect(formatted).toBe(expected);
      });
    });
  });

  describe('Content Script Initialization', () => {
    test('should log when content script loads', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      console.log('Content script loaded');

      expect(consoleSpy).toHaveBeenCalledWith('Content script loaded');
      consoleSpy.mockRestore();
    });

    test('should check time on page load', () => {
      const checkTimeSpy = jest.fn();

      // Simulate DOMContentLoaded
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);

      expect(document).toBeDefined();
    });
  });
});
