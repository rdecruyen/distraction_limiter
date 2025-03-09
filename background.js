const BLOCKED_SITES = [
  {
    domain: "www.youtube.com",
    name: "YouTube"
  },
  {
    domain: "www.facebook.com",
    name: "Facebook"
  },
  // Add more sites as needed
];

const COOLDOWN_PERIOD = 10 * 60 * 1000; // 10 minutes in milliseconds

let siteTimers = {};
let lastResetDate = new Date().toDateString();
let globalBlockUntil = 0;
// TODO: remaining time element is not shown when yt is closed, then opened again later

// Initialize timers for each site
BLOCKED_SITES.forEach(site => {
  siteTimers[site.domain] = {
    allowedTime: 0
  };
});

chrome.storage.local.get(['siteTimers', 'lastResetDate', 'globalBlockUntil'], (result) => {
  lastResetDate = result.lastResetDate || new Date().toDateString();
  siteTimers = result.siteTimers || siteTimers;
  globalBlockUntil = result.globalBlockUntil || 0;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // console.log("Received message:", message);  // Log incoming messages
  if (message.type === "setTimer") {
    const { site, duration } = message;
    const currentTime = Date.now();
    console.log(`Setting timer for ${site} with duration ${duration}`);  // Log timer setting
    if (currentTime < globalBlockUntil) {
      console.log(`${site} is currently in cooldown period`);  // Log cooldown status
      sendResponse({ status: "blocked", remainingCooldown: Math.ceil((globalBlockUntil - currentTime) / 60000) });
    } else {
      siteTimers[site].allowedTime = currentTime + duration * 60000;
      globalBlockUntil = Math.max(globalBlockUntil, siteTimers[site].allowedTime + COOLDOWN_PERIOD);
      console.log(`Timer set for ${site}:`, siteTimers[site]);  // Log updated timer
      chrome.storage.local.set({ siteTimers, globalBlockUntil });
      sendResponse({ status: "timerSet" });
      checkTabs();
    }
  }
  if (message.type === "checkTime") {
    const { site } = message;
    const currentTime = Date.now();
    // console.log(`Checking time for ${site}`);
    sendResponse({ 
      block: currentTime > siteTimers[site].allowedTime && currentTime < globalBlockUntil,
      timerRunning: currentTime < siteTimers[site].allowedTime,
      remainingTime: Math.max(0, siteTimers[site].allowedTime - currentTime)
    });
  }
  return true;
});

function checkTabs() {
  const currentTime = Date.now();
  // console.log("Checking tabs at:", new Date(currentTime));  // Log when tabs are checked
  BLOCKED_SITES.forEach(site => {
    chrome.tabs.query({ url: `*://*.${site.domain}/*` }, (tabs) => {
      // console.log(`Found ${tabs.length} tabs for ${site.domain}`);  // Log number of tabs found
      if (tabs && Array.isArray(tabs)) {
        tabs.forEach((tab) => {
          if (currentTime > siteTimers[site.domain].allowedTime && currentTime < globalBlockUntil) {
            console.log(`Blocking tab for ${site.domain}`);  // Log when a tab is blocked
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

