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
