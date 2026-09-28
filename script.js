// =========================================
// NEXUS - Main Script
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  const path = window.location.pathname;
  const isHomePage = path.endsWith('/') || path.endsWith('index.html') || path === '';

  // 1. AUTO-REMOVE FEEDBACK FORM (Non-Home Pages)
  if (!isHomePage) {
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) feedbackSection.remove();
  }

  // 2. VISITOR TRACKING (Only Once Per Session)
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

  // 3. FEEDBACK FORM
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

      if (!message) { isSubmitting = false; return; }

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
          statusEl.textContent = '❌ ' + (data.details || data.error || 'Something went wrong.');
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

  // 4. AI CHAT WIDGET
  const chatFab = document.getElementById('chatFab');
  const chatWidget = document.getElementById('chatWidget');
  const chatClose = document.getElementById('chatClose');
  const chatMaximize = document.getElementById('chatMaximize');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  let chatHistory = [];
  let isChatSending = false;

  if (chatFab) {
    chatFab.addEventListener('click', () => {
      chatWidget.classList.toggle('active');
      if (chatWidget.classList.contains('active')) {
        chatInput.focus();
      }
    });
  }

  if (chatClose) {
    chatClose.addEventListener('click', (e) => {
      e.stopPropagation();
      chatWidget.classList.remove('active');
      chatWidget.classList.remove('maximized');
      chatWidget.classList.remove('keyboard-open');
      chatWidget.style.height = '';
      chatWidget.style.bottom = '';
      document.body.style.overflow = '';
    });
  }

  // ✨ Maximize Button Toggle
  if (chatMaximize) {
    chatMaximize.addEventListener('click', (e) => {
      e.stopPropagation();
      chatWidget.classList.toggle('maximized');
      
      if (chatWidget.classList.contains('maximized')) {
        document.body.style.overflow = 'hidden';
        if (window.visualViewport) {
          chatWidget.style.height = window.visualViewport.height + 'px';
          chatWidget.style.bottom = 'auto';
        }
      } else {
        document.body.style.overflow = '';
        chatWidget.style.height = '';
        chatWidget.style.bottom = '';
        chatWidget.classList.remove('keyboard-open');
      }
      
      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 100);
    });
  }

  // 📱 Mobile Keyboard Fix - Works for both maximized AND normal mode
  if (window.visualViewport) {
    const adjustChatHeight = () => {
      if (!chatWidget || !chatWidget.classList.contains('active')) return;

      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      const keyboardHeight = windowHeight - viewportHeight;

      if (chatWidget.classList.contains('maximized')) {
        // MAXIMIZED mode: full screen, adjust height
        chatWidget.style.height = viewportHeight + 'px';
        chatWidget.style.bottom = 'auto';
        chatWidget.classList.add('keyboard-open');
      } else {
        // NORMAL mode: shift chat widget UP so input is above keyboard
        if (keyboardHeight > 150) {
          chatWidget.style.bottom = keyboardHeight + 'px';
          chatWidget.classList.add('keyboard-open');
        } else {
          chatWidget.style.bottom = '';
          chatWidget.classList.remove('keyboard-open');
        }
      }

      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 100);
    };

    window.visualViewport.addEventListener('resize', adjustChatHeight);
    window.visualViewport.addEventListener('scroll', adjustChatHeight);
  }

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
          addChatMessage('⚠️ Error: ' + (data.details || data.error || 'Unknown'), 'bot');
        }
      } catch (err) {
        typingEl.remove();
        addChatMessage('❌ Network error. Please check your connection.', 'bot');
      } finally {
        isChatSending = false;
        sendBtn.disabled = false;
        chatInput.focus();
      }
    });
  }

  // ✨ Markdown Formatter for AI responses
  function formatAIResponse(text) {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    html = html.replace(/^#{1,4}\s*(.+)$/gm, '<div class="ai-heading">$1</div>');
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="ai-bullet">$1. $2</div>');
    html = html.replace(/^[•\-]\s+(.+)$/gm, '<div class="ai-bullet">• $1</div>');
    html = html.replace(/\n/g, '<br>');

    html = html.replace(/<br>(<div class="ai-heading">)/g, '$1');
    html = html.replace(/<br>(<div class="ai-bullet">)/g, '$1');
    html = html.replace(/(<\/div>)<br>/g, '$1');
    html = html.replace(/(<br>){2,}/g, '<div class="ai-spacer"></div>');

    return html;
  }

  function addChatMessage(text, type) {
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (
      type === 'user' ? 'ai-msg-user' : 
      type === 'typing' ? 'ai-msg-typing' : 
      'ai-msg-bot'
    );

    if (type === 'bot' && text) {
      div.innerHTML = formatAIResponse(text);
    } else {
      div.textContent = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

});