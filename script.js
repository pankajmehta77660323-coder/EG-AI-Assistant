/* =========================================================
   E.G. AI ASSISTANT
   MASTER SCRIPT — PART 1/5
   Core foundation + configuration + safe utilities
   ========================================================= */

"use strict";

/* =========================================================
   1. APP CONFIGURATION
   ========================================================= */

const EG_CONFIG = {
  appName: "E.G. AI Assistant",
  version: "1.0.0",
  language: "hi-IN",

  backendUrl: "",

  requestTimeout: 30000,

  maxMessageLength: 10000,
  maxNoteLength: 5000,
  maxTodoLength: 5000,

  storageKeys: {
    theme: "eg_theme",
    language: "eg_language",
    personality: "eg_personality",
    session: "eg_session",
    user: "eg_user",
    settings: "eg_settings"
  }
};

/* =========================================================
   2. GLOBAL APPLICATION STATE
   ========================================================= */

const EG_STATE = {
  initialized: false,

  loggedIn: false,

  user: null,
  session: null,

  currentChatId: null,

  isListening: false,
  isSpeaking: false,

  isLoading: false,

  currentPersonality: "friendly",

  currentLanguage: "hi-IN",

  theme: "system",

  messages: [],

  memory: [],

  history: [],

  notes: [],

  todos: [],

  reminders: [],

  settings: {},

  permissions: {},

  connection: {
    online: navigator.onLine,
    backend: false
  }
};

/* =========================================================
   3. PERSONALITY MODES
   ========================================================= */

const EG_PERSONALITIES = {
  friendly: {
    name: "Friendly",
    label: "दोस्ताना"
  },

  funny: {
    name: "Funny",
    label: "मजेदार"
  },

  romantic: {
    name: "Romantic",
    label: "रोमांटिक"
  },

  professional: {
    name: "Professional",
    label: "प्रोफेशनल"
  },

  teacher: {
    name: "Teacher",
    label: "टीचर"
  },

  coding: {
    name: "Coding",
    label: "कोडिंग"
  },

  serious: {
    name: "Serious",
    label: "गंभीर"
  },

  supportive: {
    name: "Supportive",
    label: "सहायक"
  }
};

/* =========================================================
   4. SUPPORTED LANGUAGES
   ========================================================= */

const EG_LANGUAGES = {
  "hi-IN": "Hindi",
  "en-US": "English",
  "bn-IN": "Bengali",
  "gu-IN": "Gujarati",
  "mr-IN": "Marathi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "pa-IN": "Punjabi",
  "ur-IN": "Urdu"
};

/* =========================================================
   5. SAFE DOM SELECTOR
   ========================================================= */

function $(selector) {
  if (!selector) {
    return null;
  }

  try {
    return document.querySelector(selector);
  } catch (error) {
    console.error("DOM selector error:", error);
    return null;
  }
}

/* =========================================================
   6. SAFE DOM SELECTOR ALL
   ========================================================= */

function $$(selector) {
  if (!selector) {
    return [];
  }

  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (error) {
    console.error("DOM selector-all error:", error);
    return [];
  }
}

/* =========================================================
   7. SAFE TEXT
   ========================================================= */

function cleanText(value, maxLength = 10000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

/* =========================================================
   8. SAFE HTML ESCAPE
   ========================================================= */

function escapeHTML(value) {
  const text = String(value ?? "");

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   9. SAFE JSON PARSER
   ========================================================= */

function safeJSONParse(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

/* =========================================================
   10. LOCAL STORAGE READ
   ========================================================= */

function readStorage(key, fallback = null) {
  if (!key) {
    return fallback;
  }

  try {
    const value = localStorage.getItem(key);

    if (value === null) {
      return fallback;
    }

    return safeJSONParse(value, fallback);
  } catch (error) {
    console.error("Storage read error:", error);
    return fallback;
  }
}

/* =========================================================
   11. LOCAL STORAGE WRITE
   ========================================================= */

function writeStorage(key, value) {
  if (!key) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage write error:", error);
    return false;
  }
}

/* =========================================================
   12. LOCAL STORAGE REMOVE
   ========================================================= */

function removeStorage(key) {
  if (!key) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Storage remove error:", error);
    return false;
  }
}

/* =========================================================
   13. GENERATE LOCAL ID
   ========================================================= */

function generateId(prefix = "eg") {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 10);

  const timePart = Date.now().toString(36);

  return `${prefix}_${timePart}_${randomPart}`;
}

/* =========================================================
   14. CURRENT TIMESTAMP
   ========================================================= */

function nowISO() {
  return new Date().toISOString();
}

/* =========================================================
   15. DATE FORMATTER
   ========================================================= */

function formatDate(value) {
  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString(EG_STATE.currentLanguage || "hi-IN");
  } catch (error) {
    return "";
  }
}

/* =========================================================
   16. SHOW TOAST
   ========================================================= */

function showToast(message, duration = 3000) {
  const text = cleanText(message, 500);

  if (!text) {
    return;
  }

  let toast = $("#egToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "egToast";

    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.appendChild(toast);
  }

  toast.textContent = text;
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);

  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

/* =========================================================
   17. SET LOADING STATE
   ========================================================= */

function setLoading(value) {
  EG_STATE.isLoading = Boolean(value);

  document.body.classList.toggle(
    "eg-loading",
    EG_STATE.isLoading
  );
}

/* =========================================================
   18. CONNECTION STATUS
   ========================================================= */

function updateConnectionStatus() {
  EG_STATE.connection.online = navigator.onLine;

  document.body.classList.toggle(
    "eg-offline",
    !EG_STATE.connection.online
  );
}

/* =========================================================
   19. ONLINE EVENT
   ========================================================= */

window.addEventListener("online", () => {
  EG_STATE.connection.online = true;
  updateConnectionStatus();

  showToast("Internet connection वापस आ गया है");
});

/* =========================================================
   20. OFFLINE EVENT
   ========================================================= */

window.addEventListener("offline", () => {
  EG_STATE.connection.online = false;
  updateConnectionStatus();

  showToast("Internet connection उपलब्ध नहीं है");
});

/* =========================================================
   21. PERSONALITY SETTER
   ========================================================= */

function setPersonality(mode) {
  if (!EG_PERSONALITIES[mode]) {
    return false;
  }

  EG_STATE.currentPersonality = mode;

  writeStorage(
    EG_CONFIG.storageKeys.personality,
    mode
  );

  document.body.dataset.personality = mode;

  return true;
}

/* =========================================================
   22. LANGUAGE SETTER
   ========================================================= */

function setLanguage(language) {
  if (!EG_LANGUAGES[language]) {
    return false;
  }

  EG_STATE.currentLanguage = language;

  writeStorage(
    EG_CONFIG.storageKeys.language,
    language
  );

  document.documentElement.lang = language;

  return true;
}

/* =========================================================
   23. THEME SETTER
   ========================================================= */

function setTheme(theme) {
  const allowedThemes = [
    "system",
    "light",
    "dark"
  ];

  if (!allowedThemes.includes(theme)) {
    return false;
  }

  EG_STATE.theme = theme;

  writeStorage(
    EG_CONFIG.storageKeys.theme,
    theme
  );

  document.documentElement.dataset.theme = theme;

  return true;
}

/* =========================================================
   24. RESTORE LOCAL SETTINGS
   ========================================================= */

function restoreLocalSettings() {
  const savedPersonality = readStorage(
    EG_CONFIG.storageKeys.personality,
    "friendly"
  );

  const savedLanguage = readStorage(
    EG_CONFIG.storageKeys.language,
    "hi-IN"
  );

  const savedTheme = readStorage(
    EG_CONFIG.storageKeys.theme,
    "system"
  );

  setPersonality(savedPersonality);
  setLanguage(savedLanguage);
  setTheme(savedTheme);
}

/* =========================================================
   25. BASIC INITIALIZATION
   ========================================================= 
= */

function initializeCore() {
  if (EG_STATE.initialized) {
    return;
  }

  restoreLocalSettings();
  updateConnectionStatus();

  EG_STATE.initialized = true;

  console.log(
    `${EG_CONFIG.appName} v${EG_CONFIG.version} core initialized.`
  );
}

/* =========================================================
   END OF PART 1/5
   ========================================================= */
/* =========================================================
   26. SESSION MANAGEMENT
   ========================================================= */

function saveSession(user, token) {
  if (!user || !token) {
    return false;
  }

  EG_STATE.user = user;
  EG_STATE.session = {
    token: token,
    savedAt: nowISO()
  };

  EG_STATE.loggedIn = true;

  writeStorage(
    EG_CONFIG.storageKeys.user,
    user
  );

  writeStorage(
    EG_CONFIG.storageKeys.session,
    EG_STATE.session
  );

  return true;
}

/* =========================================================
   27. GET SAVED TOKEN
   ========================================================= */

function getAuthToken() {
  const session = readStorage(
    EG_CONFIG.storageKeys.session,
    null
  );

  if (!session || typeof session.token !== "string") {
    return "";
  }

  return session.token.trim();
}

/* =========================================================
   28. CLEAR SESSION
   ========================================================= */

function clearSession() {
  EG_STATE.loggedIn = false;
  EG_STATE.user = null;
  EG_STATE.session = null;

  removeStorage(EG_CONFIG.storageKeys.user);
  removeStorage(EG_CONFIG.storageKeys.session);
}

/* =========================================================
   29. AUTH HEADERS
   ========================================================= */

function authHeaders(includeJSON = false) {
  const headers = {};

  if (includeJSON) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

/* =========================================================
   30. API URL
   ========================================================= */

function getBackendURL() {
  const configured = cleanText(
    EG_CONFIG.backendUrl,
    1000
  );

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  /*
   * Backend URL बाद में index.js / Render deployment
   * के अनुसार सेट किया जाएगा।
   */
  return "";
}

/* =========================================================
   31. API REQUEST
   ========================================================= */

async function apiRequest(
  path,
  options = {}
) {
  const backendURL = getBackendURL();

  if (!backendURL) {
    throw new Error(
      "Backend URL अभी सेट नहीं है"
    );
  }

  const cleanPath = String(path || "")
    .replace(/^\/+/, "");

  const controller = new AbortController();

  const timeout = window.setTimeout(() => {
    controller.abort();
  }, EG_CONFIG.requestTimeout);

  try {
    const requestOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        ...authHeaders(
          options.body !== undefined
        ),
        ...(options.headers || {})
      }
    };

    const response = await fetch(
      `${backendURL}/${cleanPath}`,
      requestOptions
    );

    return response;

  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Request का समय समाप्त हो गया"
      );
    }

    throw error;

  } finally {
    window.clearTimeout(timeout);
  }
}

/* =========================================================
   32. READ API RESPONSE
   ========================================================= */

async function readResponse(response) {
  if (!response) {
    return {
      success: false,
      error: "कोई response नहीं मिला"
    };
  }

  const contentType =
    response.headers.get("content-type") || "";

  try {
    if (
      contentType.includes("application/json")
    ) {
      return await response.json();
    }

    const text = await response.text();

    return {
      success: response.ok,
      data: text,
      error: response.ok
        ? ""
        : text || "Request failed"
    };

  } catch (error) {
    return {
      success: false,
      error: "Response पढ़ने में समस्या हुई"
    };
  }
}

/* =========================================================
   33. REGISTER USER
   ========================================================= */

async function registerUser(event) {
  if (event) {
    event.preventDefault();
  }

  const name =
    $("#registerName")?.value.trim() || "";

  const email =
    $("#registerEmail")?.value.trim() || "";

  const password =
    $("#registerPassword")?.value || "";

  if (!name || !email || !password) {
    showToast(
      "Name, email और password डालें"
    );
    return;
  }

  if (password.length < 6) {
    showToast(
      "Password कम से कम 6 characters का होना चाहिए"
    );
    return;
  }

  try {
    setLoading(true);

    showToast(
      "Account बनाया जा रहा है..."
    );

    const response = await apiRequest(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    );

    const data = await readResponse(response);

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Account नहीं बन पाया"
      );
    }

    if (data.token && data.user) {
      saveSession(
        data.user,
        data.token
      );
    }

    showToast(
      "Account सफलतापूर्वक बन गया"
    );

    showAssistant();

  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    showToast(
      error.message ||
      "Registration में समस्या हुई"
    );

  } finally {
    setLoading(false);
  }
}

/* =========================================================
   34. LOGIN USER
   ========================================================= */

async function loginUser(event) {
  if (event) {
    event.preventDefault();
  }

  const email =
    $("#loginEmail")?.value.trim() || "";

  const password =
    $("#loginPassword")?.value || "";

  if (!email || !password) {
    showToast(
      "Email और password डालें"
    );
    return;
  }

  try {
    setLoading(true);

    showToast(
      "Login किया जा रहा है..."
    );

    const response = await apiRequest(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await readResponse(response);

    if (!response.ok || !data.success) {
      throw new Error(
        data.error ||
        "Login नहीं हो पाया"
      );
    }

    if (!data.token || !data.user) {
      throw new Error(
        "Server ने valid login session नहीं भेजा"
      );
    }

    saveSession(
      data.user,
      data.token
    );

    showToast(
      "Login सफलतापूर्वक हुआ"
    );

    showAssistant();

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    showToast(
      error.message ||
      "Login में समस्या हुई"
    );

  } finally {
    setLoading(false);
  }
}

/* =========================================================
   35. LOGOUT USER
   ========================================================= */

async function logoutUser() {
  const token = getAuthToken();

  try {
    if (token && getBackendURL()) {
      await apiRequest(
        "/auth/logout",
        {
          method: "POST"
        }
      );
    }

  } catch (error) {
    console.error(
      "Logout request error:",
      error
    );

  } finally {
    clearSession();

    showLogin();

    showToast(
      "आप logout हो गए हैं"
    );
  }
}

/* =========================================================
   36. RESTORE SESSION
   ========================================================= */

async function restoreSession() {
  const token = getAuthToken();

  const savedUser = readStorage(
    EG_CONFIG.storageKeys.user,
    null
  );

  if (!token) {
    EG_STATE.loggedIn = false;
    return false;
  }

  /*
   * अगर user locally मौजूद है तो पहले उसे रखें।
   * बाद में backend /auth/me से verify करेंगे।
   */
  if (savedUser) {
    EG_STATE.user = savedUser;
  }

  try {
    if (!getBackendURL()) {
      EG_STATE.loggedIn = Boolean(savedUser);
      return EG_STATE.loggedIn;
    }

    const response = await apiRequest(
      "/auth/me",
      {
        method: "GET"
      }
    );

    const data = await readResponse(response);

    if (
      !response.ok ||
      !data.success ||
      !data.user
    ) {
      clearSession();
      return false;
    }

    EG_STATE.user = data.user;
    EG_STATE.loggedIn = true;

    writeStorage(
      EG_CONFIG.storageKeys.user,
      data.user
    );

    return true;

  } catch (error) {
    console.error(
      "Session restore error:",
      error
    );

    /*
     * Network problem होने पर session को
     * तुरंत delete नहीं करेंगे।
     */
    EG_STATE.loggedIn = Boolean(
      EG_STATE.user
    );

    return EG_STATE.loggedIn;
  }
}

/* =========================================================
   37. SHOW LOGIN SCREEN
   ========================================================= */

function showLogin() {
  const loginScreen =
    $("#loginScreen");

  const assistantScreen =
    $("#assistantScreen");

  if (loginScreen) {
    loginScreen.hidden = false;
    loginScreen.style.display = "";
  }

  if (assistantScreen) {
    assistantScreen.hidden = true;
    assistantScreen.style.display = "none";
  }

  document.body.classList.add(
    "login-active"
  );

  document.body.classList.remove(
    "assistant-active"
  );
}

/* =========================================================
   38. SHOW ASSISTANT SCREEN
   ========================================================= */

function showAssistant() {
  const loginScreen =
    $("#loginScreen");

  const assistantScreen =
    $("#assistantScreen");

  if (loginScreen) {
    loginScreen.hidden = true;
    loginScreen.style.display = "none";
  }

  if (assistantScreen) {
    assistantScreen.hidden = false;
    assistantScreen.style.display = "";
  }

  document.body.classList.remove(
    "login-active"
  );

  document.body.classList.add(
    "assistant-active"
  );
}

/* =========================================================
   39. LOGIN FORM EVENTS
   ========================================================= */

function setupAuthEvents() {
  const loginForm =
    $("#loginForm");

  const registerForm =
    $("#registerForm");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      loginUser
    );
  }

  if (registerForm) {
    registerForm.addEventListener(
      "submit",
      registerUser
    );
  }
}

/* =========================================================
   40. AUTH SCREEN STARTUP
   ========================================================= */

async function initializeAuthentication() {
  setupAuthEvents();

  const restored =
    await restoreSession();

  if (restored) {
    showAssistant();
  } else {
    showLogin();
  }
}

/* =========================================================
   END OF PART 2/5
   ========================================================= */
/* =========================================================
   41. CHAT STATE HELPERS
   ========================================================= */

function addMessage(role, content, extra = {}) {
  const safeRole =
    role === "user" || role === "assistant"
      ? role
      : "assistant";

  const safeContent = cleanText(
    content,
    EG_CONFIG.maxMessageLength
  );

  if (!safeContent) {
    return null;
  }

  const message = {
    id: generateId("msg"),
    role: safeRole,
    content: safeContent,
    createdAt: nowISO(),
    ...extra
  };

  EG_STATE.messages.push(message);

  return message;
}

/* =========================================================
   42. CLEAR CURRENT CHAT
   ========================================================= */

function clearCurrentChat() {
  EG_STATE.messages = [];
  EG_STATE.currentChatId = null;

  renderMessages();

  showToast("Current chat साफ कर दिया गया");
}

/* =========================================================
   43. RENDER MESSAGES
   ========================================================= */

function renderMessages() {
  const container =
    $("#chatMessages") ||
    $("#messages") ||
    $(".chat-messages");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  EG_STATE.messages.forEach((message) => {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      `message-row ${message.role}`;

    const bubble =
      document.createElement("div");

    bubble.className =
      `message-bubble ${message.role}`;

    bubble.innerHTML =
      escapeHTML(message.content)
        .replace(/\n/g, "<br>");

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
  });

  container.scrollTop =
    container.scrollHeight;
}

/* =========================================================
   44. GET CHAT INPUT
   ========================================================= */

function getChatInput() {
  return (
    $("#chatInput") ||
    $("#messageInput") ||
    $("#userInput") ||
    $("textarea[name='message']")
  );
}

/* =========================================================
   45. GET CHAT FORM
   ========================================================= */

function getChatForm() {
  return (
    $("#chatForm") ||
    $("#messageForm")
  );
}

/* =========================================================
   46. SEND CHAT MESSAGE
   ========================================================= */

async function sendChatMessage(event) {
  if (event) {
    event.preventDefault();
  }

  const input = getChatInput();

  if (!input) {
    showToast(
      "Chat input नहीं मिला"
    );
    return;
  }

  const text = cleanText(
    input.value,
    EG_CONFIG.maxMessageLength
  );

  if (!text) {
    showToast(
      "पहले message लिखें"
    );
    return;
  }

  if (EG_STATE.isLoading) {
    return;
  }

  addMessage(
    "user",
    text
  );

  input.value = "";

  renderMessages();

  try {
    setLoading(true);

    const response = await apiRequest(
      "/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message: text,
          language:
            EG_STATE.currentLanguage,
          personality:
            EG_STATE.currentPersonality,
          chatId:
            EG_STATE.currentChatId
        })
      }
    );

    const data =
      await readResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      throw new Error(
        data.error ||
        "Assistant response नहीं मिला"
      );
    }

    const answer =
      data.reply ||
      data.message ||
      data.response ||
      data.answer ||
      "";

    if (!answer) {
      throw new Error(
        "Assistant ने खाली response भेजा"
      );
    }

    addMessage(
      "assistant",
      answer
    );

    renderMessages();

    /*
     * Voice output बाद के हिस्से में
     * सुरक्षित तरीके से जोड़ा जाएगा।
     */

  } catch (error) {
    console.error(
      "Chat error:",
      error
    );

    addMessage(
      "assistant",
      error.message ||
      "अभी response नहीं मिल पाया"
    );

    renderMessages();

  } finally {
    setLoading(false);
  }
}

/* =========================================================
   47. CHAT FORM EVENTS
   ========================================================= */

function setupChatEvents() {
  const form =
    getChatForm();

  if (form) {
    form.addEventListener(
      "submit",
      sendChatMessage
    );
  }

  const sendButton =
    $("#sendButton") ||
    $("#sendMessageButton");

  if (sendButton) {
    sendButton.addEventListener(
      "click",
      sendChatMessage
    );
  }
}

/* =========================================================
   48. MEMORY STATE
   ========================================================= */

function setMemory(items) {
  EG_STATE.memory =
    Array.isArray(items)
      ? items
      : [];
}

/* =========================================================
   49. LOAD MEMORY
   ========================================================= */

async function loadMemory() {
  if (!getBackendURL()) {
    return [];
  }

  try {
    const response =
      await apiRequest(
        "/memory",
        {
          method: "GET"
        }
      );

    const data =
      await readResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      return [];
    }

    const memory =
      Array.isArray(data.memory)
        ? data.memory
        : [];

    setMemory(memory);

    return memory;

  } catch (error) {
    console.error(
      "Memory load error:",
      error
    );

    return [];
  }
}

/* =========================================================
   50. SAVE MEMORY
   ========================================================= */

async function saveMemory(content) {
  const text =
    cleanText(content, 5000);

  if (!text) {
    return false;
  }

  try {
    const response =
      await apiRequest(
        "/memory",
        {
          method: "POST",
          body: JSON.stringify({
            content: text
          })
        }
      );

    const data =
      await readResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      return false;
    }

    await loadMemory();

    return true;

  } catch (error) {
    console.error(
      "Memory save error:",
      error
    );

    return false;
  }
}

/* =========================================================
   51. DELETE MEMORY
   ========================================================= */

async function deleteMemory(memoryId) {
  const id =
    cleanText(memoryId, 200);

  if (!id) {
    return false;
  }

  try {
    const response =
      await apiRequest(
        `/memory/${encodeURIComponent(id)}`,
        {
          method: "DELETE"
        }
      );

    const data =
      await readResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      return false;
    }

    await loadMemory();

    return true;

  } catch (error) {
    console.error(
      "Memory delete error:",
      error
    );

    return false;
  }
}

/* =========================================================
   52. HISTORY STATE
   ========================================================= */

function setHistory(items) {
  EG_STATE.history =
    Array.isArray(items)
      ? items
      : [];
}

/* =========================================================
   53. LOAD CHAT HISTORY
   ========================================================= */

async function loadHistory() {
  if (!getBackendURL()) {
    return [];
  }

  try {
    const response =
      await apiRequest(
        "/history",
        {
          method: "GET"
        }
      );

    const data =
      await readResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      return [];
    }

    const history =
      Array.isArray(data.history)
        ? data.history
        : [];

    setHistory(history);

    return history;

  } catch (error) {
    console.error(
      "History load error:",
      error
    );

    return [];
  }
}

/* =========================================================
   54. DELETE CHAT HISTORY
   ========================================================= */

async function deleteHistoryItem(historyId) {
  const id =
    cleanText(historyId, 200);

  if (!id) {
    return false;
  }

  try {
    const response =
      await apiRequest(
        `/history/${encodeURIComponent(id)}`,
        {
          method: "DELETE"
        }
      );

    const data =
      await readResponse(response);

    if (
      !response.ok ||
      !data.success
    ) {
      return false;
    }

    await loadHistory();

    return true;

  } catch (error) {
    console.error(
      "History delete error:",
      error
    );

    return false;
  }
}

/* =========================================================
   55. NOTE STATE
   ========================================================= */

function setNotes(items) {
  EG_STATE.notes =
    Array.isArray(items)
      ? items
      : [];
}

/* =========================================================
   56. ADD LOCAL NOTE
   ========================================================= */

function addLocalNote(content) {
  const text =
    cleanText(content, 5000);

  if (!text) {
    return null;
  }

  const note = {
    id: generateId("note"),
    content: text,
    createdAt: nowISO()
  };

  EG_STATE.notes.push(note);

  return note;
}

/* =========================================================
   57. DELETE LOCAL NOTE
   ========================================================= */

function deleteLocalNote(noteId) {
  const index =
    EG_STATE.notes.findIndex(
      (note) => note.id === noteId
    );

  if (index === -1) {
    return false;
  }

  EG_STATE.notes.splice(
    index,
    1
  );

  return true;
}

/* =========================================================
   58. TODO STATE
   ========================================================= */

function setTodos(items) {
  EG_STATE.todos =
    Array.isArray(items)
      ? items
      : [];
}

/* =========================================================
   59. ADD TODO
   ========================================================= */

function addTodo(title) {
  const text =
    cleanText(title, 5000);

  if (!text) {
    return null;
  }

  const todo = {
    id: generateId("todo"),
    title: text,
    completed: false,
    createdAt: nowISO()
  };

  EG_STATE.todos.push(todo);

  return todo;
}

/* =========================================================
   60. TOGGLE TODO
   ========================================================= */

function toggleTodo(todoId) {
  const todo =
    EG_STATE.todos.find(
      (item) => item.id === todoId
    );

  if (!todo) {
    return false;
  }

  todo.completed =
    !todo.completed;

  return true;
}

/* =========================================================
   61. DELETE TODO
   ========================================================= */

function deleteTodo(todoId) {
  const index =
    EG_STATE.todos.findIndex(
      (item) => item.id === todoId
    );

  if (index === -1) {
    return false;
  }

  EG_STATE.todos.splice(
    index,
    1
  );

  return true;
}

/* =========================================================
   62. REMINDER STATE
   ========================================================= */

function setReminders(items) {
  EG_STATE.reminders =
    Array.isArray(items)
      ? items
      : [];
}

/* =========================================================
   63. CREATE REMINDER
   ========================================================= */

function createReminder(
  title,
  dateTime
) {
  const safeTitle =
    cleanText(title, 5000);

  const safeDate =
    cleanText(dateTime, 200);

  if (!safeTitle || !safeDate) {
    return null;
  }

  const date =
    new Date(safeDate);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const reminder = {
    id: generateId("reminder"),
    title: safeTitle,
    dateTime: date.toISOString(),
    completed: false,
    createdAt: nowISO()
  };

  EG_STATE.reminders.push(
    reminder
  );

  return reminder;
}

/* =========================================================
   64. DELETE REMINDER
   ========================================================= */

function deleteReminder(reminderId) {
  const index =
    EG_STATE.reminders.findIndex(
      (item) =>
        item.id === reminderId
    );

  if (index === -1) {
    return false;
  }

  EG_STATE.reminders.splice(
    index,
    1
  );

  return true;
}

/* =========================================================
   65. CHECK REMINDERS
   ========================================================= */

function checkReminders() {
  const now =
    Date.now();

  EG_STATE.reminders.forEach(
    (reminder) => {
      if (
        reminder.completed ||
        !reminder.dateTime
      ) {
        return;
      }

      const time =
        new Date(
          reminder.dateTime
        ).getTime();

      if (
        Number.isNaN(time) ||
        time > now
      ) {
        return;
      }

      reminder.completed = true;

      showToast(
        `Reminder: ${reminder.title}`,
        5000
      );
    }
  );
}

/* =========================================================
   66. REMINDER TIMER
   ========================================================= */

function startReminderChecker() {
  window.clearInterval(
    startReminderChecker.timer
  );

  startReminderChecker.timer =
    window.setInterval(
      checkReminders,
      10000
    );
}

/* =========================================================
   END OF PART 3/5
   ========================================================= */
/* =========================================================
   67. SPEECH RECOGNITION SUPPORT
   ========================================================= */

let speechRecognition = null;

function createSpeechRecognition() {
  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!Recognition) {
    return null;
  }

  const recognition = new Recognition();

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.lang =
    EG_STATE.currentLanguage || "hi-IN";

  recognition.onstart = () => {
    EG_STATE.isListening = true;

    document.body.classList.add(
      "eg-listening"
    );

    showToast("E.G. सुन रहा है...");
  };

  recognition.onresult = (event) => {
    const result =
      event.results?.[0]?.[0]?.transcript || "";

    const text =
      cleanText(
        result,
        EG_CONFIG.maxMessageLength
      );

    if (!text) {
      return;
    }

    const input = getChatInput();

    if (input) {
      input.value = text;
      input.dispatchEvent(
        new Event("input", {
          bubbles: true
        })
      );
    }
  };

  recognition.onerror = (event) => {
    console.error(
      "Speech recognition error:",
      event.error
    );

    if (event.error === "not-allowed") {
      showToast(
        "Microphone permission की अनुमति दें"
      );
    } else if (
      event.error === "no-speech"
    ) {
      showToast(
        "E.G. को आपकी आवाज़ सुनाई नहीं दी"
      );
    } else {
      showToast(
        "Voice input में समस्या हुई"
      );
    }
  };

  recognition.onend = () => {
    EG_STATE.isListening = false;

    document.body.classList.remove(
      "eg-listening"
    );
  };

  return recognition;
}

/* =========================================================
   68. START LISTENING
   ========================================================= */

function startListening() {
  if (EG_STATE.isListening) {
    return;
  }

  if (!speechRecognition) {
    speechRecognition =
      createSpeechRecognition();
  }

  if (!speechRecognition) {
    showToast(
      "इस browser में voice input उपलब्ध नहीं है"
    );
    return;
  }

  speechRecognition.lang =
    EG_STATE.currentLanguage || "hi-IN";

  try {
    speechRecognition.start();
  } catch (error) {
    console.error(
      "Speech start error:",
      error
    );
  }
}

/* =========================================================
   69. STOP LISTENING
   ========================================================= */

function stopListening() {
  if (!speechRecognition) {
    return;
  }

  try {
    speechRecognition.stop();
  } catch (error) {
    console.error(
      "Speech stop error:",
      error
    );
  }
}

/* =========================================================
   70. VOICE OUTPUT
   ========================================================= */

function speakText(text) {
  const message =
    cleanText(text, 10000);

  if (!message) {
    return false;
  }

  if (
    !("speechSynthesis" in window)
  ) {
    showToast(
      "इस browser में voice output उपलब्ध नहीं है"
    );

    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        message
      );

    utterance.lang =
      EG_STATE.currentLanguage ||
      "hi-IN";

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      EG_STATE.isSpeaking = true;
    };

    utterance.onend = () => {
      EG_STATE.isSpeaking = false;
    };

    utterance.onerror = () => {
      EG_STATE.isSpeaking = false;
    };

    window.speechSynthesis.speak(
      utterance
    );

    return true;

  } catch (error) {
    console.error(
      "Speech output error:",
      error
    );

    return false;
  }
}

/* =========================================================
   71. STOP SPEAKING
   ========================================================= */

function stopSpeaking() {
  if (
    "speechSynthesis" in window
  ) {
    window.speechSynthesis.cancel();
  }

  EG_STATE.isSpeaking = false;
}

/* =========================================================
   72. WAKE WORD CHECK
   ========================================================= */

function containsWakeWord(text) {
  const value =
    cleanText(text, 500);

  if (!value) {
    return false;
  }

  const normalized =
    value.toLowerCase();

  return (
    normalized === "e.g." ||
    normalized === "eg" ||
    normalized.includes(" e.g. ") ||
    normalized.includes(" eg ") ||
    normalized.startsWith("e.g. ") ||
    normalized.startsWith("eg ")
  );
}

/* =========================================================
   73. REMOVE WAKE WORD
   ========================================================= */

function removeWakeWord(text) {
  let value =
    cleanText(text, EG_CONFIG.maxMessageLength);

  if (!value) {
    return "";
  }

  value = value.replace(
    /^e\.g\.\s*/i,
    ""
  );

  value = value.replace(
    /^eg\s+/i,
    ""
  );

  return value.trim();
}

/* =========================================================
   74. VOICE BUTTON EVENTS
   ========================================================= */

function setupVoiceEvents() {
  const buttons = [
    $("#voiceButton"),
    $("#micButton"),
    $("#startVoiceButton")
  ];

  buttons.forEach((button) => {
    if (!button) {
      return;
    }

    button.addEventListener(
      "click",
      () => {
        if (EG_STATE.isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    );
  });

  const stopVoiceButton =
    $("#stopVoiceButton");

  if (stopVoiceButton) {
    stopVoiceButton.addEventListener(
      "click",
      stopListening
    );
  }

  const stopSpeakingButton =
    $("#stopSpeakingButton");

  if (stopSpeakingButton) {
    stopSpeakingButton.addEventListener(
      "click",
      stopSpeaking
    );
  }
}

/* =========================================================
   75. CALCULATOR
   ========================================================= */

function calculate(expression) {
  const value =
    cleanText(expression, 500);

  if (!value) {
    return null;
  }

  /*
   * केवल सामान्य गणितीय characters की अनुमति।
   * Arbitrary JavaScript execution की अनुमति नहीं।
   */
  if (
    !/^[0-9+\-*/().%\s]+$/.test(
      value
    )
  ) {
    return null;
  }

  try {
    /*
     * Function को केवल mathematical
     * expression के लिए इस्तेमाल किया जा रहा है।
     */
    const result =
      Function(
        `"use strict"; return (${value})`
      )();

    if (
      typeof result !== "number" ||
      !Number.isFinite(result)
    ) {
      return null;
    }

    return result;

  } catch (error) {
    return null;
  }
}

/* =========================================================
   76. UNIT CONVERSION
   ========================================================= */

const EG_CONVERSIONS = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    ft: 0.3048,
    inch: 0.0254
  },

  weight: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.45359237
  },

  volume: {
    l: 1,
    ml: 0.001
  }
};

function convertUnit(
  value,
  from,
  to,
  category
) {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const group =
    EG_CONVERSIONS[category];

  if (!group) {
    return null;
  }

  const fromUnit =
    cleanText(from, 20).toLowerCase();

  const toUnit =
    cleanText(to, 20).toLowerCase();

  if (
    group[fromUnit] === undefined ||
    group[toUnit] === undefined
  ) {
    return null;
  }

  return (
    number *
    group[fromUnit] /
    group[toUnit]
  );
}

/* =========================================================
   77. DATE AND TIME
   ========================================================= */

function getCurrentDateTime() {
  const date =
    new Date();

  return {
    iso: date.toISOString(),

    date:
      date.toLocaleDateString(
        EG_STATE.currentLanguage || "hi-IN"
      ),

    time:
      date.toLocaleTimeString(
        EG_STATE.currentLanguage || "hi-IN"
      )
  };
}

/* =========================================================
   78. TIMER
   ========================================================= */

let egTimer = null;

function startTimer(seconds, callback) {
  const duration =
    Number(seconds);

  if (
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return false;
  }

  stopTimer();

  egTimer =
    window.setTimeout(() => {
      egTimer = null;

      if (
        typeof callback === "function"
      ) {
        callback();
      } else {
        showToast(
          "Timer पूरा हो गया"
        );
      }
    }, duration * 1000);

  return true;
}

/* =========================================================
   79. STOP TIMER
   ========================================================= */

function stopTimer() {
  if (egTimer !== null) {
    window.clearTimeout(
      egTimer
    );

    egTimer = null;
  }
}

/* =========================================================
   80. NOTES AND TODO STORAGE
   ========================================================= */

function saveLocalLists() {
  writeStorage(
    "eg_notes",
    EG_STATE.notes
  );

  writeStorage(
    "eg_todos",
    EG_STATE.todos
  );

  writeStorage(
    "eg_reminders",
    EG_STATE.reminders
  );
}

/* =========================================================
   81. RESTORE LOCAL LISTS
   ========================================================= */

function restoreLocalLists() {
  const notes =
    readStorage(
      "eg_notes",
      []
    );

  const todos =
    readStorage(
      "eg_todos",
      []
    );

  const reminders =
    readStorage(
      "eg_reminders",
      []
    );

  setNotes(notes);
  setTodos(todos);
  setReminders(reminders);
}

/* =========================================================
   82. LIST EVENT HELPERS
   ========================================================= */

function setupListEvents() {
  const addNoteButton =
    $("#addNoteButton");

  if (addNoteButton) {
    addNoteButton.addEventListener(
      "click",
      () => {
        const input =
          $("#noteInput");

        if (!input) {
          return;
        }

        const note =
          addLocalNote(
            input.value
          );

        if (!note) {
          showToast(
            "Note लिखें"
          );
          return;
        }

        input.value = "";

        saveLocalLists();

        showToast(
          "Note save हो गया"
        );
      }
    );
  }

  const addTodoButton =
    $("#addTodoButton");

  if (addTodoButton) {
    addTodoButton.addEventListener(
      "click",
      () => {
        const input =
          $("#todoInput");

        if (!input) {
          return;
        }

        const todo =
          addTodo(
            input.value
          );

        if (!todo) {
          showToast(
            "Todo लिखें"
          );
          return;
        }

        input.value = "";

        saveLocalLists();

        showToast(
          "Todo add हो गया"
        );
      }
    );
  }
}

/* =========================================================
   83. LOAD ALL LOCAL DATA
   ========================================================= */

function restoreAllLocalData() {
  restoreLocalSettings();
  restoreLocalLists();
}

/* =========================================================
   84. CHAT + AUTH STARTUP
   ========================================================= */

async function initializeAssistant() {
  initializeCore();

  restoreAllLocalData();

  setupAuthEvents();
  setupChatEvents();
  setupVoiceEvents();
  setupListEvents();

  startReminderChecker();

  try {
    const authenticated =
      await restoreSession();

    if (authenticated) {
      showAssistant();

      await Promise.allSettled([
        loadMemory(),
        loadHistory()
      ]);

    } else {
      showLogin();
    }

  } catch (error) {
    console.error(
      "Assistant initialization error:",
      error
    );

    showLogin();
  }
}

/* =========================================================
   85. SAFE GLOBAL EXPORTS
   ========================================================= */

window.EG = {
  config: EG_CONFIG,
  state: EG_STATE,

  login: loginUser,
  register: registerUser,
  logout: logoutUser,

  sendMessage: sendChatMessage,

  startListening,
  stopListening,

  speak: speakText,
  stopSpeaking,

  calculate,
  convertUnit,

  addNote: addLocalNote,
  addTodo,

  createReminder,

  clearSession
};

/* =========================================================
   END OF PART 4/5
   ========================================================= */
/* =========================================================
   86. KEYBOARD EVENTS
   ========================================================= */

function setupKeyboardEvents() {
  document.addEventListener(
    "keydown",
    (event) => {
      if (!event) {
        return;
      }

      /*
       * Enter = message send
       * Shift + Enter = नई line
       */
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        const active =
          document.activeElement;

        const input =
          getChatInput();

        if (
          input &&
          active === input
        ) {
          const form =
            getChatForm();

          if (form) {
            event.preventDefault();

            form.requestSubmit();
          }
        }
      }

      /*
       * Escape = voice / speech stop
       */
      if (
        event.key === "Escape"
      ) {
        stopListening();
        stopSpeaking();
      }
    }
  );
}

/* =========================================================
   87. MENU EVENTS
   ========================================================= */

function setupMenuEvents() {
  const menuButton =
    $("#menuButton") ||
    $("#hamburgerButton");

  const menu =
    $("#sideMenu") ||
    $("#menuPanel");

  if (
    !menuButton ||
    !menu
  ) {
    return;
  }

  menuButton.addEventListener(
    "click",
    () => {
      menu.classList.toggle(
        "open"
      );

      menu.hidden =
        !menu.classList.contains(
          "open"
        );
    }
  );
}

/* =========================================================
   88. PANEL CLOSE EVENTS
   ========================================================= */

function setupPanelCloseButtons() {
  const buttons =
    $$(
      "[data-close-panel]"
    );

  buttons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const targetId =
            button.dataset.closePanel;

          if (!targetId) {
            return;
          }

          const target =
            document.getElementById(
              targetId
            );

          if (target) {
            target.hidden = true;
          }
        }
      );
    }
  );
}

/* =========================================================
   89. UTILITY EVENTS
   ========================================================= */

function setupUtilityEvents() {
  const calculatorButton =
    $("#calculatorButton");

  if (calculatorButton) {
    calculatorButton.addEventListener(
      "click",
      () => {
        const input =
          $("#calculatorInput");

        const output =
          $("#calculatorResult");

        if (!input || !output) {
          return;
        }

        const result =
          calculate(input.value);

        if (result === null) {
          output.textContent =
            "Invalid calculation";
          return;
        }

        output.textContent =
          String(result);
      }
    );
  }

  const conversionButton =
    $("#conversionButton");

  if (conversionButton) {
    conversionButton.addEventListener(
      "click",
      () => {
        const value =
          $("#conversionValue");

        const from =
          $("#conversionFrom");

        const to =
          $("#conversionTo");

        const category =
          $("#conversionCategory");

        const output =
          $("#conversionResult");

        if (
          !value ||
          !from ||
          !to ||
          !category ||
          !output
        ) {
          return;
        }

        const result =
          convertUnit(
            value.value,
            from.value,
            to.value,
            category.value
          );

        if (result === null) {
          output.textContent =
            "Invalid conversion";
          return;
        }

        output.textContent =
          String(result);
      }
    );
  }
}

/* =========================================================
   90. SECURITY EVENTS
   ========================================================= */

function setupSecurityEvents() {
  const logoutButton =
    $("#logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logoutUser
    );
  }

  const clearSessionButton =
    $("#clearSessionButton");

  if (clearSessionButton) {
    clearSessionButton.addEventListener(
      "click",
      () => {
        clearSession();

        showLogin();

        showToast(
          "Session सुरक्षित रूप से हटाया गया"
        );
      }
    );
  }
}

/* =========================================================
   91. MODAL EVENTS
   ========================================================= */

function setupModalEvents() {
  const modalCloseButtons =
    $$(
      "[data-close-modal]"
    );

  modalCloseButtons.forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const modal =
            button.closest(
              ".modal"
            );

          if (modal) {
            modal.hidden = true;
          }
        }
      );
    }
  );
}

/* =========================================================
   92. OUTSIDE CLICK
   ========================================================= */

function setupOutsideClick() {
  document.addEventListener(
    "click",
    (event) => {
      const menu =
        $("#sideMenu") ||
        $("#menuPanel");

      const button =
        $("#menuButton") ||
        $("#hamburgerButton");

      if (
        !menu ||
        !button ||
        menu.hidden
      ) {
        return;
      }

      if (
        menu.contains(event.target) ||
        button.contains(event.target)
      ) {
        return;
      }

      menu.classList.remove(
        "open"
      );

      menu.hidden = true;
    }
  );
}

/* =========================================================
   93. BEFORE UNLOAD
   ========================================================= */

function setupBeforeUnload() {
  window.addEventListener(
    "beforeunload",
    () => {
      stopListening();
      stopSpeaking();
    }
  );
}

/* =========================================================
   94. REDUCED MOTION
   ========================================================= */

function applyReducedMotionPreference() {
  try {
    const media =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

    document.body.classList.toggle(
      "reduced-motion",
      media.matches
    );
  } catch (error) {
    console.error(
      "Reduced motion check failed:",
      error
    );
  }
}

/* =========================================================
   95. APPLY PERSONALITY
   ========================================================= */

function applyPersonalityMode() {
  const mode =
    EG_STATE.currentPersonality;

  document.body.dataset.personality =
    mode;

  const selector =
    $("#personalitySelect");

  if (selector) {
    selector.value = mode;
  }
}

/* =========================================================
   96. UPDATE ATTACHMENT UI
   ========================================================= */

function updateAttachmentUI() {
  const input =
    $("#attachmentInput");

  const label =
    $("#attachmentLabel");

  if (
    !input ||
    !label
  ) {
    return;
  }

  input.addEventListener(
    "change",
    () => {
      const count =
        input.files?.length || 0;

      label.textContent =
        count > 0
          ? `${count} file selected`
          : "Attach file";
    }
  );
}

/* =========================================================
   97. CONNECTION EVENTS
   ========================================================= */

function setupConnectionEvents() {
  window.addEventListener(
    "online",
    updateConnectionStatus
  );

  window.addEventListener(
    "offline",
    updateConnectionStatus
  );
}

/* =========================================================
   98. VISIBILITY EVENTS
   ========================================================= */

function setupVisibilityEvents() {
  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.hidden
      ) {
        stopSpeaking();
      }
    }
  );
}

/* =========================================================
   99. GLOBAL ERROR HANDLER
   ========================================================= */

function setupGlobalErrorHandler() {
  window.addEventListener(
    "error",
    (event) => {
      console.error(
        "E.G. global error:",
        event.error || event.message
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      console.error(
        "E.G. unhandled promise rejection:",
        event.reason
      );
    }
  );
}

/* =========================================================
   100. FINAL UI SETUP
   ========================================================= */

function setupFinalUI() {
  applyReducedMotionPreference();
  applyPersonalityMode();
  updateConnectionStatus();
  updateAttachmentUI();

  document.documentElement.lang =
    EG_STATE.currentLanguage ||
    "hi-IN";
}

/* =========================================================
   101. CLIENT SECURITY CHECK
   ========================================================= */

function runClientSecurityCheck() {
  const warnings = [];

  if (
    window.location.protocol !==
      "https:" &&
    window.location.hostname !==
      "localhost"
  ) {
    warnings.push(
      "HTTPS connection recommended"
    );
  }

  if (
    document.querySelector(
      "input[type='password']"
    )
  ) {
    console.log(
      "Password input detected: browser security controls active."
    );
  }

  if (
    warnings.length > 0
  ) {
    console.warn(
      "E.G. security warnings:",
      warnings
    );
  }
}

/* =========================================================
   102. DEBUG INFORMATION
   ========================================================= */

function exposeSafeDebugInfo() {
  window.EG_STATUS = () => ({
    app:
      EG_CONFIG.appName,

    version:
      EG_CONFIG.version,

    initialized:
      EG_STATE.initialized,

    loggedIn:
      EG_STATE.loggedIn,

    online:
      EG_STATE.connection.online,

    listening:
      EG_STATE.isListening,

    speaking:
      EG_STATE.isSpeaking,

    personality:
      EG_STATE.currentPersonality,

    language:
      EG_STATE.currentLanguage
  });
}

/* =========================================================
   103. TOOL SYSTEM
   ========================================================= */

function setupToolSystem() {
  window.EG_TOOLS = {
    calculator: calculate,
    convertUnit,
    currentDateTime:
      getCurrentDateTime,

    startTimer,
    stopTimer,

    addNote: addLocalNote,
    deleteNote: deleteLocalNote,

    addTodo,
    toggleTodo,
    deleteTodo,

    createReminder,
    deleteReminder,

    saveMemory,
    deleteMemory,

    loadMemory,
    loadHistory,

    clearChat:
      clearCurrentChat
  };
}

/* =========================================================
   104. FINAL STARTUP
   ========================================================= */

async function startEGAssistant() {
  try {
    await initializeAssistant();

    console.log(
      "E.G. AI Assistant initialized successfully."
    );

  } catch (error) {
    console.error(
      "E.G. startup failed:",
      error
    );

    showLogin();
  }
}

/* =========================================================
   105. START APPLICATION
   ========================================================= */

function startApplication() {
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        startEGAssistant();
      },
      {
        once: true
      }
    );
  } else {
    startEGAssistant();
  }
}

/* =========================================================
   106. START
   ========================================================= */

startApplication();

/* =========================================================
   107. FINAL FILE STATUS
   ========================================================= */

console.log(
  "E.G. AI Assistant — script.js loaded successfully."
);

/* =========================================================
   END OF PART 5/5
   ========================================================= */
