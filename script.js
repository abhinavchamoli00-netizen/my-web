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

  // 4. LIVE COMMENTS
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
    setInterval(loadComments, 15000);
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
      commentSubmit.style.pointerEvents = 'none';
      commentSubmit.style.opacity = '0.6';
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

          setTimeout(() => {
            commentStatus.textContent = '';
          }, 3000);
        } else {
          commentStatus.textContent = '❌ ' + (data.details || data.error || 'Something went wrong.');
          commentStatus.style.color = '#e74c3c';
        }
      } catch (err) {
        commentStatus.textContent = '❌ Network error. Please try again.';
        commentStatus.style.color = '#e74c3c';
      } finally {
        commentSubmit.disabled = false;
        commentSubmit.style.pointerEvents = 'auto';
        commentSubmit.style.opacity = '1';
        commentSubmit.textContent = 'Post Comment';
        isCommentSubmitting = false;
      }
    });
  }

  // 5. AI CHAT WIDGET
  const chatFab = document.getElementById('chatFab');
  const chatWidget = document.getElementById('chatWidget');
  const chatBackdrop = document.getElementById('chatBackdrop');
  const chatClose = document.getElementById('chatClose');
  const chatMaximize = document.getElementById('chatMaximize');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  let chatHistory = [];
  let isChatSending = false;
  let chatHistoryState = false;

  function closeChatFully() {
    chatWidget.classList.remove('active');
    chatWidget.classList.remove('maximized');
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
  }

  function pushChatHistory() {
    if (!chatHistoryState) {
      history.pushState({ nexusChat: true }, '');
      chatHistoryState = true;
    }
  }

  window.addEventListener('popstate', () => {
    if (chatHistoryState && chatWidget.classList.contains('active')) {
      chatHistoryState = false;
      closeChatFully();
    }
  });

  if (chatFab) {
    chatFab.addEventListener('click', () => {
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
      if (chatWidget.classList.contains('maximized')) return;
      
      if (chatHistoryState) {
        chatHistoryState = false;
        history.back();
      } else {
        closeChatFully();
      }
    });
  }

  if (chatClose) {
    chatClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (chatHistoryState) {
        chatHistoryState = false;
        history.back();
      } else {
        closeChatFully();
      }
    });
  }

  if (chatMaximize) {
    chatMaximize.addEventListener('click', (e) => {
      e.stopPropagation();
      chatWidget.classList.toggle('maximized');
      
      if (chatWidget.classList.contains('maximized')) {
        document.body.style.overflow = 'hidden';
        if (chatBackdrop) {
          chatBackdrop.classList.add('active');
          chatBackdrop.classList.add('locked');
        }
        pushChatHistory();
      } else {
        document.body.style.overflow = '';
        chatWidget.style.height = '';
        chatWidget.style.bottom = '';
        chatWidget.style.top = '';
        chatWidget.style.maxHeight = '';
        chatWidget.classList.remove('keyboard-open');
        if (chatBackdrop) {
          chatBackdrop.classList.remove('locked');
          if (chatWidget.classList.contains('active')) {
            chatBackdrop.classList.add('active');
          }
        }
      }
      
      setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 100);
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

    if (chatWidget.classList.contains('maximized')) {
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
    } else {
      if (isKeyboardOpen) {
        const availableHeight = viewportHeight - 90;
        chatWidget.style.top = (viewportTop + 75) + 'px';
        chatWidget.style.bottom = 'auto';
        chatWidget.style.height = availableHeight + 'px';
        chatWidget.style.maxHeight = availableHeight + 'px';
        chatWidget.classList.add('keyboard-open');
      } else {
        chatWidget.style.top = '';
        chatWidget.style.bottom = '';
        chatWidget.style.height = '';
        chatWidget.style.maxHeight = '';
        chatWidget.classList.remove('keyboard-open');
      }
    }

    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 150);
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

  // =========================================
  // 🎤 VOICE INPUT (Speech to Text)
  // =========================================
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
      chatInput.placeholder = '🎤 Listening...';
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      chatInput.value = transcript;
    };

    recognition.onerror = (event) => {
      console.log('Voice error:', event.error);
      isRecording = false;
      if (voiceBtn) voiceBtn.classList.remove('recording');
      chatInput.placeholder = 'Type your message...';
    };

    recognition.onend = () => {
      isRecording = false;
      if (voiceBtn) voiceBtn.classList.remove('recording');
      chatInput.placeholder = 'Type your message...';
    };
  }

  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (!recognition) {
        alert('Voice input not supported in this browser. Try Chrome.');
        return;
      }
      if (isRecording) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }

  // =========================================
  // 📎 IMAGE UPLOAD
  // =========================================
  const imageBtn = document.getElementById('imageBtn');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const removeImage = document.getElementById('removeImage');
  let uploadedImageData = null;

  if (imageBtn && imageInput) {
    imageBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large. Max 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        uploadedImageData = ev.target.result;
        previewImg.src = uploadedImageData;
        imagePreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });

    removeImage.addEventListener('click', () => {
      uploadedImageData = null;
      imageInput.value = '';
      imagePreview.style.display = 'none';
      previewImg.src = '';
    });
  }

  // =========================================
  // 🔊 TEXT-TO-SPEECH
  // =========================================
  function speakText(text, lang = 'en-IN') {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    
    const clean = text
      .replace(/[*#_`~]/g, '')
      .replace(/•/g, ',')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .trim();
    
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  }

  // =========================================
  // 🖼️ IMAGE GENERATION (Pollinations.ai)
  // =========================================
  function isImageRequest(text) {
    const lower = text.toLowerCase();
    return lower.startsWith('generate image') ||
           lower.startsWith('create image') ||
           lower.startsWith('make image') ||
           lower.startsWith('draw ') ||
           lower.startsWith('banao image') ||
           lower.startsWith('image banao') ||
           lower.startsWith('/image ') ||
           lower.startsWith('imagine ');
  }

  function extractImagePrompt(text) {
    return text
      .replace(/^(generate image|create image|make image|draw|banao image|image banao|\/image|imagine)\s*(of|:)?\s*/i, '')
      .trim();
  }

  // =========================================
  // CHAT FORM SUBMIT
  // =========================================
  if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isChatSending) return;

      let message = chatInput.value.trim();
      const currentImage = uploadedImageData;

      if (!message && !currentImage) return;

      // 🖼️ Check if image generation is requested
      if (message && isImageRequest(message)) {
        const prompt = extractImagePrompt(message);
        if (prompt) {
          addChatMessage(message, 'user');
          chatInput.value = '';
          
          const loadingEl = document.createElement('div');
          loadingEl.className = 'ai-msg ai-msg-bot';
          loadingEl.innerHTML = '<div class="img-loading">🎨 Generating image... Please wait (10-15 sec)</div>';
          chatMessages.appendChild(loadingEl);
          chatMessages.scrollTop = chatMessages.scrollHeight;

          const encodedPrompt = encodeURIComponent(prompt + ', high quality, detailed');
          const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;

          setTimeout(() => {
            loadingEl.remove();
            const imgMsg = document.createElement('div');
            imgMsg.className = 'ai-msg ai-msg-bot';
            const img = document.createElement('img');
            img.className = 'ai-msg-image';
            img.src = imgUrl;
            img.alt = prompt;
            img.onload = () => {
              chatMessages.scrollTop = chatMessages.scrollHeight;
            };
            imgMsg.appendChild(img);
            chatMessages.appendChild(imgMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }, 3000);

          return;
        }
      }

      // 🔥 Normal message flow
      addChatMessageWithImage(message, 'user', currentImage);
      chatInput.value = '';
      
      if (currentImage) {
        uploadedImageData = null;
        imageInput.value = '';
        imagePreview.style.display = 'none';
        previewImg.src = '';
      }

      const typingEl = addChatMessage('Thinking...', 'typing');

      isChatSending = true;
      const sendBtn = document.getElementById('chatSend');
      sendBtn.disabled = true;

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            message: message || '(image sent)',
            history: chatHistory.slice(-10)
          })
        });

        const data = await res.json();
        typingEl.remove();

        if (data.success) {
          addChatMessage(data.reply, 'bot');
          chatHistory.push({ role: 'user', text: message });
          chatHistory.push({ role: 'model', text: data.reply });
        } else if (data.error === 'limit_reached') {
          addChatMessage(
            `🚫 **Nexus AI is taking a short break!**\n\n` +
            `We've reached our **daily limit** for AI responses. Please come back in a few hours.\n\n` +
            `Thanks for your patience! 🙏`,
            'bot'
          );
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

  // =========================================
  // CHAT MESSAGE HELPERS
  // =========================================
  function addChatMessageWithImage(text, type, imageData) {
    const div = document.createElement('div');
    div.className = 'ai-msg ' + (type === 'user' ? 'ai-msg-user' : 'ai-msg-bot');

    if (text) {
      const textNode = document.createElement('div');
      if (type === 'bot') {
        textNode.innerHTML = formatAIResponse(text);
      } else {
        textNode.textContent = text;
      }
      div.appendChild(textNode);
    }

    if (imageData) {
      const img = document.createElement('img');
      img.className = 'ai-msg-image';
      img.src = imageData;
      div.appendChild(img);
    }

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

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
      
      // Add speak button (not for welcome/thinking)
      if (!text.includes('Thinking') && !text.includes('Welcome')) {
        const speakBtn = document.createElement('button');
        speakBtn.className = 'msg-speak-btn';
        speakBtn.innerHTML = '🔊 Listen';
        speakBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHindi = /[\u0900-\u097F]/.test(text);
          speakText(text, isHindi ? 'hi-IN' : 'en-IN');
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

});