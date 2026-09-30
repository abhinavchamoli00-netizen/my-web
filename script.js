// =========================================
// NEXUS - Main Script (SPA-style, URL never changes)
// =========================================

let __currentPage = (function() {
  const p = window.location.pathname;
  const file = p.split('/').pop();
  return file || 'index.html';
})();

// Capture "base" styles present on initial page load
const __baseStyles = new Set();
document.querySelectorAll('head style, head link[rel="stylesheet"]').forEach(el => {
  __baseStyles.add(el.outerHTML);
});

// =========================================
// PAGE INITIALIZER (re-runs after every navigation)
// =========================================
function initNexusPage() {

  const isHomePage = __currentPage === 'index.html' || __currentPage === '' || __currentPage === '/';

  if (!isHomePage) {
    const feedbackSection = document.querySelector('.feedback-section');
    if (feedbackSection) feedbackSection.remove();
    const commentsSection = document.querySelector('.comments-section');
    if (commentsSection) commentsSection.remove();
  }

  // DEVICE INFO
  async function getDeviceInfo() {
    let model = '';
    let platform = '';
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const h = await navigator.userAgentData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
        model = h.model || '';
        platform = h.platform || '';
        if (h.platformVersion) {
          const major = String(h.platformVersion).split('.')[0];
          platform = platform ? (platform + ' ' + major) : major;
        }
      } else {
        const ua = navigator.userAgent;
        if (/Android/i.test(ua)) {
          const m = ua.match(/Android\s([\d.]+)/);
          platform = m ? 'Android ' + m[1].split('.')[0] : 'Android';
        } else if (/iPhone|iPad|iPod/i.test(ua)) platform = 'iOS';
        else if (/Windows/i.test(ua)) platform = 'Windows';
        else if (/Mac OS X/i.test(ua)) platform = 'macOS';
        else if (/Linux/i.test(ua)) platform = 'Linux';
      }
    } catch (e) {}
    return { model, platform };
  }

  // VISITOR TRACKING (once per session)
  const hasTrackedVisit = sessionStorage.getItem('nexus_visit_tracked');
  if (!hasTrackedVisit) {
    sessionStorage.setItem('nexus_visit_tracked', 'true');
    (async () => {
      const { model, platform } = await getDeviceInfo();
      const referrer = document.referrer || 'Direct';
      const device = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
      const browser = navigator.userAgent.includes('Chrome') ? 'Chrome' :
                      navigator.userAgent.includes('Firefox') ? 'Firefox' :
                      navigator.userAgent.includes('Safari') ? 'Safari' : 'Other';

      fetch('/api/visitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrer, page: __currentPage, device, browser, model, platform })
      }).catch(() => {});
    })();
  }

  // POSTS TOGGLE
  const postsToggle = document.getElementById('postsToggle');
  const postsContent = document.getElementById('postsContent');
  if (postsToggle && postsContent) {
    postsToggle.addEventListener('click', () => {
      const isExpanded = postsContent.classList.toggle('expanded');
      postsToggle.classList.toggle('active', isExpanded);
      const textSpan = postsToggle.querySelector('.posts-toggle-text');
      if (textSpan) {
        textSpan.textContent = isExpanded
          ? 'Click here to hide 2026 updates'
          : 'Click here to see 2026 updates';
      }
    });
  }

  // POSTS STATUS (Updated / Soon based on date)
  (function updatePostStatus() {
    const items = document.querySelectorAll('.post-item[data-date]');
    if (!items.length) return;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    items.forEach(item => {
      const ds = item.getAttribute('data-date');
      if (!ds) return;
      const parts = ds.split('-').map(Number);
      if (parts.length !== 3) return;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setHours(0, 0, 0, 0);
      const nameEl = item.querySelector('.post-name');
      if (!nameEl) return;
      nameEl.textContent = (d <= now) ? 'Updated' : 'Soon';
    });
  })();


  // FEEDBACK FORM
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
          submitBtn.textContent = 'Send Message';
          isSubmitting = false;
        }, 3000);
      }
    });
  }

  // LIVE COMMENTS
  const commentName = document.getElementById('commentName');
  const commentMessage = document.getElementById('commentMessage');
  const commentSubmit = document.getElementById('commentSubmit');
  const commentStatus = document.getElementById('commentStatus');
  const commentsList = document.getElementById('commentsList');

  let isCommentSubmitting = false;
  let lastCommentsHash = '';

  function renderComment(comment, prepend = false) {
    const card = document.createElement('div');
    card.className = 'comment-card';

    const initial = (comment.name || 'A').charAt(0).toUpperCase();
    const timeAgo = getTimeAgo(comment.timestamp);

    const header = document.createElement('div');
    header.className = 'comment-header';

    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    avatar.textContent = initial;

    const meta = document.createElement('div');
    meta.className = 'comment-meta';

    const nameEl = document.createElement('span');
    nameEl.className = 'comment-name';
    nameEl.textContent = comment.name || 'Anonymous';

    const timeEl = document.createElement('span');
    timeEl.className = 'comment-time';
    timeEl.textContent = timeAgo;

    meta.appendChild(nameEl);
    meta.appendChild(timeEl);
    header.appendChild(avatar);
    header.appendChild(meta);

    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = comment.message;

    card.appendChild(header);
    card.appendChild(text);

    if (comment.reply) {
      const replyBlock = document.createElement('div');
      replyBlock.className = 'comment-reply';

      const replyLabel = document.createElement('span');
      replyLabel.className = 'comment-reply-label';
      replyLabel.textContent = '↳ Admin Reply';

      const replyText = document.createElement('p');
      replyText.className = 'comment-reply-text';
      replyText.textContent = comment.reply;

      replyBlock.appendChild(replyLabel);
      replyBlock.appendChild(replyText);
      card.appendChild(replyBlock);
    }

    if (prepend) {
      commentsList.insertBefore(card, commentsList.firstChild);
    } else {
      commentsList.appendChild(card);
    }
    return card;
  }

  function getTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 30) return 'Just now';
    if (seconds < 60) return seconds + 's ago';
    if (minutes < 60) return minutes + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days < 7) return days + 'd ago';
    return new Date(timestamp).toLocaleDateString('en-IN');
  }

  async function loadComments() {
    if (!commentsList) return;
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();

      if (data.success && Array.isArray(data.comments)) {
        const newHash = JSON.stringify(data.comments);
        if (newHash === lastCommentsHash) return;
        lastCommentsHash = newHash;

        commentsList.innerHTML = '';

        if (data.comments.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'comments-empty';
          empty.textContent = 'No comments yet. Be the first to share!';
          commentsList.appendChild(empty);
        } else {
          data.comments.forEach(c => renderComment(c));
        }
      }
    } catch (err) {}
  }

  if (commentsList) {
    loadComments();
    if (window.__nexusCommentTimer) clearInterval(window.__nexusCommentTimer);
    window.__nexusCommentTimer = setInterval(loadComments, 15000);
  }

  if (commentSubmit) {
    commentSubmit.addEventListener('click', async () => {
      if (isCommentSubmitting) return;
      isCommentSubmitting = true;

      const name = (commentName.value || '').trim() || 'Anonymous';
      const message = (commentMessage.value || '').trim();

      if (!message) {
        commentStatus.textContent = '❌ Please write something before posting.';
        commentStatus.style.color = '#e74c3c';
        isCommentSubmitting = false;
        return;
      }

      commentSubmit.disabled = true;
      commentSubmit.textContent = 'Posting...';
      commentStatus.textContent = '';

      try {
        const res = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, message })
        });
        const data = await res.json();

        if (data.success && data.comment) {
          commentStatus.textContent = '✅ Posted!';
          commentStatus.style.color = '#2ecc71';
          commentName.value = '';
          commentMessage.value = '';
          const emptyEl = commentsList.querySelector('.comments-empty');
          if (emptyEl) emptyEl.remove();
          renderComment(data.comment, true);
          lastCommentsHash = '';
          setTimeout(() => { commentStatus.textContent = ''; }, 3000);
        } else {
          commentStatus.textContent = '❌ ' + (data.details || data.error || 'Something went wrong.');
          commentStatus.style.color = '#e74c3c';
        }
      } catch (err) {
        commentStatus.textContent = '❌ Network error. Please try again.';
        commentStatus.style.color = '#e74c3c';
      } finally {
        commentSubmit.disabled = false;
        commentSubmit.textContent = 'Post Comment';
        isCommentSubmitting = false;
      }
    });
  }

  // AI CHAT WIDGET
  const chatFab = document.getElementById('chatFab');
  const chatWidget = document.getElementById('chatWidget');
  const chatBackdrop = document.getElementById('chatBackdrop');
  const chatClose = document.getElementById('chatClose');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  let chatHistory = [];
  let isChatSending = false;
  let chatHistoryState = false;
  let isClosingChat = false;

  function closeChatFully() {
    if (!chatWidget) return;
    chatWidget.classList.remove('active');
    chatWidget.classList.remove('keyboard-open');
    chatWidget.style.height = '';
    chatWidget.style.bottom = '';
    chatWidget.style.top = '';
    chatWidget.style.maxHeight = '';
    if (chatBackdrop) {
      chatBackdrop.classList.remove('active');
      chatBackdrop.classList.remove('locked');
    }
    document.body.style.overflow = '';
    stopSpeaking();
  }

  function pushChatHistory() {
    if (!chatHistoryState) {
      history.pushState({ nexusChat: true }, '');
      chatHistoryState = true;
    }
  }

  window.addEventListener('popstate', () => {
    if (chatWidget && chatWidget.classList.contains('active')) {
      chatHistoryState = false;
      closeChatFully();
    }
  });

  if (chatFab) {
    chatFab.addEventListener('click', () => {
      if (isClosingChat) return;
      const isOpening = !chatWidget.classList.contains('active');
      chatWidget.classList.toggle('active');

      if (isOpening) {
        chatInput.focus();
        if (chatBackdrop) chatBackdrop.classList.add('active');
        pushChatHistory();
      } else {
        if (chatBackdrop) {
          chatBackdrop.classList.remove('active');
          chatBackdrop.classList.remove('locked');
        }
        if (chatHistoryState) {
          chatHistoryState = false;
          history.back();
        }
      }
    });
  }

  if (chatBackdrop) {
    chatBackdrop.addEventListener('click', () => {
      if (isClosingChat) return;
      isClosingChat = true;
      closeChatFully();
      if (chatHistoryState) {
        chatHistoryState = false;
        history.back();
      }
      setTimeout(() => { isClosingChat = false; }, 400);
    });
  }

  if (chatClose) {
    chatClose.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (isClosingChat) return;
      isClosingChat = true;
      closeChatFully();
      if (chatHistoryState) {
        chatHistoryState = false;
        history.back();
      }
      setTimeout(() => { isClosingChat = false; }, 400);
    });
  }

  function adjustChatForKeyboard() {
    if (!chatWidget || !chatWidget.classList.contains('active')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const viewportHeight = vv.height;
    const viewportTop = vv.offsetTop || 0;
    const windowHeight = window.innerHeight;
    const keyboardHeight = windowHeight - viewportHeight;
    const isKeyboardOpen = keyboardHeight > 100;

    if (isKeyboardOpen) {
      chatWidget.style.height = viewportHeight + 'px';
      chatWidget.style.top = viewportTop + 'px';
      chatWidget.style.bottom = 'auto';
      chatWidget.classList.add('keyboard-open');
    } else {
      chatWidget.style.height = '';
      chatWidget.style.top = '0';
      chatWidget.style.bottom = '0';
      chatWidget.classList.remove('keyboard-open');
    }
    setTimeout(() => { if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }, 150);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', adjustChatForKeyboard);
    window.visualViewport.addEventListener('scroll', adjustChatForKeyboard);
  }

  if (chatInput) {
    chatInput.addEventListener('focus', () => {
      setTimeout(adjustChatForKeyboard, 300);
      setTimeout(adjustChatForKeyboard, 600);
    });
    chatInput.addEventListener('blur', () => {
      setTimeout(adjustChatForKeyboard, 300);
    });
  }
  window.addEventListener('resize', adjustChatForKeyboard);

  // VOICE INPUT
  const voiceBtn = document.getElementById('voiceBtn');
  let recognition = null;
  let isRecording = false;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      isRecording = true;
      if (voiceBtn) voiceBtn.classList.add('recording');
      if (chatInput) chatInput.placeholder = '🎤 Listening...';
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (chatInput) chatInput.value = transcript;
    };
    recognition.onerror = () => {
      isRecording = false;
      if (voiceBtn) voiceBtn.classList.remove('recording');
      if (chatInput) chatInput.placeholder = 'Type your message...';
    };
    recognition.onend = () => {
      isRecording = false;
      if (voiceBtn) voiceBtn.classList.remove('recording');
      if (chatInput) chatInput.placeholder = 'Type your message...';
    };
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (!recognition) {
        alert('Voice input not supported. Try Chrome.');
        return;
      }
      if (isRecording) recognition.stop();
      else recognition.start();
    });
  }

  // TEXT-TO-SPEECH
  let currentlySpeaking = false;
  let currentSpeakBtn = null;
  let currentMessageEl = null;

  function stopSpeaking() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentMessageEl) {
      currentMessageEl.querySelectorAll('.speak-word.speaking').forEach(el => el.classList.remove('speaking'));
    }
    if (currentSpeakBtn) {
      currentSpeakBtn.innerHTML = '🔊 Listen';
      currentSpeakBtn.classList.remove('speaking-active');
    }
    currentlySpeaking = false;
    currentSpeakBtn = null;
    currentMessageEl = null;
  }

  function prepareForTTS(rootEl) {
    if (rootEl.dataset.speechWrapped === 'true') {
      rootEl.querySelectorAll('.speak-word').forEach(span => {
        const text = document.createTextNode(span.textContent);
        span.parentNode.replaceChild(text, span);
      });
      delete rootEl.dataset.speechWrapped;
    }
    const textNodes = [];
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && node.parentElement.closest('.msg-speak-btn')) continue;
      if (!node.textContent) continue;
      textNodes.push(node);
    }
    let cleanText = '';
    const posMap = [];
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const fragment = document.createDocumentFragment();
      const parts = text.split(/(\s+)/);
      parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          cleanText += part;
        } else {
          const cleanWord = part.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[*#_`~]/g, '');
          if (!cleanWord) { fragment.appendChild(document.createTextNode(part)); return; }
          const span = document.createElement('span');
          span.className = 'speak-word';
          span.textContent = part;
          const start = cleanText.length;
          cleanText += cleanWord;
          const end = cleanText.length;
          posMap.push({ charStart: start, charEnd: end, span });
          fragment.appendChild(span);
        }
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
    rootEl.dataset.speechWrapped = 'true';
    return { cleanText, posMap };
  }

  function speakWithHighlight(messageDiv, speakBtn, text, lang = 'en-IN') {
    if (!('speechSynthesis' in window)) return;
    if (currentlySpeaking && currentSpeakBtn === speakBtn) { stopSpeaking(); return; }
    stopSpeaking();
    speechSynthesis.cancel();
    const { cleanText, posMap } = prepareForTTS(messageDiv);
    if (!cleanText.trim()) { stopSpeaking(); return; }
    currentMessageEl = messageDiv;
    currentSpeakBtn = speakBtn;
    currentlySpeaking = true;
    speakBtn.innerHTML = '⏹ Stop';
    speakBtn.classList.add('speaking-active');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onboundary = (e) => {
      if (!currentlySpeaking) return;
      const charIndex = e.charIndex;
      let match = null;
      for (const p of posMap) {
        if (charIndex >= p.charStart && charIndex < p.charEnd) { match = p; break; }
      }
      if (match && match.span) {
        posMap.forEach(p => { if (p.span) p.span.classList.remove('speaking'); });
        match.span.classList.add('speaking');
        try { match.span.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (err) {}
      }
    };
    utterance.onend = () => { stopSpeaking(); };
    utterance.onerror = () => { stopSpeaking(); };
    speechSynthesis.speak(utterance);
  }

  // CHAT FORM SUBMIT
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
      if (sendBtn) sendBtn.disabled = true;

      try {
        const { model } = await getDeviceInfo();
        const payload = { message: message, history: chatHistory.slice(-10), deviceModel: model };

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        typingEl.remove();

        if (data.success) {
          addChatMessage(data.reply, 'bot');
          chatHistory.push({ role: 'user', text: message });
          chatHistory.push({ role: 'model', text: data.reply });
        } else if (data.error === 'limit_reached') {
          addChatMessage(`🚫 **Nexus AI is taking a short break!**\n\nWe've reached our **daily limit**. Please come back later. 🙏`, 'bot');
        } else {
          addChatMessage('⚠️ Error: ' + (data.details || data.error || 'Unknown'), 'bot');
        }
      } catch (err) {
        typingEl.remove();
        addChatMessage('❌ Network error. Please try again.', 'bot');
      } finally {
        isChatSending = false;
        if (sendBtn) sendBtn.disabled = false;
      }
    });
  }

  function formatAIResponse(text) {
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      if (!text.includes('Thinking') && !text.includes('short break')) {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'msg-speak-btn';
        speakBtn.innerHTML = '🔊 Listen';
        speakBtn.type = 'button';
        speakBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHindi = /[\u0900-\u097F]/.test(text);
          speakWithHighlight(div, speakBtn, text, isHindi ? 'hi-IN' : 'en-IN');
        });
        div.appendChild(speakBtn);
      }
    } else {
      div.textContent = text;
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

} // end initNexusPage

// =========================================
// SPA NAVIGATION (URL never changes)
// =========================================
async function loadNexusPage(url, pushHistory) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (doc.title) document.title = doc.title;

    // ✅ FIX: Remove previously SPA-added styles
    document.querySelectorAll('head [data-nexus-spa]').forEach(el => el.remove());

    // ✅ FIX: Add new page's styles (skip base ones already present)
    doc.querySelectorAll('head style, head link[rel="stylesheet"]').forEach(el => {
      const outer = el.outerHTML;
      if (__baseStyles.has(outer)) return;
      const newEl = el.cloneNode(true);
      newEl.setAttribute('data-nexus-spa', '1');
      document.head.appendChild(newEl);
    });

    // Grab scripts BEFORE stripping (to re-execute inline ones)
    const allScripts = Array.from(doc.body.querySelectorAll('script'));

    const newBody = doc.body.cloneNode(true);
    newBody.querySelectorAll('script').forEach(s => s.remove());

    // Swap body content
    document.body.innerHTML = newBody.innerHTML;

    // Re-execute inline scripts only (skip script.js to avoid loop)
    allScripts.forEach(oldScript => {
      if (oldScript.src) return;
      const newScript = document.createElement('script');
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
    });

    __currentPage = url.split('/').pop() || 'index.html';

    initNexusPage();

    window.scrollTo(0, 0);

    if (pushHistory) {
      history.pushState({ nexusPage: url }, '', window.location.pathname);
    }
  } catch (err) {
    window.location.href = url;
  }
}

// =========================================
// CLICK INTERCEPTOR (setup once)
// =========================================
(function setupSpaNavigation() {
  if (window.__nexusSpaReady) return;
  window.__nexusSpaReady = true;

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) return;
    if (href.startsWith('#')) return;
    if (link.target === '_blank') return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;

    e.preventDefault();
    loadNexusPage(href, true);
  });

  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.nexusPage) {
      loadNexusPage(e.state.nexusPage, false);
    }
  });

  history.replaceState({ nexusPage: __currentPage }, '', window.location.pathname);
})();

// =========================================
// BOOTSTRAP
// =========================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNexusPage);
} else {
  initNexusPage();
}
// =========================================
// THEME TOGGLE (Dark / Day / Amoled)
// =========================================
(function setupThemeToggle() {
  if (document.getElementById('nexusThemeToggle')) return;

  const THEMES = ['dark', 'day', 'amoled'];
  const ICONS = { dark: '🌙', day: '☀️', amoled: '⬛' };
  let theme = localStorage.getItem('nexus_theme') || 'dark';
  if (!THEMES.includes(theme)) theme = 'dark';

  function applyTheme(t) {
    document.documentElement.classList.remove('theme-dark', 'theme-day', 'theme-amoled');
    document.documentElement.classList.add('theme-' + t);
    const btn = document.getElementById('nexusThemeToggle');
    if (btn) {
      btn.textContent = ICONS[t];
      btn.title = 'Theme: ' + t.charAt(0).toUpperCase() + t.slice(1) + ' (click to change)';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  const btn = document.createElement('button');
  btn.id = 'nexusThemeToggle';
  btn.className = 'nexus-theme-toggle';
  btn.type = 'button';
  btn.addEventListener('click', () => {
    const idx = THEMES.indexOf(theme);
    theme = THEMES[(idx + 1) % THEMES.length];
    localStorage.setItem('nexus_theme', theme);
    applyTheme(theme);
  });

  // Append to <html> so it survives SPA body swaps
  document.documentElement.appendChild(btn);
  applyTheme(theme);
})();