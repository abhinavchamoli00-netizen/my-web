document.addEventListener('DOMContentLoaded', () => {

  // =========================================
  // 1. VISITOR TRACKING (Send to Telegram)
  // =========================================
  if (!sessionStorage.getItem('visitTracked')) {
    sessionStorage.setItem('visitTracked', 'true');

    const getSource = () => {
      const ref = document.referrer;
      if (!ref) return '🔗 Direct / Unknown';
      if (ref.includes('instagram.com')) return '📸 Instagram';
      if (ref.includes('facebook.com')) return '📘 Facebook';
      if (ref.includes('google.')) return '🔍 Google Search';
      if (ref.includes('youtube.com')) return '▶️ YouTube';
      if (ref.includes('twitter.com') || ref.includes('x.com')) return '🐦 Twitter/X';
      if (ref.includes('whatsapp.com') || ref.includes('wa.me')) return '💬 WhatsApp';
      if (ref.includes('t.me') || ref.includes('telegram')) return '✈️ Telegram';
      if (ref.includes('reddit.com')) return '👽 Reddit';
      if (ref.includes('linkedin.com')) return '💼 LinkedIn';
      if (ref.includes('pinterest.')) return '📌 Pinterest';
      return '🌐 ' + ref;
    };

    const getDevice = () => {
      const ua = navigator.userAgent;
      let device = '💻 Desktop';
      let browser = 'Unknown';
      if (/Mobi|Android/i.test(ua)) device = '📱 Mobile';
      else if (/Tablet|iPad/i.test(ua)) device = '📟 Tablet';
      if (ua.includes('Edg')) browser = 'Edge';
      else if (ua.includes('Chrome')) browser = 'Chrome';
      else if (ua.includes('Safari')) browser = 'Safari';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
      return `${device} (${browser})`;
    };

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: getSource(),
        device: getDevice(),
        page: currentPage,
        referrer: document.referrer || 'None'
      })
    }).catch(() => {});
  }

  // =========================================
  // 2. AUTO-REMOVE FEEDBACK FORM FROM NON-HOME PAGES
  // =========================================
  const path = window.location.pathname;
  const isHomePage = path.endsWith('/') || path.endsWith('index.html') || path === '';

  if (!isHomePage) {
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) {
      feedbackSection.remove();
    }
  }

  // =========================================
  // 3. FEEDBACK FORM HANDLING
  // =========================================
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