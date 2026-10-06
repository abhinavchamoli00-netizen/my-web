// =========================================
// NEXUS - Main Script
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

if (!THEMES.includes(__currentTheme)) {
  __currentTheme = 'dark';
}

function applyTheme(t) {
  document.documentElement.classList.remove(
    'theme-dark',
    'theme-day',
    'theme-amoled'
  );

  document.documentElement.classList.add('theme-' + t);

  const btn = document.getElementById('nexusThemeToggle');

  if (btn) {
    btn.textContent = THEME_ICONS[t];
  }
}


/* =========================================
   FLOATING BUTTONS
   ========================================= */

function ensureFloatingButtons() {
  /*
   * Keep the floating controls inside ONE fixed portal
   * that is a direct child of <body>.
   *
   * This avoids the old <html>-level implementation which
   * could behave like scrolling content on mobile Chrome.
   */

  let layer = document.getElementById('nexusFloatingLayer');

  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'nexusFloatingLayer';
    document.body.appendChild(layer);
  } else if (layer.parentElement !== document.body) {
    document.body.appendChild(layer);
  }


  /* THEME BUTTON */

  let tBtn = document.getElementById('nexusThemeToggle');

  if (!tBtn) {
    tBtn = document.createElement('button');

    tBtn.id = 'nexusThemeToggle';
    tBtn.type = 'button';
    tBtn.textContent = THEME_ICONS[__currentTheme];

    tBtn.setAttribute(
      'aria-label',
      'Change theme'
    );

    tBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const idx = THEMES.indexOf(__currentTheme);

      __currentTheme =
        THEMES[(idx + 1) % THEMES.length];

      localStorage.setItem(
        'nexus_theme',
        __currentTheme
      );

      applyTheme(__currentTheme);
    });

    layer.appendChild(tBtn);

  } else if (tBtn.parentElement !== layer) {

    layer.appendChild(tBtn);
  }


  /* BACK BUTTON */

  let bBtn = document.getElementById('nexusBackBtn');

  if (!bBtn) {

    bBtn = document.createElement('button');

    bBtn.id = 'nexusBackBtn';
    bBtn.type = 'button';

    bBtn.innerHTML = '←';

    bBtn.setAttribute(
      'aria-label',
      'Go back'
    );

    bBtn.addEventListener('click', (e) => {

      e.stopPropagation();
      e.preventDefault();

      if (window.history.length > 1) {

        window.history.back();

      } else {

        window.location.href = 'index.html';
      }
    });

    layer.appendChild(bBtn);

  } else if (bBtn.parentElement !== layer) {

    layer.appendChild(bBtn);
  }


  /* NOTICE OFFSET */

  const notice =
    document.querySelector('.personal-notice');

  let topPx = 20;

  if (
    notice &&
    notice.offsetHeight > 0
  ) {

    topPx =
      notice.offsetHeight + 14;

  } else if (notice) {

    topPx = 70;
  }


  /* FIXED PORTAL */

  const layerStyles = {

    position: 'fixed',

    top: topPx + 'px',

    left: '20px',

    right: 'auto',

    bottom: 'auto',

    width: '46px',

    height: '46px',

    margin: '0',

    padding: '0',

    zIndex: '2147483647',

    transform: 'none',

    '-webkit-transform': 'none',

    willChange: 'auto',

    contain: 'none',

    filter: 'none',

    '-webkit-filter': 'none',

    backdropFilter: 'none',

    '-webkit-backdrop-filter': 'none',

    perspective: 'none',

    isolation: 'isolate',

    pointerEvents: 'none'
  };


  Object.entries(layerStyles).forEach(
    ([prop, val]) => {

      try {

        layer.style.setProperty(
          prop,
          val,
          'important'
        );

      } catch (e) {}

    }
  );


  /* BUTTON STYLE */

  const buttonStyles = {

    position: 'absolute',

    top: '0',

    left: '0',

    right: 'auto',

    bottom: 'auto',

    width: '46px',

    height: '46px',

    borderRadius: '50%',

    background:
      'rgba(108, 92, 231, 0.95)',

    color: '#ffffff',

    border:
      '1px solid rgba(108, 92, 231, 1)',

    fontSize: '1.3rem',

    fontWeight: '700',

    cursor: 'pointer',

    zIndex: '2147483647',

    padding: '0',

    margin: '0',

    lineHeight: '1',

    boxShadow:
      '0 6px 20px rgba(0, 0, 0, 0.6)',

    fontFamily:
      '"Space Grotesk", sans-serif',

    alignItems: 'center',

    justifyContent: 'center',

    userSelect: 'none',

    transform: 'none',

    '-webkit-transform': 'none',

    willChange: 'auto',

    contain: 'none',

    filter: 'none',

    '-webkit-filter': 'none',

    backdropFilter: 'none',

    '-webkit-backdrop-filter': 'none',

    perspective: 'none',

    isolation: 'auto',

    pointerEvents: 'auto'
  };


  Object.entries(buttonStyles).forEach(
    ([prop, val]) => {

      try {

        tBtn.style.setProperty(
          prop,
          val,
          'important'
        );

      } catch (e) {}

      try {

        bBtn.style.setProperty(
          prop,
          val,
          'important'
        );

      } catch (e) {}

    }
  );


  /* VISIBILITY */

  const home = isHomePage();

  const chatOpen =
    document
      .getElementById('chatWidget')
      ?.classList
      .contains('active');


  if (chatOpen) {

    tBtn.style.setProperty(
      'display',
      'none',
      'important'
    );

    bBtn.style.setProperty(
      'display',
      'none',
      'important'
    );

  } else {

    tBtn.style.setProperty(
      'display',
      home ? 'flex' : 'none',
      'important'
    );

    bBtn.style.setProperty(
      'display',
      home ? 'none' : 'flex',
      'important'
    );
  }


  applyTheme(__currentTheme);
}


/* =========================================
   PAGE INITIALIZATION
   ========================================= */

function initNexusPage() {

  const home = isHomePage();


  /* Remove home-only sections from other pages */

  if (!home) {

    const fs =
      document.querySelector(
        '.feedback-section'
      );

    if (fs) fs.remove();


    const cs =
      document.querySelector(
        '.comments-section'
      );

    if (cs) cs.remove();
  }


  ensureFloatingButtons();


  /* =========================================
     DEVICE INFO
     ========================================= */

  async function getDeviceInfo() {

    let model = '';
    let platform = '';

    try {

      if (
        navigator.userAgentData &&
        navigator.userAgentData.getHighEntropyValues
      ) {

        const h =
          await navigator
            .userAgentData
            .getHighEntropyValues([
              'model',
              'platform',
              'platformVersion'
            ]);


        model = h.model || '';

        platform = h.platform || '';


        if (h.platformVersion) {

          const major =
            String(
              h.platformVersion
            ).split('.')[0];

          platform =
            platform
              ? platform + ' ' + major
              : major;
        }

      } else {

        const ua =
          navigator.userAgent;


        if (/Android/i.test(ua)) {

          const m =
            ua.match(
              /Android\s([\d.]+)/
            );

          platform =
            m
              ? 'Android ' +
                m[1].split('.')[0]
              : 'Android';

        } else if (
          /iPhone|iPad|iPod/i.test(ua)
        ) {

          platform = 'iOS';

        } else if (/Windows/i.test(ua)) {

          platform = 'Windows';

        } else if (/Mac OS X/i.test(ua)) {

          platform = 'macOS';

        } else if (/Linux/i.test(ua)) {

          platform = 'Linux';
        }
      }

    } catch (e) {}


    return {
      model,
      platform
    };
  }


  /* =========================================
     VISITOR TRACKING
     ========================================= */

  const hasTrackedVisit =
    sessionStorage.getItem(
      'nexus_visit_tracked'
    );


  if (!hasTrackedVisit) {

    sessionStorage.setItem(
      'nexus_visit_tracked',
      'true'
    );


    (async () => {

      const {
        model,
        platform
      } = await getDeviceInfo();


      const referrer =
        document.referrer ||
        'Direct';


      const device =
        /Mobi|Android/i.test(
          navigator.userAgent
        )
          ? 'Mobile'
          : 'Desktop';


      const browser =
        navigator.userAgent.includes(
          'Chrome'
        )
          ? 'Chrome'
          : navigator.userAgent.includes(
              'Firefox'
            )
          ? 'Firefox'
          : navigator.userAgent.includes(
              'Safari'
            )
          ? 'Safari'
          : 'Other';


      fetch('/api/visitor', {

        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({

          referrer,

          page: __currentPage,

          device,

          browser,

          model,

          platform
        })

      }).catch(() => {});
    })();
  }


  /* =========================================
     FEEDBACK FORM
     ========================================= */

  const feedbackForm =
    document.getElementById(
      'feedbackForm'
    );


  let isSubmitting = false;


  if (feedbackForm) {

    feedbackForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();

        if (isSubmitting) return;

        isSubmitting = true;


        const name =
          document
            .getElementById(
              'feedbackName'
            )
            .value
            .trim();


        const message =
          document
            .getElementById(
              'feedbackMessage'
            )
            .value
            .trim();


        const statusEl =
          document.getElementById(
            'feedbackStatus'
          );


        const submitBtn =
          document.getElementById(
            'feedbackSubmit'
          );


        if (!message) {

          isSubmitting = false;

          return;
        }


        submitBtn.disabled = true;

        submitBtn.textContent =
          'Sending...';

        statusEl.textContent = '';


        try {

          const res =
            await fetch(
              '/api/feedback',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body: JSON.stringify({
                  name,
                  message
                })
              }
            );


          const data =
            await res.json();


          if (data.success) {

            statusEl.textContent =
              '✅ Thanks! Your feedback has been sent.';

            statusEl.style.color =
              '#2ecc71';

            feedbackForm.reset();

          } else {

            statusEl.textContent =
              '❌ ' +
              (
                data.details ||
                data.error ||
                'Something went wrong.'
              );

            statusEl.style.color =
              '#e74c3c';
          }


        } catch (err) {

          statusEl.textContent =
            '❌ Network error. Please try again.';

          statusEl.style.color =
            '#e74c3c';


        } finally {

          setTimeout(() => {

            submitBtn.disabled = false;

            submitBtn.textContent =
              'Send Message';

            isSubmitting = false;

          }, 3000);
        }

      }
    );
  }


  /* =========================================
     COMMENTS
     ========================================= */

  const commentName =
    document.getElementById(
      'commentName'
    );

  const commentMessage =
    document.getElementById(
      'commentMessage'
    );

  const commentSubmit =
    document.getElementById(
      'commentSubmit'
    );

  const commentStatus =
    document.getElementById(
      'commentStatus'
    );

  const commentsList =
    document.getElementById(
      'commentsList'
    );


  let isCommentSubmitting = false;

  let lastCommentsHash = '';


  async function loadComments() {

    if (!commentsList) return;


    try {

      const res =
        await fetch(
          '/api/comments',
          {
            cache: 'no-store'
          }
        );


      const data =
        await res.json();


      if (!data.success) return;


      const comments =
        Array.isArray(data.comments)
          ? data.comments
          : [];


      const hash =
        JSON.stringify(comments);


      if (hash === lastCommentsHash) {
        return;
      }


      lastCommentsHash = hash;


      commentsList.innerHTML = '';


      comments.forEach(comment => {

        const item =
          document.createElement(
            'div'
          );


        item.className =
          'comment-item';


        const name =
          document.createElement(
            'div'
          );


        name.className =
          'comment-name';


        name.textContent =
          comment.name ||
          'Anonymous';


        const message =
          document.createElement(
            'div'
          );


        message.className =
          'comment-message';


        message.textContent =
          comment.message || '';


        const date =
          document.createElement(
            'div'
          );


        date.className =
          'comment-date';


        if (comment.createdAt) {

          try {

            date.textContent =
              new Date(
                comment.createdAt
              ).toLocaleString(
                'en-IN'
              );

          } catch (e) {

            date.textContent =
              '';
          }
        }


        item.appendChild(name);

        item.appendChild(message);

        item.appendChild(date);


        commentsList.appendChild(item);
      });


    } catch (err) {

      console.error(
        'Comments error:',
        err
      );
    }
  }


  loadComments();


  if (commentSubmit) {

    commentSubmit.addEventListener(
      'click',
      async () => {

        if (isCommentSubmitting) {
          return;
        }


        const name =
          commentName
            ? commentName.value.trim()
            : '';


        const message =
          commentMessage
            ? commentMessage.value.trim()
            : '';


        if (!message) {

          if (commentStatus) {

            commentStatus.textContent =
              'Please enter a comment.';
          }

          return;
        }


        isCommentSubmitting = true;

        commentSubmit.disabled = true;

        commentSubmit.textContent =
          'Posting...';


        try {

          const res =
            await fetch(
              '/api/comments',
              {
                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body: JSON.stringify({
                  name,
                  message
                })
              }
            );


          const data =
            await res.json();


          if (data.success) {

            if (commentStatus) {

              commentStatus.textContent =
                '✅ Comment posted!';
            }


            if (commentName) {
              commentName.value = '';
            }

            if (commentMessage) {
              commentMessage.value = '';
            }


            lastCommentsHash = '';

            await loadComments();

          } else {

            if (commentStatus) {

              commentStatus.textContent =
                '❌ ' +
                (
                  data.details ||
                  data.error ||
                  'Failed to post comment.'
                );
            }
          }


        } catch (err) {

          if (commentStatus) {

            commentStatus.textContent =
              '❌ Network error. Please try again.';
          }


        } finally {

          setTimeout(() => {

            commentSubmit.disabled = false;

            commentSubmit.textContent =
              'Post Comment';

            isCommentSubmitting = false;

          }, 1000);
        }
      }
    );
  }


  /* =========================================
     AI CHAT
     ========================================= */

  const chatWidget =
    document.getElementById(
      'chatWidget'
    );

  const chatLauncher =
    document.getElementById(
      'chatFab'
    ) ||
    document.querySelector(
      '.ai-chat-launcher'
    );


  const chatClose =
    document.getElementById(
      'chatClose'
    );


  const chatForm =
    document.getElementById(
      'chatForm'
    );


  const chatInput =
    document.getElementById(
      'chatInput'
    );


  const chatMessages =
    document.getElementById(
      'chatMessages'
    );


  const voiceBtn =
    document.getElementById(
      'chatVoice'
    );


  let chatHistory = [];

  let isChatSending = false;


  function updateFloatingButtonsVisibility() {

    const layer =
      document.getElementById(
        'nexusFloatingLayer'
      );


    if (!layer) return;


    const tBtn =
      document.getElementById(
        'nexusThemeToggle'
      );


    const bBtn =
      document.getElementById(
        'nexusBackBtn'
      );


    const home =
      isHomePage();


    const open =
      chatWidget &&
      chatWidget.classList.contains(
        'active'
      );


    if (open) {

      if (tBtn) {

        tBtn.style.setProperty(
          'display',
          'none',
          'important'
        );
      }


      if (bBtn) {

        bBtn.style.setProperty(
          'display',
          'none',
          'important'
        );
      }


    } else {

      if (tBtn) {

        tBtn.style.setProperty(
          'display',
          home ? 'flex' : 'none',
          'important'
        );
      }


      if (bBtn) {

        bBtn.style.setProperty(
          'display',
          home ? 'none' : 'flex',
          'important'
        );
      }
    }
  }


  if (chatLauncher && chatWidget) {

    chatLauncher.addEventListener(
      'click',
      () => {

        chatWidget.classList.add(
          'active'
        );

        updateFloatingButtonsVisibility();

        setTimeout(() => {

          if (chatInput) {
            chatInput.focus();
          }

        }, 100);
      }
    );
  }


  if (chatClose && chatWidget) {

    chatClose.addEventListener(
      'click',
      () => {

        chatWidget.classList.remove(
          'active'
        );

        updateFloatingButtonsVisibility();
      }
    );
  }


  /* =========================================
     SPEECH RECOGNITION
     ========================================= */

  let recognition = null;

  let isRecording = false;


  if (
    'SpeechRecognition' in window ||
    'webkitSpeechRecognition' in window
  ) {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    recognition =
      new SpeechRecognition();


    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.lang = 'en-IN';


    recognition.onstart = () => {

      isRecording = true;

      if (voiceBtn) {

        voiceBtn.classList.add(
          'recording'
        );

        voiceBtn.textContent =
          '⏹';
      }
    };


    recognition.onend = () => {

      isRecording = false;

      if (voiceBtn) {

        voiceBtn.classList.remove(
          'recording'
        );

        voiceBtn.textContent =
          '🎤';
      }
    };


    recognition.onerror = () => {

      isRecording = false;

      if (voiceBtn) {

        voiceBtn.classList.remove(
          'recording'
        );

        voiceBtn.textContent =
          '🎤';
      }
    };


    recognition.onresult = (event) => {

      const transcript =
        event.results[0][0].transcript;


      if (chatInput) {

        chatInput.value =
          transcript;
      }
    };
  }


  if (voiceBtn) {

    voiceBtn.addEventListener(
      'click',
      () => {

        if (!recognition) {

          alert(
            'Voice input not supported. Try Chrome.'
          );

          return;
        }


        if (isRecording) {

          recognition.stop();

        } else {

          recognition.start();
        }
      }
    );
  }


  /* =========================================
     TEXT TO SPEECH
     ========================================= */

  let currentlySpeaking = false;

  let currentSpeakBtn = null;

  let currentMessageEl = null;


  function stopSpeaking() {

    if (
      'speechSynthesis' in window
    ) {

      speechSynthesis.cancel();
    }


    if (currentMessageEl) {

      currentMessageEl
        .querySelectorAll(
          '.speak-word.speaking'
        )
        .forEach(el => {

          el.classList.remove(
            'speaking'
          );
        });
    }


    if (currentSpeakBtn) {

      currentSpeakBtn.innerHTML =
        '🔊 Listen';

      currentSpeakBtn.classList.remove(
        'speaking-active'
      );
    }


    currentlySpeaking = false;

    currentSpeakBtn = null;

    currentMessageEl = null;
  }


  function prepareForTTS(rootEl) {

    if (
      rootEl.dataset.speechWrapped ===
      'true'
    ) {

      rootEl
        .querySelectorAll(
          '.speak-word'
        )
        .forEach(span => {

          const t =
            document.createTextNode(
              span.textContent
            );

          span.parentNode.replaceChild(
            t,
            span
          );
        });


      delete rootEl.dataset
        .speechWrapped;
    }


    const textNodes = [];


    const walker =
      document.createTreeWalker(
        rootEl,
        NodeFilter.SHOW_TEXT
      );


    let node;


    while (
      (node = walker.nextNode())
    ) {

      if (
        node.parentElement &&
        node.parentElement.closest(
          '.msg-speak-btn'
        )
      ) {
        continue;
      }


      if (!node.textContent) {
        continue;
      }


      textNodes.push(node);
    }


    let cleanText = '';

    const posMap = [];


    textNodes.forEach(
      textNode => {

        const text =
          textNode.textContent;


        const fragment =
          document.createDocumentFragment();


        const parts =
          text.split(
            /(\s+)/
          );


        parts.forEach(
          part => {

            if (!part) return;


            if (
              /^\s+$/.test(part)
            ) {

              fragment.appendChild(
                document.createTextNode(
                  part
                )
              );

              cleanText += part;

            } else {

              const cw =
                part
                  .replace(
                    /[\u{1F300}-\u{1F9FF}]/gu,
                    ''
                  )
                  .replace(
                    /[*#_`~]/g,
                    ''
                  );


              if (!cw) {

                fragment.appendChild(
                  document.createTextNode(
                    part
                  )
                );

                return;
              }


              const span =
                document.createElement(
                  'span'
                );


              span.className =
                'speak-word';


              span.textContent =
                part;


              const start =
                cleanText.length;


              cleanText += cw;


              const end =
                cleanText.length;


              posMap.push({
                charStart: start,
                charEnd: end,
                span
              });


              fragment.appendChild(
                span
              );
            }
          }
        );


        textNode.parentNode.replaceChild(
          fragment,
          textNode
        );
      }
    );


    rootEl.dataset.speechWrapped =
      'true';


    return {
      cleanText,
      posMap
    };
  }


  function speakWithHighlight(
    messageDiv,
    speakBtn,
    text,
    lang = 'en-IN'
  ) {

    if (
      !('speechSynthesis' in window)
    ) {
      return;
    }


    if (
      currentlySpeaking &&
      currentSpeakBtn === speakBtn
    ) {

      stopSpeaking();

      return;
    }


    stopSpeaking();

    speechSynthesis.cancel();


    const {
      cleanText,
      posMap
    } =
      prepareForTTS(
        messageDiv
      );


    if (!cleanText.trim()) {

      stopSpeaking();

      return;
    }


    currentMessageEl =
      messageDiv;


    currentSpeakBtn =
      speakBtn;


    currentlySpeaking =
      true;


    speakBtn.innerHTML =
      '⏹ Stop';


    speakBtn.classList.add(
      'speaking-active'
    );


    const utt =
      new SpeechSynthesisUtterance(
        cleanText
      );


    utt.lang = lang;

    utt.rate = 1;

    utt.pitch = 1;


    utt.onboundary = (e) => {

      if (!currentlySpeaking) {
        return;
      }


      const ci =
        e.charIndex;


      let match = null;


      for (const p of posMap) {

        if (
          ci >= p.charStart &&
          ci < p.charEnd
        ) {

          match = p;

          break;
        }
      }


      if (
        match &&
        match.span
      ) {

        posMap.forEach(p => {

          if (p.span) {

            p.span.classList.remove(
              'speaking'
            );
          }
        });


        match.span.classList.add(
          'speaking'
        );


        try {

          match.span.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth'
          });

        } catch (err) {}
      }
    };


    utt.onend = () => {

      stopSpeaking();
    };


    utt.onerror = () => {

      stopSpeaking();
    };


    speechSynthesis.speak(
      utt
    );
  }


  /* =========================================
     CHAT SUBMIT
     ========================================= */

  if (chatForm) {

    chatForm.addEventListener(
      'submit',
      async (e) => {

        e.preventDefault();


        if (isChatSending) {
          return;
        }


        const message =
          chatInput.value.trim();


        if (!message) {
          return;
        }


        addChatMessage(
          message,
          'user'
        );


        chatInput.value = '';


        const typingEl =
          addChatMessage(
            'Thinking...',
            'typing'
          );


        isChatSending = true;


        const sendBtn =
          document.getElementById(
            'chatSend'
          );


        if (sendBtn) {
          sendBtn.disabled = true;
        }


        try {

          const {
            model
          } =
            await getDeviceInfo();


          const payload = {

            message,

            history:
              chatHistory.slice(-10),

            deviceModel:
              model
          };


          const res =
            await fetch(
              '/api/chat',
              {

                method: 'POST',

                headers: {
                  'Content-Type':
                    'application/json'
                },

                body:
                  JSON.stringify(
                    payload
                  )
              }
            );


          const data =
            await res.json();


          typingEl.remove();


          if (data.success) {

            addChatMessage(
              data.reply,
              'bot'
            );


            chatHistory.push({
              role: 'user',
              text: message
            });


            chatHistory.push({
              role: 'model',
              text: data.reply
            });


          } else if (
            data.error ===
            'limit_reached'
          ) {

            addChatMessage(
              `🚫 **Nexus AI is taking a short break!**

We've reached our **daily limit**. Please come back later. 🙏`,
              'bot'
            );


          } else {

            addChatMessage(
              '⚠️ Error: ' +
              (
                data.details ||
                data.error ||
                'Unknown'
              ),
              'bot'
            );
          }


        } catch (err) {

          typingEl.remove();


          addChatMessage(
            '❌ Network error. Please try again.',
            'bot'
          );


        } finally {

          isChatSending = false;


          if (sendBtn) {
            sendBtn.disabled = false;
          }
        }

      }
    );
  }


  /* =========================================
     FORMAT AI RESPONSE
     ========================================= */

  function formatAIResponse(text) {

    let html =
      text
        .replace(
          /&/g,
          '&amp;'
        )
        .replace(
          /</g,
          '&lt;'
        )
        .replace(
          />/g,
          '&gt;'
        );


    html =
      html.replace(
        /\*\*([^*]+)\*\*/g,
        '<strong>$1</strong>'
      );


    html =
      html.replace(
        /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
        '$1<em>$2</em>'
      );


    html =
      html.replace(
        /^#{1,4}\s*(.+)$/gm,
        '<div class="ai-heading">$1</div>'
      );


    html =
      html.replace(
        /^(\d+)\.\s+(.+)$/gm,
        '<div class="ai-bullet">$1. $2</div>'
      );


    html =
      html.replace(
        /^[•\-]\s+(.+)$/gm,
        '<div class="ai-bullet">• $1</div>'
      );


    html =
      html.replace(
        /\n/g,
        '<br>'
      );


    html =
      html.replace(
        /<br>(<div class="ai-heading">)/g,
        '$1'
      );


    html =
      html.replace(
        /<br>(<div class="ai-bullet">)/g,
        '$1'
      );


    html =
      html.replace(
        /(<\/div>)<br>/g,
        '$1'
      );


    html =
      html.replace(
        /(<br>){2,}/g,
        '<div class="ai-spacer"></div>'
      );


    return html;
  }


  /* =========================================
     ADD CHAT MESSAGE
     ========================================= */

  function addChatMessage(
    text,
    type
  ) {

    const div =
      document.createElement(
        'div'
      );


    div.className =
      'ai-msg ' +
      (
        type === 'user'
          ? 'ai-msg-user'
          : type === 'typing'
          ? 'ai-msg-typing'
          : 'ai-msg-bot'
      );


    if (
      type === 'bot' &&
      text
    ) {

      div.innerHTML =
        formatAIResponse(
          text
        );


      if (
        !text.includes(
          'Thinking'
        ) &&
        !text.includes(
          'short break'
        )
      ) {

        const sb =
          document.createElement(
            'button'
          );


        sb.className =
          'msg-speak-btn';


        sb.innerHTML =
          '🔊 Listen';


        sb.type = 'button';


        sb.addEventListener(
          'click',
          (e) => {

            e.stopPropagation();


            const isHindi =
              /[\u0900-\u097F]/.test(
                text
              );


            speakWithHighlight(
              div,
              sb,
              text,
              isHindi
                ? 'hi-IN'
                : 'en-IN'
            );
          }
        );


        div.appendChild(sb);
      }

    } else {

      div.textContent =
        text;
    }


    chatMessages.appendChild(
      div
    );


    chatMessages.scrollTop =
      chatMessages.scrollHeight;


    return div;
  }
}


/* =========================================
   SPA PAGE LOADER
   ========================================= */

async function loadNexusPage(
  url,
  pushHistory
) {

  try {

    const res =
      await fetch(
        url,
        {
          cache: 'no-cache'
        }
      );


    if (!res.ok) {

      throw new Error(
        'HTTP ' + res.status
      );
    }


    const html =
      await res.text();


    const doc =
      new DOMParser()
        .parseFromString(
          html,
          'text/html'
        );


    if (doc.title) {

      document.title =
        doc.title;
    }


    /* Remove SPA-added head styles */

    document
      .querySelectorAll(
        'head [data-nexus-spa]'
      )
      .forEach(
        el => el.remove()
      );


    doc
      .querySelectorAll(
        'head style, head link[rel="stylesheet"]'
      )
      .forEach(
        el => {

          const outer =
            el.outerHTML;


          if (
            __baseStyles.has(
              outer
            )
          ) {
            return;
          }


          const newEl =
            el.cloneNode(true);


          newEl.setAttribute(
            'data-nexus-spa',
            '1'
          );


          document.head.appendChild(
            newEl
          );
        }
      );


    /*
     * Preserve floating portal while
     * replacing body content.
     */

    const floatingLayer =
      document.getElementById(
        'nexusFloatingLayer'
      );


    if (floatingLayer) {

      floatingLayer.remove();
    }


    const allScripts =
      Array.from(
        doc.body.querySelectorAll(
          'script'
        )
      );


    const newBody =
      doc.body.cloneNode(
        true
      );


    newBody
      .querySelectorAll(
        'script'
      )
      .forEach(
        s => s.remove()
      );


    document.body.innerHTML =
      newBody.innerHTML;


    /*
     * Put floating portal back
     * as direct child of body.
     */

    if (floatingLayer) {

      document.body.appendChild(
        floatingLayer
      );
    }


    allScripts.forEach(
      oldScript => {

        if (oldScript.src) {
          return;
        }


        const ns =
          document.createElement(
            'script'
          );


        ns.textContent =
          oldScript.textContent;


        document.body.appendChild(
          ns
        );
      }
    );


    __currentPage =
      url.split('/').pop() ||
      'index.html';


    initNexusPage();


    window.scrollTo(
      0,
      0
    );


    if (pushHistory) {

      history.pushState(
        {
          nexusPage: url
        },
        '',
        window.location.pathname
      );
    }


  } catch (err) {

    window.location.href =
      url;
  }
}


/* =========================================
   GLOBAL PAGE LOADER
   ========================================= */

window.__nexusLoadPage =
  loadNexusPage;


/* =========================================
   SPA NAVIGATION
   ========================================= */

(function setupSpaNavigation() {

  if (window.__nexusSpaReady) {
    return;
  }


  window.__nexusSpaReady =
    true;


  document.addEventListener(
    'click',
    function(e) {

      const link =
        e.target.closest('a');


      if (!link) {
        return;
      }


      const href =
        link.getAttribute(
          'href'
        );


      if (!href) {
        return;
      }


      if (
        /^(https?:|mailto:|tel:|\/\/)/i.test(
          href
        )
      ) {
        return;
      }


      if (
        href.startsWith('#')
      ) {
        return;
      }


      if (
        link.target === '_blank'
      ) {
        return;
      }


      if (
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }


      if (e.button !== 0) {
        return;
      }


      e.preventDefault();


      loadNexusPage(
        href,
        true
      );
    }
  );


  window.addEventListener(
    'popstate',
    function(e) {

      if (
        e.state &&
        e.state.nexusPage
      ) {

        loadNexusPage(
          e.state.nexusPage,
          false
        );
      }
    }
  );


  history.replaceState(
    {
      nexusPage:
        __currentPage
    },
    '',
    window.location.pathname
  );

})();


/* =========================================
   INITIAL THEME + PAGE INIT
   ========================================= */

applyTheme(
  __currentTheme
);


if (
  document.readyState ===
  'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    initNexusPage
  );

} else {

  initNexusPage();
}