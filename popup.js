import { BLOCKED_SITES } from './config.js';
document.addEventListener('DOMContentLoaded', function() {
  const siteList = document.getElementById('site-list');

  BLOCKED_SITES.forEach(site => {
    const siteElement = document.createElement('div');
    siteElement.innerHTML = `
      <h3>${site.name}</h3>
      <button class="timer-option" data-site="${site.domain}" data-minutes="5">5 min</button>
      <button class="timer-option" data-site="${site.domain}" data-minutes="15">15 min</button>
      <button class="timer-option" data-site="${site.domain}" data-minutes="30">30 min</button>
      <input type="number" class="custom-minutes" data-site="${site.domain}" min="1" placeholder="Custom minutes">
      <button class="set-custom-timer" data-site="${site.domain}">Set Custom Timer</button>
    `;
    siteList.appendChild(siteElement);
  });

  document.querySelectorAll('.timer-option').forEach(option => {
    option.addEventListener('click', function() {
      const site = this.getAttribute('data-site');
      const minutes = parseInt(this.getAttribute('data-minutes'));
      setTimer(site, minutes);
    });
  });

  document.querySelectorAll('.set-custom-timer').forEach(button => {
    button.addEventListener('click', function() {
      const site = this.getAttribute('data-site');
      const minutes = parseInt(document.querySelector(`.custom-minutes[data-site="${site}"]`).value);
      if (!isNaN(minutes) && minutes > 0) {
        setTimer(site, minutes);
      } else {
        alert("Please enter a valid number of minutes.");
      }
    });
  });
});

function setTimer(site, minutes) {
  chrome.runtime.sendMessage({ type: "setTimer", site: site, duration: minutes }, (response) => {
    if (response.status === "timerSet") {
      alert(`You have ${minutes} minutes to spend on ${site}.`);
      window.close();
    } else if (response.status === "blocked") {
      alert(`${site} is currently blocked. You can set a new timer in ${response.remainingCooldown} minutes.`);
    }
  });
}