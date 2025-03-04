let startTime;
let popupInjected = false;

function injectPopup() {
  if (popupInjected) return;

  const popupHTML = `
    <div id="site-limiter-popup" style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 400px;
      background-color: white;
      z-index: 9999;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      font-family: Arial, sans-serif;
    ">
      <h2>Set Time Limit for ${window.location.hostname}</h2>
      <div id="timer-options" style="display: flex; justify-content: space-around; width: 100%; margin: 20px 0;">
        <button class="timer-option" data-minutes="5">5 min</button>
        <button class="timer-option" data-minutes="12">12 min</button>
        <button class="timer-option" data-minutes="45">45 min</button>
      </div>
      <div style="margin: 20px 0;">
        <input type="number" id="customMinutes" min="1" placeholder="Custom minutes">
        <button id="setCustomTimer">Set Custom Timer</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', popupHTML);

  document.querySelectorAll('.timer-option').forEach(option => {
    option.addEventListener('click', function() {
      const minutes = parseInt(this.getAttribute('data-minutes'));
      setTimer(minutes);
    });
  });

  document.getElementById('setCustomTimer').addEventListener('click', function() {
    const minutes = parseInt(document.getElementById('customMinutes').value);
    if (!isNaN(minutes) && minutes > 0) {
      setTimer(minutes);
    } else {
      alert("Please enter a valid number of minutes.");
    }
  });

  popupInjected = true;
}

function setTimer(minutes) {
  chrome.runtime.sendMessage({ type: "setTimer", site: window.location.hostname, duration: minutes }, (response) => {
    if (response && response.status === "timerSet") {
      document.getElementById('site-limiter-popup').style.display = 'none';
    }
  });
}

function checkTimeAndUpdateUsage() {
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000; // Convert to seconds

  chrome.runtime.sendMessage({ type: "checkTime", site: window.location.hostname }, (response) => {
    if (response) {
      if (response.block) {
        window.location.href = chrome.runtime.getURL("blocked.html") + `?site=${window.location.hostname}`;
      } else if (!response.timerRunning) {
        injectPopup();
        document.getElementById('site-limiter-popup').style.display = 'flex';
      } else {
        startTime = startTime || Date.now();
        document.getElementById('site-limiter-popup').style.display = 'none';
      }

      // Update remaining time display
      const remainingTimeElement = document.getElementById('site-limiter-remaining-time');
      if (remainingTimeElement) {
        const minutes = Math.floor(response.remainingTime / 60000);
        const seconds = Math.floor((response.remainingTime % 60000) / 1000);
        remainingTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      } else {
        const timeDisplay = document.createElement('div');
        timeDisplay.id = 'site-limiter-remaining-time';
        timeDisplay.style.position = 'fixed';
        timeDisplay.style.top = '10px';
        timeDisplay.style.right = '10px';
        timeDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        timeDisplay.style.color = 'white';
        timeDisplay.style.padding = '5px 10px';
        timeDisplay.style.borderRadius = '5px';
        timeDisplay.style.zIndex = '9999';
        document.body.appendChild(timeDisplay);
      }
    }
  });
}

checkTimeAndUpdateUsage();
setInterval(checkTimeAndUpdateUsage, 1000);

