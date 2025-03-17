const BLOCKED_SITES = [
  {
    domain: "www.youtube.com",
    name: "YouTube", 
    limitOnTheGo: true
  },
  {
    domain: "www.facebook.com",
    name: "Facebook",
    limitOnTheGo: true
  },
  {
    domain: "www.demorgen.be",
    name: "De Morgen",
    limitOnTheGo: false
  },
  {
    domain: "lichess.org",
    name: "Lichess",
    limitOnTheGo: false
  }
  // Add more sites as needed, add each site to the manifest.json file
];

const COOLDOWN_PERIOD = 10 * 60 * 1000; // 10 minutes in milliseconds
const DISTINCT_VISIT_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

let siteTimers = {};
let lastResetDate = new Date().toDateString();
let globalBlockUntil = 0;
// TODO: remaining time element is not shown when yt is closed, then opened again later

// Initialize timers for each site
BLOCKED_SITES.forEach(site => {
  siteTimers[site.domain] = {
    allowedTime: 0, 
    limitOnTheGo: site.limitOnTheGo,
    visitCount: 0,
    lastVisitTime: 0
  };
});

chrome.storage.local.get(['siteTimers', 'lastResetDate', 'globalBlockUntil'], (result) => {
  lastResetDate = result.lastResetDate || new Date().toDateString();
  siteTimers = result.siteTimers || siteTimers;
  globalBlockUntil = result.globalBlockUntil || 0;

  // Check if it's a new day and reset visit counts if necessary
  const currentDate = new Date().toDateString();
  if (currentDate !== lastResetDate) {
    for (let site in siteTimers) {
      siteTimers[site].visitCount = 0;
      siteTimers[site].lastVisitTime = 0;
    }
    lastResetDate = currentDate;
    chrome.storage.local.set({ siteTimers, lastResetDate });
  }
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
    } else if (siteTimers[site].limitOnTheGo) {
      siteTimers[site].allowedTime = currentTime + duration * 60000;
      // set all timers where limitOnTheGo is false to the same allowed time
      for (let site in siteTimers) {
        if (!siteTimers[site].limitOnTheGo) {
          siteTimers[site].allowedTime = currentTime + duration * 60000;
        }
      }

      globalBlockUntil = Math.max(globalBlockUntil, siteTimers[site].allowedTime + COOLDOWN_PERIOD);
      console.log(`Timer set for ${site}:`, siteTimers[site]);  // Log updated timer
      chrome.storage.local.set({ siteTimers, globalBlockUntil });
      sendResponse({ status: "timerSet" });
      checkTabs();
    } else { // this code should never be reached!
      console.log(`${site} has no limit on the go`)
      // set allowed time to global block until - cooldown period
      siteTimers[site].allowedTime = globalBlockUntil - COOLDOWN_PERIOD;
      chrome.storage.local.set({ siteTimers});
      sendResponse({ status: "timerSet" });
      checkTabs();
    }
  }
  if (message.type === "checkTime") {
    const { site } = message;
    const currentTime = Date.now();
    // console.log(`Checking time for ${site}`);
    // check if site is in the blocked sites list
    if (!siteTimers[site]) {
      return true;
    }
    sendResponse({ 
      block: currentTime > siteTimers[site].allowedTime && currentTime < globalBlockUntil,
      timerRunning: currentTime < siteTimers[site].allowedTime || !siteTimers[site].limitOnTheGo,
      remainingTime: Math.max(0, siteTimers[site].allowedTime - currentTime)
    });
  }
  if (message.type === "activateFocusMode") {
    const currentTime = Date.now();
    globalBlockUntil = Math.max(globalBlockUntil, message.focusEndTime);
    console.log(`Activating focus mode for ${(message.focusEndTime - currentTime)/ 60000} min`);

    for (let site in siteTimers) {
      siteTimers[site].allowedTime = currentTime;
    }

    chrome.storage.local.set({ siteTimers, globalBlockUntil });
    sendResponse({ status: "focusModeActivated" });
  }
  return true;
});

function getFullDomain(domain) {
  return domain.startsWith('www.') ? domain : `www.${domain}`;
}

function checkTabs() {
  const currentTime = Date.now();
  BLOCKED_SITES.forEach(site => {
    const fullDomain = getFullDomain(site.domain);
    chrome.tabs.query({ url: `*://*.${site.domain}/*`, active: true }, (tabs) => {
      if (tabs && Array.isArray(tabs) && tabs.length > 0) {
        try {
          if (currentTime > siteTimers[site.domain].allowedTime && currentTime < globalBlockUntil) {
            console.log(`Blocking tab for ${fullDomain}`);
            chrome.tabs.update(tabs[0].id, { url: chrome.runtime.getURL("blocked.html") + `?site=${site.name}` });
          } else if (currentTime - siteTimers[site.domain].lastVisitTime > DISTINCT_VISIT_INTERVAL) {
            siteTimers[site.domain].visitCount++;// Check if enough time has passed since the last visit
            siteTimers[site.domain].lastVisitTime = currentTime;
            console.log(`Distinct visit recorded for ${fullDomain}. Total visits: ${siteTimers[site.domain].visitCount}`);

            // Save updated siteTimers to storage
            chrome.storage.local.set({ siteTimers });
          }
        } catch (error) {
          console.log(siteTimers)
          console.error(`Error while processing tab for ${fullDomain}:`, error);
        }
      }
    });
  });
}

setInterval(checkTabs, 1000);

chrome.tabs.onUpdated.addListener(checkTabs);
chrome.tabs.onActivated.addListener(checkTabs);
chrome.windows.onFocusChanged.addListener(checkTabs);

