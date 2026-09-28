// =========================================
// NEXUS - Main Script
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  // Hide feedback form on all pages except home
  const path = window.location.pathname;
  const isHomePage = path.endsWith('/') || path.endsWith('index.html') || path === '';

  if (!isHomePage) {
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) {
      feedbackSection.remove();
    }
  }

  // Feedback form handling
  const feedbackForm = document.getElementById('feedbackForm');
  
  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('feedbackName').value.trim();
      const message = document.getElementById('feedbackMessage').value.trim();
      const statusEl = document.getElementById('feedbackStatus');
      const submitBtn = document.getElementById('feedbackSubmit');

      if (!message) return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      statusEl.textContent = '';

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, message })
        });

        const data = await res.json();

        if (data.success) {
          statusEl.textContent = '✅ Thanks! Your feedback has been sent.';
          statusEl.style.color = '#2ecc71';
          feedbackForm.reset();
        } else {
          statusEl.textContent = '❌ Something went wrong. Please try again.';
          statusEl.style.color = '#e74c3c';
        }
      } catch (err) {
        statusEl.textContent = '❌ Network error. Please try again.';
        statusEl.style.color = '#e74c3c';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message';
      }
    });
  }

});