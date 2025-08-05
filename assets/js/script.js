// assets/js/loader.js
document.addEventListener('DOMContentLoaded', () => {
  const loader   = document.getElementById('loader');
  const app      = document.getElementById('app');
  const btn      = document.getElementById('loader-button');
  const barFill  = document.querySelector('.bar-fill');

  // Gather all images on the page (including your loader.png)
  const images       = Array.from(document.images);
  const totalCount   = images.length;
  let   loadedCount  = 0;

  // Update bar width based on count
  function updateProgress() {
    const pct = Math.round((loadedCount / totalCount) * 100);
    barFill.style.width = pct + '%';
    // Optionally, enable the button at 100%
    if (loadedCount >= totalCount) {
      btn.disabled = false;
      btn.textContent = 'Enter';
    }
  }

  // Attach listeners
  images.forEach(img => {
    if (img.complete) {
      loadedCount++;
      updateProgress();
    } else {
      img.addEventListener('load', () => {
        loadedCount++;
        updateProgress();
      });
      img.addEventListener('error', () => {
        // count errors as “loaded” so the bar can finish
        loadedCount++;
        updateProgress();
      });
    }
  });

  // Initially disable the button until assets done (optional)
  btn.disabled = true;
  btn.textContent = 'Loading…';

  // On click, fade out loader and show app
  btn.addEventListener('click', () => {
    loader.style.opacity = '0';
    loader.addEventListener('transitionend', () => {
      loader.remove();
      app.style.display = 'block';
    }, { once: true });
  });
});
