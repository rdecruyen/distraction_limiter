document.addEventListener('DOMContentLoaded', function() {
  const timerOptions = document.querySelectorAll('.timer-option');
  const customMinutesInput = document.getElementById('customMinutes');
  const setCustomTimerButton = document.getElementById('setCustomTimer');

  function setTimer(minutes) {
    chrome.runtime.sendMessage({ type: "setTimer", duration: minutes }, (response) => {
      if (response.status === "timerSet") {
        alert(`You have ${minutes} minutes to spend on YouTube.`);
        window.close();
      }
    });
  }

  timerOptions.forEach(option => {
    option.addEventListener('click', function() {
      const minutes = parseInt(this.getAttribute('data-minutes'));
      setTimer(minutes);
    });
  });

  setCustomTimerButton.addEventListener('click', function() {
    const minutes = parseInt(customMinutesInput.value);
    if (!isNaN(minutes) && minutes > 0) {
      setTimer(minutes);
    } else {
      alert("Please enter a valid number of minutes.");
    }
  });

});