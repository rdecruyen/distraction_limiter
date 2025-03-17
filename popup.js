console.log("Popup script loaded");

document.addEventListener('DOMContentLoaded', function() {
  const siteList = document.getElementById('site-list');

  chrome.storage.local.get(['siteTimers', 'globalBlockUntil'], (result) => {
    const { siteTimers, globalBlockUntil } = result;
    let isBlocked = true;
    const currentTime = Date.now();

    for (let site in siteTimers) {
      const remainingTime = Math.max(0, siteTimers[site].allowedTime - currentTime);
      if (remainingTime > 0) {
        isBlocked = false;
      }
      const siteElement = document.createElement('div');
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      if (!siteTimers[site].limitOnTheGo) {
        siteElement.innerHTML = `
        <p>${site.slice(0, -3)} visits:${siteTimers[site].visitCount}</p>`;
      } else {
        siteElement.innerHTML = `
          <p>${site.slice(4, -3)} ${Math.floor(remainingTime / 60000)}:${seconds.toString().padStart(2, '0')} visits:${siteTimers[site].visitCount}</p>
        `;
      }
      siteList.appendChild(siteElement);
    }
    if (globalBlockUntil > currentTime && isBlocked) {
      const siteElement = document.createElement('div');
      siteElement.innerHTML = `<p>Blocked for ${Math.ceil((globalBlockUntil-currentTime)/60000)} min</p>`;
      siteList.appendChild(siteElement);
    }
  });

  const focusMinutesInput = document.getElementById('focus-minutes');
  const activateFocusButton = document.getElementById('activate-focus');

  function activateFocusMode() {
    const focusMinutes = parseInt(focusMinutesInput.value);
    if (isNaN(focusMinutes) || focusMinutes <= 0) {
      alert('Please enter a valid number of minutes.');
      return;
    }

    const focusEndTime = Date.now() + focusMinutes * 60 * 1000;

    chrome.runtime.sendMessage({ 
      type: "activateFocusMode", 
      focusEndTime: focusEndTime 
    }, (response) => {
      if (response && response.status === "focusModeActivated") {
        window.close();
      } else {
        alert('Failed to activate focus mode. Please try again.');
      }
    });
  }

  activateFocusButton.addEventListener('click', activateFocusMode);

  focusMinutesInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      activateFocusMode();
    }
  });


});
