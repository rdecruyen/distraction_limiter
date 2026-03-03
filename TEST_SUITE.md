# Distraction Limiter - Test Suite

This directory contains a comprehensive test suite for the Distraction Limiter Chrome extension, built with **Jest** and **jsdom**.

## Setup

### Install Dependencies
```bash
npm install
```

This will install:
- **jest** (^29.6.1) - JavaScript testing framework
- **jsdom** (^22.1.0) - DOM implementation for Node.js

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage Report
```bash
npm test -- --coverage
```

### Run Specific Test File
```bash
npm test background.test.js
npm test content.test.js
npm test popup.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Suite Overview

### 1. **background.test.js** (Background Script Tests)
Tests the core timer and blocking logic in `background.js`.

**Key Test Groups:**
- **Timer Setting**: Validates timer creation and cooldown period enforcement
- **Daily Counter Reset**: Tests daily visit count reset mechanism (5-minute distinct visit interval)
- **Visit Count Management**: Tests visit counting for distinct visits vs rapid revisits
- **Focus Mode**: Tests activation of focus mode to block all sites
- **Site Limits Configuration**: Verifies per-site visit limits (Facebook: 2, De Morgen: 4, Lichess: 0, YouTube: ∞)
- **Time Check Logic**: Tests blocking logic based on time windows
- **LimitOnTheGo vs Fixed Limits**: Tests different timer behaviors for different site types

**Sample Test:**
```javascript
test('should set timer when not in global cooldown', ...);
test('should reject timer when in global cooldown', ...);
test('should enforce visit limit for Facebook', ...);
```

---

### 2. **content.test.js** (Content Script Tests)
Tests popup injection, timer setting, and page-level checks in `content.js`.

**Key Test Groups:**
- **Popup Injection**: Tests DOM manipulation for popup creation
- **Timer Setting**: Tests message passing and timer validation
- **Time Check and Display**: Tests blocking redirects and popup visibility
- **Remaining Time Display**: Tests time formatting (MM:SS) and display updates
- **Content Script Initialization**: Tests script loading and periodic checks

**Sample Test:**
```javascript
test('should inject popup HTML into DOM', ...);
test('should validate custom timer input', ...);
test('should redirect when site is blocked', ...);
test('should format remaining time as MM:SS', ...);
```

---

### 3. **popup.test.js** (Popup UI Tests)
Tests the popup interface functionality in `popup.js`.

**Key Test Groups:**
- **extractSiteName Function**: Tests domain name parsing logic
- **Site List Rendering**: Tests display of site status and remaining times
- **Focus Mode Activation**: Tests focus mode UI and message passing
- **Time Formatting**: Tests MM:SS formatting with padding
- **Popup Initialization**: Tests data loading from chrome storage
- **Edge Cases**: Tests error handling for missing/invalid data

**Sample Test:**
```javascript
test('should extract site name between dots', ...);
test('should display visit counts for all sites', ...);
test('should show alert on focus mode activation failure', ...);
```

---

## Test Architecture

### Chrome API Mocking
All tests use Jest mocks for the Chrome Extension API:
- `chrome.storage.local.get()` / `chrome.storage.local.set()`
- `chrome.runtime.sendMessage()` / `onMessage.addListener()`
- `chrome.tabs.query()` / `chrome.tabs.update()`
- `chrome.windows.onFocusChanged.addListener()`

Mock implementation provided in `jest.setup.js`.

### State Management
Tests manage internal state using a mock state object to simulate:
- Site timer configurations
- Global block periods
- Visit counts
- Last reset dates

## Test Statistics

| File | Tests | Coverage |
|------|-------|----------|
| background.test.js | 16 | Timer logic, visit limits, focus mode |
| content.test.js | 17 | Popup injection, DOM updates, redirects |
| popup.test.js | 20 | UI rendering, focus mode, input validation |
| **Total** | **~53** | Comprehensive coverage |

## Key Features Tested

✅ **Timer Management**
- Setting timers with custom durations
- Cooldown period enforcement (10 minutes)
- Distinct visit interval tracking (5 minutes)

✅ **Blocking Logic**
- Per-site visit limits (0-Infinity)
- Time-based blocking windows
- Global and per-site block states

✅ **Focus Mode**
- Activation with custom durations
- All sites blocked during focus period
- UI updates and window closing

✅ **UI Components**
- Popup injection and visibility
- Real-time timer display (MM:SS)
- Site list with visit counts

✅ **Data Persistence**
- Chrome storage integration
- Daily counter resets
- State synchronization across scripts

## Example Test Run Output

```
PASS  background.test.js
  Background script - Timer and Blocking Logic
    Timer Setting
      ✓ should set timer when not in global cooldown
      ✓ should reject timer when in global cooldown
    Daily Counter Reset
      ✓ should reset visitCount when date changes
      ✓ should not reset visitCount on same day
    Visit Count Management
      ✓ should increment visit count for distinct visits
      ✓ should not count visits within the distinct visit interval
    ...

PASS  content.test.js
  Content script - Popup and Timer Management
    Popup Injection
      ✓ should inject popup HTML into DOM
      ✓ should not inject popup multiple times
      ✓ should contain timer option buttons
    Timer Setting
      ✓ should send setTimer message with correct minutes
      ✓ should hide popup when timer is set successfully
    ...

PASS  popup.test.js
  Popup script - Status Display and Focus Mode
    extractSiteName Function
      ✓ should extract site name between dots
      ✓ should extract site name from domain with single dot
    Focus Mode Activation
      ✓ should send activateFocusMode message with correct end time
      ✓ should validate focus mode input
      ✓ should close popup after focus mode activation
    ...

Tests:       53 passed, 53 total
```

## Extending the Tests

To add new tests:

1. **Create a new test file** following the pattern `*.test.js`
2. **Use Jest descriptors**: `describe()`, `test()` or `it()`
3. **Mock Chrome APIs** as needed using existing patterns
4. **Run tests** with `npm test`

Example:
```javascript
describe('New Feature', () => {
  test('should do something', () => {
    // Arrange
    const input = ...;
    // Act
    const result = functionUnderTest(input);
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `npm: command not found` | Install Node.js from nodejs.org |
| Tests timeout | Increase Jest timeout: `jest.setTimeout(10000)` |
| Chrome API errors | Verify mocks in `jest.setup.js` |
| Module not found | Run `npm install` from project root |

## Notes

- Tests use **jsdom** to simulate browser DOM
- Chrome API is fully mocked to prevent actual extension calls
- All tests are synchronous or properly handled with done callbacks
- Tests can be run in parallel (`--runInBand` flag disables parallel for safety)

---

**Last Updated:** February 2026
