// =========================================
// NEXUS - Main Script
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // 1. AUTO-REMOVE FEEDBACK FORM (Non-Home Pages)
  // =========================================
  const path = window.location.pathname;
  const isHomePage = path.endsWith('/') || path.endsWith('index.html') || path === '';

  if (!isHomePage) {
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) feedbackSection.remove();
  }

  // =========================================
  // 2. VISITOR TRACKING (Only Once Per Session)
  // =========================================
  const hasTrackedVisit = sessionStorage.getItem('nexus_visit_tracked');

  if (!hasTrackedVisit) {
    sessionStorage.setItem('nexus_visit_tracked', 'true');

    const referrer = document.referrer || 'Direct';
    const page = path.split('/').pop() || 'index.html';
    const device = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                    navigator.userAgent.includes('Firefox') ? 'Firefox' :
                    navigator.userAgent.includes('Safari') ? 'Safari' : 'Other';

    // Send visitor notification to Telegram via API
    fetch('/api/visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer: referrer,
        page: page,
        device: device,
        browser: browser
      })
    }).catch(err => console.log('Visitor tracking skipped'));
  }

  // =========================================
  // 3. FEEDBACK FORM (Prevent Double Submission)
  // =========================================
  const feedbackForm = document.getElementById('feedbackForm');
  let isSubmitting = false;

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (isSubmitting) return;
      isSubmitting = true;

      const name = document.getElementById('feedbackName').value.trim();
      const message = document.getElementById('feedbackMessage').value.trim();
      const statusEl = document.getElementById('feedbackStatus');
      const submitBtn = document.getElementById('feedbackSubmit');

      if (!message) {
        isSubmitting = false;
        return;
      }

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
        isSubmitting = false;
      }
    });
  }

});