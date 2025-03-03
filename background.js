let allowedTime = 0;
let blockUntil = 0;
let lastResetDate = new Date().toDateString();
// TODO: remaining time element is not shown when yt is closed, then opened again later

chrome.storage.local.get(['dailyUsage', 'lastResetDate', 'blockUntil', 'lichessUsage'], (result) => {
  lastResetDate = result.lastResetDate || new Date().toDateString();
  blockUntil = result.blockUntil || 0;
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "setTimer") {
    const currentTime = Date.now();
    if (currentTime < blockUntil) {
      sendResponse({ status: "blocked", remainingCooldown: Math.ceil((blockUntil - currentTime) / 60000) });
    } else {
      allowedTime = currentTime + message.duration * 60000;
      blockUntil = allowedTime + 10 * 60000;
      chrome.storage.local.set({ blockUntil });
      sendResponse({ status: "timerSet" });
      checkTabs();
    }
  }
  if (message.type === "checkTime") {
    const currentTime = Date.now();
    sendResponse({ 
      block: currentTime > allowedTime && currentTime < blockUntil,
      timerRunning: currentTime < allowedTime,
      remainingTime: Math.max(0, allowedTime - currentTime)
    });
  }
  return true; // This line is crucial for asynchronous response
});

function checkTabs() {
  const currentTime = Date.now();
  chrome.tabs.query({ url: "*://*.youtube.com/*" }, (tabs) => {
    if (tabs && Array.isArray(tabs)) {
      tabs.forEach((tab) => {
        if (currentTime > allowedTime && currentTime < blockUntil) {
          chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
        }
      });
    } else {
      console.log("No YouTube tabs found or tabs is not an array");
    }
  });
}

setInterval(checkTabs, 1000);

chrome.tabs.onUpdated.addListener(checkTabs);
chrome.tabs.onActivated.addListener(checkTabs);
chrome.windows.onFocusChanged.addListener(checkTabs);
