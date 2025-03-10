console.log("Popup script loaded");

document.addEventListener('DOMContentLoaded', function() {
  const siteList = document.getElementById('site-list');

  chrome.storage.local.get(['siteTimers', 'globalBlockUntil'], (result) => {
    const { siteTimers, globalBlockUntil } = result;
    const currentTime = Date.now();

    for (let site in siteTimers) {
      if (!siteTimers[site].limitOnTheGo) {
        continue;
      }
      const remainingTime = Math.max(0, siteTimers[site].allowedTime - currentTime);
      const siteElement = document.createElement('div');
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      siteElement.innerHTML = `
        <p>${site.slice(4, -3)} ${Math.floor(remainingTime / 60000)}:${seconds.toString().padStart(2, '0')}</p>
      `;
      siteList.appendChild(siteElement);
    }
  });
});
