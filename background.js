const BLOCKED_SITES = [
  {
    domain: "youtube.com",
    name: "YouTube",
    defaultLimit: 30 // in minutes
  },
  {
    domain: "facebook.com",
    name: "Facebook",
    defaultLimit: 20
  },
  // Add more sites as needed
];

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
  // console.log("Received message:", message);  // Log incoming messages
  if (message.type === "setTimer") {
    const { site, duration } = message;
    const currentTime = Date.now();
    console.log(`Setting timer for ${site} with duration ${duration}`);  // Log timer setting
    if (currentTime < siteTimers[site].blockUntil) {
      console.log(`${site} is currently in cooldown period`);  // Log cooldown status
      sendResponse({ status: "blocked", remainingCooldown: Math.ceil((siteTimers[site].blockUntil - currentTime) / 60000) });
    } else {
      siteTimers[site].allowedTime = currentTime + duration * 60000;
      siteTimers[site].blockUntil = siteTimers[site].allowedTime + 10 * 60000;
      console.log(`Timer set for ${site}:`, siteTimers[site]);  // Log updated timer
      chrome.storage.local.set({ siteTimers });
      sendResponse({ status: "timerSet" });
      checkTabs();
    }
  }
  if (message.type === "checkTime") {
    const { site } = message;
    const currentTime = Date.now();
    // console.log(`Checking time for ${site}`);
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
  // console.log("Checking tabs at:", new Date(currentTime));  // Log when tabs are checked
  BLOCKED_SITES.forEach(site => {
    chrome.tabs.query({ url: `*://*.${site.domain}/*` }, (tabs) => {
      // console.log(`Found ${tabs.length} tabs for ${site.domain}`);  // Log number of tabs found
      if (tabs && Array.isArray(tabs)) {
        tabs.forEach((tab) => {
          if (currentTime > siteTimers[site.domain].allowedTime && currentTime < siteTimers[site.domain].blockUntil) {
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

