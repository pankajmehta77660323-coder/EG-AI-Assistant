"use strict";

/*
===========================================================
 E.G. AI ASSISTANT — BACKEND
 index.js — Part 1/5
===========================================================

 Purpose:
 - Secure Express server foundation
 - Environment-based configuration
 - Security headers
 - CORS
 - JSON/body validation
 - Request ID
 - Basic rate limiting
 - Health endpoint

 IMPORTANT:
 - No secret/API key is stored in this file.
 - Secrets must come from environment variables.
 - Database connection will be added later.
===========================================================
*/


/* =========================================================
   1. IMPORT PACKAGES
   ========================================================= */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");


/* =========================================================
   2. CREATE EXPRESS APP
   ========================================================= */

const app = express();


/* =========================================================
   3. SERVER CONFIGURATION
   ========================================================= */

const PORT = Number(process.env.PORT) || 3000;

const NODE_ENV =
  process.env.NODE_ENV || "development";

const APP_NAME =
  process.env.APP_NAME || "E.G. AI Assistant";


/* =========================================================
   4. BASIC LIMITS
   ========================================================= */

const MAX_BODY_SIZE =
  process.env.MAX_BODY_SIZE || "1mb";

const MAX_REQUESTS_PER_MINUTE =
  Number(process.env.MAX_REQUESTS_PER_MINUTE) || 60;


/* =========================================================
   5. TRUST PROXY
   ========================================================= */

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}


/* =========================================================
   6. SECURITY HEADERS
   ========================================================= */

app.disable("x-powered-by");


app.use((req, res, next) => {

  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "DENY"
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  res.setHeader(
    "Permissions-Policy",
    "microphone=(self), camera=(self), geolocation=(self)"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  next();

});


/* =========================================================
   7. CORS CONFIGURATION
   ========================================================= */

const allowedOrigins =
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);


const corsOptions = {

  origin(origin, callback) {

    /*
     Allow requests without an Origin header.
     This is useful for health checks and server-to-server
     requests.
    */

    if (!origin) {
      return callback(null, true);
    }


    /*
     Development mode:
     Allow localhost origins.
    */

    if (
      NODE_ENV !== "production" &&
      (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      )
    ) {
      return callback(null, true);
    }


    /*
     Production:
     Only explicitly allowed origins.
    */

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }


    return callback(
      new Error("CORS origin not allowed")
    );

  },


  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],


  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-ID"
  ],


  credentials: true,


  maxAge: 86400

};


app.use(cors(corsOptions));


/* =========================================================
   8. PREFLIGHT REQUEST
   ========================================================= */

app.options("*", cors(corsOptions));


/* =========================================================
   9. BODY PARSERS
   ========================================================= */

app.use(
  express.json({
    limit: MAX_BODY_SIZE
  })
);


app.use(
  express.urlencoded({
    extended: false,
    limit: MAX_BODY_SIZE
  })
);


/* =========================================================
   10. REQUEST ID
   ========================================================= */

app.use((req, res, next) => {

  const incomingRequestId =
    req.get("X-Request-ID");


  const requestId =
    incomingRequestId &&
    /^[a-zA-Z0-9_-]{8,100}$/.test(
      incomingRequestId
    )
      ? incomingRequestId
      : crypto.randomUUID();


  req.requestId = requestId;


  res.setHeader(
    "X-Request-ID",
    requestId
  );


  next();

});


/* =========================================================
   11. REQUEST TIMING
   ========================================================= */

app.use((req, res, next) => {

  req.requestStartTime = Date.now();

  res.on("finish", () => {

    const duration =
      Date.now() - req.requestStartTime;


    if (NODE_ENV !== "test") {

      console.log(
        `[E.G.] ${req.method} ${req.originalUrl} ` +
        `${res.statusCode} ${duration}ms ` +
        `requestId=${req.requestId}`
      );

    }

  });


  next();

});


/* =========================================================
   12. BASIC IN-MEMORY RATE LIMITER
   ========================================================= */

const rateLimitStore = new Map();


function getClientIdentifier(req) {

  const forwardedFor =
    req.headers["x-forwarded-for"];


  if (typeof forwardedFor === "string") {

    const firstIp =
      forwardedFor
        .split(",")[0]
        .trim();

    if (firstIp) {
      return firstIp;
    }

  }


  return req.ip || "unknown";

}


function cleanupRateLimitStore() {

  const now = Date.now();


  for (
    const [key, value]
    of rateLimitStore.entries()
  ) {

    if (
      now - value.windowStart >=
      60 * 1000
    ) {

      rateLimitStore.delete(key);

    }

  }

}


setInterval(
  cleanupRateLimitStore,
  60 * 1000
);


app.use((req, res, next) => {

  const clientId =
    getClientIdentifier(req);


  const now = Date.now();


  let record =
    rateLimitStore.get(clientId);


  if (!record) {

    record = {
      windowStart: now,
      count: 0
    };

    rateLimitStore.set(
      clientId,
      record
    );

  }


  if (
    now - record.windowStart >=
    60 * 1000
  ) {

    record.windowStart = now;
    record.count = 0;

  }


  record.count += 1;


  res.setHeader(
    "X-RateLimit-Limit",
    String(MAX_REQUESTS_PER_MINUTE)
  );


  res.setHeader(
    "X-RateLimit-Remaining",
    String(
      Math.max(
        0,
        MAX_REQUESTS_PER_MINUTE -
        record.count
      )
    )
  );


  if (
    record.count >
    MAX_REQUESTS_PER_MINUTE
  ) {

    return res.status(429).json({

      success: false,

      error: {
        code: "RATE_LIMITED",
        message:
          "Too many requests. Please try again later."
      },

      requestId: req.requestId

    });

  }


  next();

});


/* =========================================================
   13. HEALTH CHECK
   ========================================================= */

app.get("/health", (req, res) => {

  res.status(200).json({

    success: true,

    app: APP_NAME,

    status: "healthy",

    environment: NODE_ENV,

    timestamp: new Date().toISOString(),

    requestId: req.requestId

  });

});


/* =========================================================
   14. API ROOT
   ========================================================= */

app.get("/api", (req, res) => {

  res.status(200).json({

    success: true,

    message:
      "E.G. AI Assistant backend is running.",

    version: "1.0.0",

    requestId: req.requestId

  });

});


/* =========================================================
   Part 1/5 END
=========================================================== */
 /* =========================================================
    15. COMMON RESPONSE HELPERS
    ========================================================= */

function sendSuccess(res, data = {}, statusCode = 200) {

  return res.status(statusCode).json({
    success: true,
    ...data
  });

}


function sendError(
  res,
  statusCode = 500,
  code = "INTERNAL_ERROR",
  message = "Something went wrong."
) {

  return res.status(statusCode).json({

    success: false,

    error: {
      code,
      message
    },

    requestId: res.getHeader("X-Request-ID")

  });

}


/* =========================================================
   16. INPUT VALIDATION HELPERS
   ========================================================= */

function isNonEmptyString(value, maxLength = 10000) {

  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );

}


function normalizeEmail(email) {

  if (typeof email !== "string") {
    return "";
  }

  return email
    .trim()
    .toLowerCase();

}


function isValidEmail(email) {

  if (
    typeof email !== "string" ||
    email.length < 5 ||
    email.length > 254
  ) {

    return false;

  }


  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );

}


function isValidPassword(password) {

  return (
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 128
  );

}


function isValidName(name) {

  return (
    typeof name === "string" &&
    name.trim().length >= 2 &&
    name.length <= 100
  );

}


function isValidId(id) {

  return (
    typeof id === "string" &&
    /^[a-zA-Z0-9_-]{8,100}$/.test(id)
  );

}


/* =========================================================
   17. REQUEST BODY SAFETY
   ========================================================= */

app.use((req, res, next) => {

  if (
    ["POST", "PUT", "PATCH"].includes(
      req.method
    )
  ) {

    if (
      req.body === null ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {

      return sendError(
        res,
        400,
        "INVALID_BODY",
        "Invalid request body."
      );

    }

  }


  next();

});


/* =========================================================
   18. AUTHENTICATION STORE
   =========================================================

   Temporary in-memory store.

   IMPORTANT:
   This is only for the current development stage.

   Later, the database layer will replace this store.
   Passwords are NEVER stored directly.
   ========================================================= */

const usersStore = new Map();


const sessionsStore = new Map();


/* =========================================================
   19. PASSWORD HASHING
   ========================================================= */

const PASSWORD_HASH_ITERATIONS = 120000;

const PASSWORD_HASH_KEY_LENGTH = 64;

const PASSWORD_HASH_DIGEST = "sha512";


function hashPassword(password) {

  return new Promise((resolve, reject) => {

    const salt =
      crypto.randomBytes(16).toString("hex");


    crypto.pbkdf2(
      password,
      salt,
      PASSWORD_HASH_ITERATIONS,
      PASSWORD_HASH_KEY_LENGTH,
      PASSWORD_HASH_DIGEST,
      (error, derivedKey) => {

        if (error) {
          return reject(error);
        }


        resolve({
          salt,
          hash: derivedKey.toString("hex")
        });

      }
    );

  });

}


function verifyPassword(
  password,
  storedSalt,
  storedHash
) {

  return new Promise((resolve, reject) => {

    crypto.pbkdf2(
      password,
      storedSalt,
      PASSWORD_HASH_ITERATIONS,
      PASSWORD_HASH_KEY_LENGTH,
      PASSWORD_HASH_DIGEST,
      (error, derivedKey) => {

        if (error) {
          return reject(error);
        }


        const calculatedHash =
          derivedKey.toString("hex");


        const calculatedBuffer =
          Buffer.from(calculatedHash, "hex");


        const storedBuffer =
          Buffer.from(storedHash, "hex");


        if (
          calculatedBuffer.length !==
          storedBuffer.length
        ) {

          return resolve(false);

        }


        resolve(
          crypto.timingSafeEqual(
            calculatedBuffer,
            storedBuffer
          )
        );

      }
    );

  });

}


/* =========================================================
   20. SESSION TOKEN
   ========================================================= */

function createSession(userId) {

  const token =
    crypto.randomBytes(48).toString("hex");


  const sessionId =
    crypto.randomUUID();


  const createdAt =
    Date.now();


  const expiresAt =
    createdAt +
    7 * 24 * 60 * 60 * 1000;


  sessionsStore.set(
    token,
    {
      sessionId,
      userId,
      createdAt,
      expiresAt
    }
  );


  return {
    token,
    sessionId,
    expiresAt
  };

}


/* =========================================================
   21. SESSION CLEANUP
   ========================================================= */

function cleanupExpiredSessions() {

  const now =
    Date.now();


  for (
    const [token, session]
    of sessionsStore.entries()
  ) {

    if (
      session.expiresAt <= now
    ) {

      sessionsStore.delete(token);

    }

  }

}


setInterval(
  cleanupExpiredSessions,
  5 * 60 * 1000
);


/* =========================================================
   22. BEARER TOKEN EXTRACTION
   ========================================================= */

function extractBearerToken(req) {

  const authorization =
    req.get("Authorization");


  if (
    typeof authorization !== "string"
  ) {

    return null;

  }


  const match =
    authorization.match(
      /^Bearer\s+([a-fA-F0-9]{40,200})$/
    );


  if (!match) {
    return null;
  }


  return match[1];

}


/* =========================================================
   23. SESSION AUTHENTICATION
   ========================================================= */

function getAuthenticatedSession(req) {

  cleanupExpiredSessions();


  const token =
    extractBearerToken(req);


  if (!token) {
    return null;
  }


  const session =
    sessionsStore.get(token);


  if (!session) {
    return null;
  }


  if (
    session.expiresAt <= Date.now()
  ) {

    sessionsStore.delete(token);

    return null;

  }


  return {
    token,
    ...session
  };

}


/* =========================================================
   24. REQUIRE AUTHENTICATION
   ========================================================= */

function requireAuthentication(
  req,
  res,
  next
) {

  const session =
    getAuthenticatedSession(req);


  if (!session) {

    return sendError(
      res,
      401,
      "AUTH_REQUIRED",
      "Authentication is required."
    );

  }


  req.auth = session;


  next();

}


/* =========================================================
   25. USER OBJECT
   ========================================================= */

function createSafeUser(user) {

  if (!user) {
    return null;
  }


  return {

    id: user.id,

    name: user.name,

    email: user.email,

    createdAt: user.createdAt

  };

}


/* =========================================================
   26. REGISTER ENDPOINT
   ========================================================= */

app.post(
  "/auth/register",
  async (req, res) => {

    try {

      const name =
        typeof req.body.name === "string"
          ? req.body.name.trim()
          : "";


      const email =
        normalizeEmail(
          req.body.email
        );


      const password =
        req.body.password;


      if (!isValidName(name)) {

        return sendError(
          res,
          400,
          "INVALID_NAME",
          "Name must be between 2 and 100 characters."
        );

      }


      if (!isValidEmail(email)) {

        return sendError(
          res,
          400,
          "INVALID_EMAIL",
          "Please enter a valid email address."
        );

      }


      if (!isValidPassword(password)) {

        return sendError(
          res,
          400,
          "INVALID_PASSWORD",
          "Password must be between 8 and 128 characters."
        );

      }


      if (usersStore.has(email)) {

        return sendError(
          res,
          409,
          "EMAIL_EXISTS",
          "An account with this email already exists."
        );

      }


      const passwordData =
        await hashPassword(password);


      const user = {

        id: crypto.randomUUID(),

        name,

        email,

        passwordHash:
          passwordData.hash,

        passwordSalt:
          passwordData.salt,

        createdAt:
          new Date().toISOString()

      };


      usersStore.set(
        email,
        user
      );


      const session =
        createSession(user.id);


      return sendSuccess(
        res,
        {
          token: session.token,

          sessionId:
            session.sessionId,

          expiresAt:
            session.expiresAt,

          user:
            createSafeUser(user)
        },
        201
      );

    } catch (error) {

      console.error(
        "[E.G.] Register error:",
        error
      );


      return sendError(
        res,
        500,
        "REGISTER_ERROR",
        "Unable to create account."
      );

    }

  }
);


/* =========================================================
   Part 2/5 END
=========================================================== */
/* =========================================================
   27. LOGIN ENDPOINT
   ========================================================= */

app.post(
  "/auth/login",
  async (req, res) => {

    try {

      const email =
        normalizeEmail(
          req.body.email
        );

      const password =
        req.body.password;


      if (!isValidEmail(email)) {

        return sendError(
          res,
          400,
          "INVALID_EMAIL",
          "Please enter a valid email address."
        );

      }


      if (!isValidPassword(password)) {

        return sendError(
          res,
          400,
          "INVALID_PASSWORD",
          "Invalid password."
        );

      }


      const user =
        usersStore.get(email);


      /*
       Do not reveal whether the email
       exists or not.
      */

      if (!user) {

        return sendError(
          res,
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect."
        );

      }


      const passwordValid =
        await verifyPassword(
          password,
          user.passwordSalt,
          user.passwordHash
        );


      if (!passwordValid) {

        return sendError(
          res,
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect."
        );

      }


      const session =
        createSession(user.id);


      return sendSuccess(
        res,
        {

          token:
            session.token,

          sessionId:
            session.sessionId,

          expiresAt:
            session.expiresAt,

          user:
            createSafeUser(user)

        }
      );

    } catch (error) {

      console.error(
        "[E.G.] Login error:",
        error
      );


      return sendError(
        res,
        500,
        "LOGIN_ERROR",
        "Unable to login."
      );

    }

  }
);


/* =========================================================
   28. CURRENT USER ENDPOINT
   ========================================================= */

app.get(
  "/auth/me",
  requireAuthentication,
  (req, res) => {

    const user =
      [...usersStore.values()]
        .find(
          item =>
            item.id === req.auth.userId
        );


    if (!user) {

      return sendError(
        res,
        401,
        "USER_NOT_FOUND",
        "User account is no longer available."
      );

    }


    return sendSuccess(
      res,
      {
        user:
          createSafeUser(user)
      }
    );

  }
);


/* =========================================================
   29. LOGOUT ENDPOINT
   ========================================================= */

app.post(
  "/auth/logout",
  requireAuthentication,
  (req, res) => {

    sessionsStore.delete(
      req.auth.token
    );


    return sendSuccess(
      res,
      {
        message:
          "Logged out successfully."
      }
    );

  }
);


/* =========================================================
   30. LOGOUT ALL DEVICES
   ========================================================= */

app.post(
  "/auth/logout-all",
  requireAuthentication,
  (req, res) => {

    let removedCount = 0;


    for (
      const [
        token,
        session
      ]
      of sessionsStore.entries()
    ) {

      if (
        session.userId ===
        req.auth.userId
      ) {

        sessionsStore.delete(token);

        removedCount += 1;

      }

    }


    return sendSuccess(
      res,
      {
        message:
          "All sessions have been logged out.",

        removedSessions:
          removedCount
      }
    );

  }
);


/* =========================================================
   31. DELETE ACCOUNT
   ========================================================= */

app.delete(
  "/auth/delete-account",
  requireAuthentication,
  async (req, res) => {

    try {

      const user =
        [...usersStore.values()]
          .find(
            item =>
              item.id === req.auth.userId
          );


      if (!user) {

        return sendError(
          res,
          404,
          "USER_NOT_FOUND",
          "User account was not found."
        );

      }


      const email =
        user.email;


      /*
       Remove all sessions belonging
       to this user.
      */

      for (
        const [
          token,
          session
        ]
        of sessionsStore.entries()
      ) {

        if (
          session.userId ===
          req.auth.userId
        ) {

          sessionsStore.delete(token);

        }

      }


      usersStore.delete(
        email
      );


      return sendSuccess(
        res,
        {
          message:
            "Account deleted successfully."
        }
      );

    } catch (error) {

      console.error(
        "[E.G.] Account deletion error:",
        error
      );


      return sendError(
        res,
        500,
        "DELETE_ACCOUNT_ERROR",
        "Unable to delete account."
      );

    }

  }
);


/* =========================================================
   32. CHAT MEMORY STORE
   =========================================================

   Temporary development store.

   Database layer will replace this later.
   Every record is associated with userId.
   ========================================================= */

const memoryStore = new Map();


/* =========================================================
   33. CHAT HISTORY STORE
   ========================================================= */

const historyStore = new Map();


/* =========================================================
   34. NOTES STORE
   ========================================================= */

const notesStore = new Map();


/* =========================================================
   35. TODO STORE
   ========================================================= */

const todosStore = new Map();


/* =========================================================
   36. REMINDERS STORE
   ========================================================= */

const remindersStore = new Map();


/* =========================================================
   37. USER DATA KEY
   ========================================================= */

function userDataKey(userId) {

  return String(userId);

}


/* =========================================================
   38. SAFE TEXT NORMALIZATION
   ========================================================= */

function normalizeText(
  value,
  maxLength
) {

  if (
    typeof value !== "string"
  ) {

    return "";

  }


  return value
    .trim()
    .slice(0, maxLength);

}


/* =========================================================
   39. MEMORY ENDPOINT — GET
   ========================================================= */

app.get(
  "/memory",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const memory =
      memoryStore.get(key) || [];


    return sendSuccess(
      res,
      {
        memory
      }
    );

  }
);


/* =========================================================
   40. MEMORY ENDPOINT — POST
   ========================================================= */

app.post(
  "/memory",
  requireAuthentication,
  (req, res) => {

    const content =
      normalizeText(
        req.body.content,
        5000
      );


    if (!content) {

      return sendError(
        res,
        400,
        "INVALID_MEMORY",
        "Memory content is required."
      );

    }


    const key =
      userDataKey(
        req.auth.userId
      );


    const memory =
      memoryStore.get(key) || [];


    const item = {

      id:
        crypto.randomUUID(),

      content,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()

    };


    memory.push(item);


    memoryStore.set(
      key,
      memory
    );


    return sendSuccess(
      res,
      {
        memory: item
      },
      201
    );

  }
);


/* =========================================================
   41. MEMORY DELETE
   ========================================================= */

app.delete(
  "/memory/:id",
  requireAuthentication,
  (req, res) => {

    const memoryId =
      req.params.id;


    const key =
      userDataKey(
        req.auth.userId
      );


    const memory =
      memoryStore.get(key) || [];


    const updatedMemory =
      memory.filter(
        item =>
          item.id !== memoryId
      );


    if (
      updatedMemory.length ===
      memory.length
    ) {

      return sendError(
        res,
        404,
        "MEMORY_NOT_FOUND",
        "Memory item was not found."
      );

    }


    memoryStore.set(
      key,
      updatedMemory
    );


    return sendSuccess(
      res,
      {
        message:
          "Memory deleted."
      }
    );

  }
);


/* =========================================================
   Part 3/5 END
=========================================================== */
/* =========================================================
   42. CHAT HISTORY — GET
   ========================================================= */

app.get(
  "/history",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const history =
      historyStore.get(key) || [];


    return sendSuccess(
      res,
      {
        history
      }
    );

  }
);


/* =========================================================
   43. CHAT HISTORY — DELETE
   ========================================================= */

app.delete(
  "/history/:id",
  requireAuthentication,
  (req, res) => {

    const historyId =
      req.params.id;


    const key =
      userDataKey(
        req.auth.userId
      );


    const history =
      historyStore.get(key) || [];


    const updatedHistory =
      history.filter(
        item =>
          item.id !== historyId
      );


    if (
      updatedHistory.length ===
      history.length
    ) {

      return sendError(
        res,
        404,
        "HISTORY_NOT_FOUND",
        "History item was not found."
      );

    }


    historyStore.set(
      key,
      updatedHistory
    );


    return sendSuccess(
      res,
      {
        message:
          "History item deleted."
      }
    );

  }
);


/* =========================================================
   44. NOTES — GET
   ========================================================= */

app.get(
  "/notes",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const notes =
      notesStore.get(key) || [];


    return sendSuccess(
      res,
      {
        notes
      }
    );

  }
);


/* =========================================================
   45. NOTES — POST
   ========================================================= */

app.post(
  "/notes",
  requireAuthentication,
  (req, res) => {

    const content =
      normalizeText(
        req.body.content,
        5000
      );


    if (!content) {

      return sendError(
        res,
        400,
        "INVALID_NOTE",
        "Note content is required."
      );

    }


    const key =
      userDataKey(
        req.auth.userId
      );


    const notes =
      notesStore.get(key) || [];


    const note = {

      id:
        crypto.randomUUID(),

      content,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()

    };


    notes.push(note);


    notesStore.set(
      key,
      notes
    );


    return sendSuccess(
      res,
      {
        note
      },
      201
    );

  }
);


/* =========================================================
   46. NOTES — DELETE
   ========================================================= */

app.delete(
  "/notes/:id",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const notes =
      notesStore.get(key) || [];


    const updatedNotes =
      notes.filter(
        note =>
          note.id !== req.params.id
      );


    if (
      updatedNotes.length ===
      notes.length
    ) {

      return sendError(
        res,
        404,
        "NOTE_NOT_FOUND",
        "Note was not found."
      );

    }


    notesStore.set(
      key,
      updatedNotes
    );


    return sendSuccess(
      res,
      {
        message:
          "Note deleted."
      }
    );

  }
);


/* =========================================================
   47. TODO — GET
   ========================================================= */

app.get(
  "/todos",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const todos =
      todosStore.get(key) || [];


    return sendSuccess(
      res,
      {
        todos
      }
    );

  }
);


/* =========================================================
   48. TODO — POST
   ========================================================= */

app.post(
  "/todos",
  requireAuthentication,
  (req, res) => {

    const content =
      normalizeText(
        req.body.content,
        5000
      );


    if (!content) {

      return sendError(
        res,
        400,
        "INVALID_TODO",
        "Todo content is required."
      );

    }


    const key =
      userDataKey(
        req.auth.userId
      );


    const todos =
      todosStore.get(key) || [];


    const todo = {

      id:
        crypto.randomUUID(),

      content,

      completed: false,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()

    };


    todos.push(todo);


    todosStore.set(
      key,
      todos
    );


    return sendSuccess(
      res,
      {
        todo
      },
      201
    );

  }
);


/* =========================================================
   49. TODO — UPDATE
   ========================================================= */

app.patch(
  "/todos/:id",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const todos =
      todosStore.get(key) || [];


    const todo =
      todos.find(
        item =>
          item.id === req.params.id
      );


    if (!todo) {

      return sendError(
        res,
        404,
        "TODO_NOT_FOUND",
        "Todo was not found."
      );

    }


    if (
      typeof req.body.completed ===
      "boolean"
    ) {

      todo.completed =
        req.body.completed;

    }


    if (
      typeof req.body.content ===
      "string"
    ) {

      const content =
        normalizeText(
          req.body.content,
          5000
        );


      if (content) {
        todo.content = content;
      }

    }


    todo.updatedAt =
      new Date().toISOString();


    todosStore.set(
      key,
      todos
    );


    return sendSuccess(
      res,
      {
        todo
      }
    );

  }
);


/* =========================================================
   50. TODO — DELETE
   ========================================================= */

app.delete(
  "/todos/:id",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const todos =
      todosStore.get(key) || [];


    const updatedTodos =
      todos.filter(
        todo =>
          todo.id !== req.params.id
      );


    if (
      updatedTodos.length ===
      todos.length
    ) {

      return sendError(
        res,
        404,
        "TODO_NOT_FOUND",
        "Todo was not found."
      );

    }


    todosStore.set(
      key,
      updatedTodos
    );


    return sendSuccess(
      res,
      {
        message:
          "Todo deleted."
      }
    );

  }
);


/* =========================================================
   51. REMINDERS — GET
   ========================================================= */

app.get(
  "/reminders",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const reminders =
      remindersStore.get(key) || [];


    return sendSuccess(
      res,
      {
        reminders
      }
    );

  }
);


/* =========================================================
   52. REMINDERS — POST
   ========================================================= */

app.post(
  "/reminders",
  requireAuthentication,
  (req, res) => {

    const text =
      normalizeText(
        req.body.text,
        5000
      );


    const remindAt =
      typeof req.body.remindAt ===
      "string"
        ? req.body.remindAt.trim()
        : "";


    if (!text) {

      return sendError(
        res,
        400,
        "INVALID_REMINDER",
        "Reminder text is required."
      );

    }


    if (!remindAt) {

      return sendError(
        res,
        400,
        "INVALID_REMINDER_TIME",
        "Reminder date and time are required."
      );

    }


    const reminderTime =
      Date.parse(remindAt);


    if (
      Number.isNaN(reminderTime)
    ) {

      return sendError(
        res,
        400,
        "INVALID_REMINDER_TIME",
        "Invalid reminder date and time."
      );

    }


    const key =
      userDataKey(
        req.auth.userId
      );


    const reminders =
      remindersStore.get(key) || [];


    const reminder = {

      id:
        crypto.randomUUID(),

      text,

      remindAt:
        new Date(
          reminderTime
        ).toISOString(),

      completed: false,

      createdAt:
        new Date().toISOString()

    };


    reminders.push(reminder);


    remindersStore.set(
      key,
      reminders
    );


    return sendSuccess(
      res,
      {
        reminder
      },
      201
    );

  }
);


/* =========================================================
   53. REMINDERS — DELETE
   ========================================================= */

app.delete(
  "/reminders/:id",
  requireAuthentication,
  (req, res) => {

    const key =
      userDataKey(
        req.auth.userId
      );


    const reminders =
      remindersStore.get(key) || [];


    const updatedReminders =
      reminders.filter(
        reminder =>
          reminder.id !==
          req.params.id
      );


    if (
      updatedReminders.length ===
      reminders.length
    ) {

      return sendError(
        res,
        404,
        "REMINDER_NOT_FOUND",
        "Reminder was not found."
      );

    }


    remindersStore.set(
      key,
      updatedReminders
    );


    return sendSuccess(
      res,
      {
        message:
          "Reminder deleted."
      }
    );

  }
);


/* =========================================================
   54. CHAT ENDPOINT
   ========================================================= */

app.post(
  "/chat",
  requireAuthentication,
  (req, res) => {

    const message =
      normalizeText(
        req.body.message,
        10000
      );


    if (!message) {

      return sendError(
        res,
        400,
        "INVALID_MESSAGE",
        "Message is required."
      );

    }


    /*
     Temporary development response.

     The real AI/tool layer will be connected
     after the secure backend foundation is complete.
    */

    const reply =
      `E.G. backend received your message: ${message}`;


    const key =
      userDataKey(
        req.auth.userId
      );


    const history =
      historyStore.get(key) || [];


    const historyItem = {

      id:
        crypto.randomUUID(),

      message,

      reply,

      createdAt:
        new Date().toISOString()

    };


    history.push(
      historyItem
    );


    /*
     Keep development memory bounded.
    */

    if (
      history.length > 100
    ) {

      history.splice(
        0,
        history.length - 100
      );

    }


    historyStore.set(
      key,
      history
    );


    return sendSuccess(
      res,
      {
        reply,

        messageId:
          historyItem.id
      }
    );

  }
);


/* =========================================================
   Part 4/5 END
=========================================================== */
/* =========================================================
   55. 404 HANDLER
   ========================================================= */

app.use((req, res) => {

  return sendError(
    res,
    404,
    "NOT_FOUND",
    "The requested endpoint was not found."
  );

});


/* =========================================================
   56. GLOBAL ERROR HANDLER
   ========================================================= */

app.use((error, req, res, next) => {

  console.error(
    "[E.G.] Global error:",
    error
  );


  /*
   If headers have already been sent,
   let Express handle the error.
  */

  if (res.headersSent) {
    return next(error);
  }


  /*
   CORS errors
  */

  if (
    error &&
    error.message ===
    "CORS origin not allowed"
  ) {

    return sendError(
      res,
      403,
      "CORS_DENIED",
      "Request origin is not allowed."
    );

  }


  /*
   Invalid JSON
  */

  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {

    return sendError(
      res,
      400,
      "INVALID_JSON",
      "Invalid JSON request."
    );

  }


  /*
   Body too large
  */

  if (
    error &&
    (
      error.type ===
      "entity.too.large" ||
      error.status === 413
    )
  ) {

    return sendError(
      res,
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body is too large."
    );

  }


  return sendError(
    res,
    500,
    "INTERNAL_ERROR",
    "Internal server error."
  );

});


/* =========================================================
   57. PROCESS ERROR HANDLING
   ========================================================= */

process.on(
  "unhandledRejection",
  (reason) => {

    console.error(
      "[E.G.] Unhandled promise rejection:",
      reason
    );

  }
);


process.on(
  "uncaughtException",
  (error) => {

    console.error(
      "[E.G.] Uncaught exception:",
      error
    );

  }
);


/* =========================================================
   58. GRACEFUL SHUTDOWN
   ========================================================= */

let server = null;


function shutdownServer(signal) {

  console.log(
    `[E.G.] ${signal} received. Shutting down...`
  );


  if (!server) {

    process.exit(0);

  }


  server.close(() => {

    console.log(
      "[E.G.] Server closed."
    );

    process.exit(0);

  });


  /*
   Force shutdown after 10 seconds.
  */

  setTimeout(() => {

    console.error(
      "[E.G.] Forced shutdown after timeout."
    );

    process.exit(1);

  }, 10000);

}


process.on(
  "SIGTERM",
  () => shutdownServer("SIGTERM")
);


process.on(
  "SIGINT",
  () => shutdownServer("SIGINT")
);


/* =========================================================
   59. START SERVER
   ========================================================= */

server =
  app.listen(
    PORT,
    () => {

      console.log(
        "=================================================="
      );

      console.log(
        " E.G. AI ASSISTANT BACKEND"
      );

      console.log(
        "=================================================="
      );

      console.log(
        `[E.G.] App: ${APP_NAME}`
      );

      console.log(
        `[E.G.] Environment: ${NODE_ENV}`
      );

      console.log(
        `[E.G.] Port: ${PORT}`
      );

      console.log(
        "[E.G.] Server is running."
      );

      console.log(
        "=================================================="
      );

    }
  );


/* =========================================================
   60. EXPORT APP
   ========================================================= */

module.exports = app;


/* =========================================================
   INDEX.JS COMPLETE — PART 5/5
=========================================================== */
