// Import the config
import { BLOCKED_SITES } from './config.js';

let siteTimers = {};
let lastResetDate = new Date().toDateString();
// TODO: remaining time element is not shown when yt is closed, then opened again later

// Initialize timers for each site
BLOCKED_SITES.forEach(site => {
  siteTimers[site.domain] = {
    allowedTime: 0,
    blockUntil: 0
  };
});

chrome.storage.local.get(['siteTimers', 'lastResetDate'], (result) => {
  lastResetDate = result.lastResetDate || new Date().toDateString();
  siteTimers = result.siteTimers || siteTimers;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "setTimer") {
    const { site, duration } = message;
    const currentTime = Date.now();
    if (currentTime < siteTimers[site].blockUntil) {
      sendResponse({ status: "blocked", remainingCooldown: Math.ceil((siteTimers[site].blockUntil - currentTime) / 60000) });
    } else {
      siteTimers[site].allowedTime = currentTime + duration * 60000;
      siteTimers[site].blockUntil = siteTimers[site].allowedTime + 10 * 60000;
      chrome.storage.local.set({ siteTimers });
      sendResponse({ status: "timerSet" });
      checkTabs();
    }
  }
  if (message.type === "checkTime") {
    const { site } = message;
    const currentTime = Date.now();
    sendResponse({ 
      block: currentTime > siteTimers[site].allowedTime && currentTime < siteTimers[site].blockUntil,
      timerRunning: currentTime < siteTimers[site].allowedTime,
      remainingTime: Math.max(0, siteTimers[site].allowedTime - currentTime)
    });
  }
  return true;
});

function checkTabs() {
  const currentTime = Date.now();
  BLOCKED_SITES.forEach(site => {
    chrome.tabs.query({ url: `*://*.${site.domain}/*` }, (tabs) => {
      if (tabs && Array.isArray(tabs)) {
        tabs.forEach((tab) => {
          if (currentTime > siteTimers[site.domain].allowedTime && currentTime < siteTimers[site.domain].blockUntil) {
            chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") + `?site=${site.name}` });
          }
        });
      }
    });
  });
}

setInterval(checkTabs, 1000);

chrome.tabs.onUpdated.addListener(checkTabs);
chrome.tabs.onActivated.addListener(checkTabs);
chrome.windows.onFocusChanged.addListener(checkTabs);
