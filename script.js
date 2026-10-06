// =========================================
// NEXUS - Main Script (SPA + Fixed Buttons)
// =========================================

let __currentPage = (function() {
  const p = window.location.pathname;
  const file = p.split('/').pop();
  return file || 'index.html';
})();

const __baseStyles = new Set();
document.querySelectorAll('head style, head link[rel="stylesheet"]').forEach(el => {
  __baseStyles.add(el.outerHTML);
});

function isHomePage() {
  const p = __currentPage;
  return p === 'index.html' || p === '' || p === '/';
}

const THEMES = ['dark', 'day', 'amoled'];
const THEME_ICONS = { dark: '🌙', day: '☀️', amoled: '⬛' };
let __currentTheme = localStorage.getItem('nexus_theme') || 'dark';
if (!THEMES.includes(__currentTheme)) __currentTheme = 'dark';

function applyTheme(t) {
  document.documentElement.classList.remove('theme-dark', 'theme-day', 'theme-amoled');
  document.documentElement.classList.add('theme-' + t);
  const btn = document.getElementById('nexusThemeToggle');
  if (btn) btn.textContent = THEME_ICONS[t];
}

function ensureFloatingButtons() {
  let tBtn = document.getElementById('nexusThemeToggle');
  if (!tBtn) {
    tBtn = document.createElement('button');
    tBtn.id = 'nexusThemeToggle';
    tBtn.type = 'button';
    tBtn.textContent = THEME_ICONS[__currentTheme];
    tBtn.setAttribute('aria-label', 'Change theme');
    tBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const idx = THEMES.indexOf(__currentTheme);
      __currentTheme = THEMES[(idx + 1) % THEMES.length];
      localStorage.setItem('nexus_theme', __currentTheme);
      applyTheme(__currentTheme);
    });
    document.body.appendChild(tBtn);
  }

  let bBtn = document.getElementById('nexusBackBtn');
  if (!bBtn) {
    bBtn = document.createElement('button');
    bBtn.id = 'nexusBackBtn';
    bBtn.type = 'button';
    bBtn.innerHTML = '←';
    bBtn.setAttribute('aria-label', 'Go back');
    bBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (window.history.length > 1) window.history.back();
      else window.location.href = 'index.html';
    });
    document.body.appendChild(bBtn);
  }

  const home = isHomePage();
  const chatOpen = document.getElementById('chatWidget')?.classList.contains('active');

  if (chatOpen) {
    tBtn.style.display = 'none';
    bBtn.style.display = 'none';
  } else {
    tBtn.style.display = home ? 'flex' : 'none';
    bBtn.style.display = home ? 'none' : 'flex';
  }

  applyTheme(__currentTheme);
}

function initNexusPage() {
  const home = isHomePage();

  if (!home) {
    const fs = document.querySelector('.feedback-section');
    if (fs) fs.remove();
    const cs = document.querySelector('.comments-section');
    if (cs) cs.remove();
  }

  ensureFloatingButtons();

  async function getDeviceInfo() {
    let model = '', platform = '';
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrer, page: __currentPage, device, browser, model, platform })
      }).catch(() => {});
    })();
  }

  // FEEDBACK
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
      submitBtn.disabled = true; submitBtn.textContent = 'Sending...';
      statusEl.textContent = '';
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          submitBtn.disabled = false; submitBtn.textContent = 'Send Message';
          isSubmitting = false;
        }, 3000);
      }
    });
  }

  // COMMENTS
  const commentName = document.getElementById('commentName');
  const commentMessage = document.getElementById('commentMessage');
  const commentSubmit = document.getElementById('commentSubmit');
  const commentStatus = document.getElementById('commentStatus');
  const commentsList = document.getElementById('commentsList');
  let isCommentSubmitting = false;
  let lastCommentsHash = '';

  function renderComment(c, prepend = false) {
    const card = document.createElement('div');
    card.className = 'comment-card';
    const header = document.createElement('div');
    header.className = 'comment-header';
    const av = document.createElement('div');
    av.className = 'comment-avatar';
    av.textContent = (c.name || 'A').charAt(0).toUpperCase();
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    const nm = document.createElement('span');
    nm.className = 'comment-name';
    nm.textContent = c.name || 'Anonymous';
    const tm = document.createElement('span');
    tm.className = 'comment-time';
    tm.textContent = getTimeAgo(c.timestamp);
    meta.appendChild(nm); meta.appendChild(tm);
    header.appendChild(av); header.appendChild(meta);
    const tx = document.createElement('p');
    tx.className = 'comment-text';
    tx.textContent = c.message;
    card.appendChild(header); card.appendChild(tx);
    if (c.reply) {
      const rb = document.createElement('div');
      rb.className = 'comment-reply';
      const rl = document.createElement('span');
      rl.className = 'comment-reply-label';
      rl.textContent = '↳ Admin Reply';
      const rt = document.createElement('p');
      rt.className = 'comment-reply-text';
      rt.textContent = c.reply;
      rb.appendChild(rl); rb.appendChild(rt); card.appendChild(rb);
    }
    if (prepend) commentsList.insertBefore(card, commentsList.firstChild);
    else commentsList.appendChild(card);
    return card;
  }

  function getTimeAgo(ts) {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (s < 30) return 'Just now';
    if (s < 60) return s + 's ago';
    if (m < 60) return m + 'm ago';
    if (h < 24) return h + 'h ago';
    if (d < 7) return d + 'd ago';
    return new Date(ts).toLocaleDateString('en-IN');
  }

  async function loadComments() {
    if (!commentsList) return;
    try {
      const res = await fetch('/api/comments');
      const data = await res.json();
      if (data.success && Array.isArray(data.comments)) {
        const nh = JSON.stringify(data.comments);
        if (nh === lastCommentsHash) return;
        lastCommentsHash = nh;
        commentsList.innerHTML = '';
        if (data.comments.length === 0) {
          const em = document.createElement('p');
          em.className = 'comments-empty';
          em.textContent = 'No comments yet. Be the first to share!';
          commentsList.appendChild(em);
        } else {
          data.comments.forEach(c => renderComment(c));
        }
      }
    } catch (e) {}
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
        isCommentSubmitting = false; return;
      }
      commentSubmit.disabled = true;
      commentSubmit.textContent = 'Posting...';
      commentStatus.textContent = '';
      try {
        const res = await fetch('/api/comments', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, message })
        });
        const data = await res.json();
        if (data.success && data.comment) {
          commentStatus.textContent = '✅ Posted!';
          commentStatus.style.color = '#2ecc71';
          commentName.value = ''; commentMessage.value = '';
          const ee = commentsList.querySelector('.comments-empty');
          if (ee) ee.remove();
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

  // CHAT
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
    ensureFloatingButtons();
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
        ensureFloatingButtons();
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
        chatHistoryState = false; history.back();
      }
      setTimeout(() => { isClosingChat = false; }, 400);
    });
  }

  if (chatClose) {
    chatClose.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      if (isClosingChat) return;
      isClosingChat = true;
      closeChatFully();
      if (chatHistoryState) {
        chatHistoryState = false; history.back();
      }
      setTimeout(() => { isClosingChat = false; }, 400);
    });
  }

  function adjustChatForKeyboard() {
    if (!chatWidget || !chatWidget.classList.contains('active')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const vh = vv.height, vt = vv.offsetTop || 0;
    const wh = window.innerHeight;
    const kh = wh - vh;
    if (kh > 100) {
      chatWidget.style.height = vh + 'px';
      chatWidget.style.top = vt + 'px';
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
    chatInput.addEventListener('blur', () => setTimeout(adjustChatForKeyboard, 300));
  }
  window.addEventListener('resize', adjustChatForKeyboard);

  // VOICE
  const voiceBtn = document.getElementById('voiceBtn');
  let recognition = null;
  let isRecording = false;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onstart = () => {
      isRecording = true;
      if (voiceBtn) voiceBtn.classList.add('recording');
      if (chatInput) chatInput.placeholder = '🎤 Listening...';
    };
    recognition.onresult = (event) => {
      let t = '';
      for (let i = event.resultIndex; i < event.results.length; i++) t += event.results[i][0].transcript;
      if (chatInput) chatInput.value = t;
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
      if (!recognition) { alert('Voice input not supported. Try Chrome.'); return; }
      if (isRecording) recognition.stop(); else recognition.start();
    });
  }

  // TTS
  let currentlySpeaking = false;
  let currentSpeakBtn = null;
  let currentMessageEl = null;

  function stopSpeaking() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (currentMessageEl) currentMessageEl.querySelectorAll('.speak-word.speaking').forEach(el => el.classList.remove('speaking'));
    if (currentSpeakBtn) {
      currentSpeakBtn.innerHTML = '🔊 Listen';
      currentSpeakBtn.classList.remove('speaking-active');
    }
    currentlySpeaking = false; currentSpeakBtn = null; currentMessageEl = null;
  }

  function prepareForTTS(rootEl) {
    if (rootEl.dataset.speechWrapped === 'true') {
      rootEl.querySelectorAll('.speak-word').forEach(span => {
        const t = document.createTextNode(span.textContent);
        span.parentNode.replaceChild(t, span);
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
          const cw = part.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[*#_`~]/g, '');
          if (!cw) { fragment.appendChild(document.createTextNode(part)); return; }
          const span = document.createElement('span');
          span.className = 'speak-word';
          span.textContent = part;
          const start = cleanText.length;
          cleanText += cw;
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
    const utt = new SpeechSynthesisUtterance(cleanText);
    utt.lang = lang; utt.rate = 1; utt.pitch = 1;
    utt.onboundary = (e) => {
      if (!currentlySpeaking) return;
      const ci = e.charIndex;
      let match = null;
      for (const p of posMap) if (ci >= p.charStart && ci < p.charEnd) { match = p; break; }
      if (match && match.span) {
        posMap.forEach(p => { if (p.span) p.span.classList.remove('speaking'); });
        match.span.classList.add('speaking');
        try { match.span.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (err) {}
      }
    };
    utt.onend = () => stopSpeaking();
    utt.onerror = () => stopSpeaking();
    speechSynthesis.speak(utt);
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
      if (sendBtn) sendBtn.disabled = true;
      try {
        const { model } = await getDeviceInfo();
        const payload = { message, history: chatHistory.slice(-10), deviceModel: model };
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
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
    div.className = 'ai-msg ' + (type === 'user' ? 'ai-msg-user' : type === 'typing' ? 'ai-msg-typing' : 'ai-msg-bot');
    if (type === 'bot' && text) {
      div.innerHTML = formatAIResponse(text);
      if (!text.includes('Thinking') && !text.includes('short break')) {
        const sb = document.createElement('button');
        sb.className = 'msg-speak-btn';
        sb.innerHTML = '🔊 Listen';
        sb.type = 'button';
        sb.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHindi = /[\u0900-\u097F]/.test(text);
          speakWithHighlight(div, sb, text, isHindi ? 'hi-IN' : 'en-IN');
        });
        div.appendChild(sb);
      }
    } else {
      div.textContent = text;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }
}

async function loadNexusPage(url, pushHistory) {
  try {
    const tBtn = document.getElementById('nexusThemeToggle');
    const bBtn = document.getElementById('nexusBackBtn');

    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');

    if (doc.title) document.title = doc.title;

    document.querySelectorAll('head [data-nexus-spa]').forEach(el => el.remove());
    doc.querySelectorAll('head style, head link[rel="stylesheet"]').forEach(el => {
      const outer = el.outerHTML;
      if (__baseStyles.has(outer)) return;
      const newEl = el.cloneNode(true);
      newEl.setAttribute('data-nexus-spa', '1');
      document.head.appendChild(newEl);
    });

    const allScripts = Array.from(doc.body.querySelectorAll('script'));
    const newBody = doc.body.cloneNode(true);
    newBody.querySelectorAll('script').forEach(s => s.remove());
    document.body.innerHTML = newBody.innerHTML;

    if (tBtn && !document.getElementById('nexusThemeToggle')) document.body.appendChild(tBtn);
    if (bBtn && !document.getElementById('nexusBackBtn')) document.body.appendChild(bBtn);

    allScripts.forEach(oldScript => {
      if (oldScript.src) return;
      const ns = document.createElement('script');
      ns.textContent = oldScript.textContent;
      document.body.appendChild(ns);
    });

    __currentPage = url.split('/').pop() || 'index.html';
    initNexusPage();
    window.scrollTo(0, 0);

    if (pushHistory) history.pushState({ nexusPage: url }, '', window.location.pathname);
  } catch (err) {
    window.location.href = url;
  }
}

window.__nexusLoadPage = loadNexusPage;

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
    if (e.state && e.state.nexusPage) loadNexusPage(e.state.nexusPage, false);
  });

  history.replaceState({ nexusPage: __currentPage }, '', window.location.pathname);
})();

applyTheme(__currentTheme);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNexusPage);
} else {
  initNexusPage();
}