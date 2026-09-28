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

    fetch('/api/visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrer, page, device, browser })
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
      submitBtn.style.pointerEvents = 'none';
      submitBtn.style.opacity = '0.6';
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
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.style.pointerEvents = 'auto';
          submitBtn.style.opacity = '1';
          submitBtn.textContent = 'Send Message';
          isSubmitting = false;
        }, 3000);
      }
    });
  }

  // =========================================
  // 4. AI CHAT WIDGET
  // =========================================
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const chatBody = document.getElementById('chatBody');
  const chatToggle = document.getElementById('chatToggle');
  const chatHeader = document.getElementById('chatHeader');

  let chatHistory = [];
  let isChatSending = false;

  function toggleChat() {
    chatBody.classList.toggle('collapsed');
    chatToggle.textContent = chatBody.classList.contains('collapsed') ? '+' : '−';
  }

  if (chatHeader) chatHeader.addEventListener('click', toggleChat);
  if (chatToggle) chatToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChat();
  });

  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isChatSending) return;

      const message = chatInput.value.trim();
      if (!message) return;

      addChatMessage(message, 'user');
      chatInput.value = '';

      const typingEl = addChatMessage('Thinking...', 'typing');

      isChatSending = true;
      const sendBtn = document.getElementById('chatSend');
      sendBtn.disabled = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: message, 
            history: chatHistory.slice(-10)
          })
        });

        const data = await res.json();
        typingEl.remove();

        if (data.success) {
          addChatMessage(data.reply, 'bot');
          chatHistory.push({ role: 'user', text: message });
          chatHistory.push({ role: 'model', text: data.reply });
        } else {
          addChatMessage('Sorry, something went wrong. Please try again.', 'bot');
        }
      } catch (err) {
        typingEl.remove();
        addChatMessage('Network error. Please check your connection.', 'bot');
      } finally {
        isChatSending = false;
        sendBtn.disabled = false;
        chatInput.focus();
      }
    });
  }

  function addChatMessage(text, type) {
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (
      type === 'user' ? 'ai-msg-user' : 
      type === 'typing' ? 'ai-msg-typing' : 
      'ai-msg-bot'
    );
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

});