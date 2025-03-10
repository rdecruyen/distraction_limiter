document.addEventListener('DOMContentLoaded', function() {
  const urlParams = new URLSearchParams(window.location.search);
  const site = urlParams.get('site');
  document.getElementById('site-name').textContent = site || 'this site';
});