const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// --- Cabeceras de seguridad ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'"
  );
  next();
});

// --- CORS ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// --- Rate limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
});

app.use('/api/', apiLimiter);

// --- Logging de requests ---
app.use('/api/', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// --- Archivos estáticos con cache ---
app.use(express.static('public', {
  maxAge: '1h',
  etag: true,
}));

// --- Conjuntos de caracteres ---
const CHARSETS = {
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  full: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// --- Constantes de validación ---
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const PASSWORD_DEFAULT = 20;
const USERNAME_MIN = 4;
const USERNAME_MAX = 64;
const USERNAME_DEFAULT = 10;

// --- Función unificada de generación ---
function generateRandom(length, charset) {
  const chars = CHARSETS[charset];
  return Array.from({ length }, () =>
    chars.charAt(crypto.randomInt(chars.length))
  ).join('');
}

// --- Validación de longitud ---
function parseLength(value, min, max, defaultVal) {
  if (value === undefined || value === null || value === '') return defaultVal;
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) return null;
  return num;
}

// --- Endpoint unificado ---
app.post('/api/generate-credentials', (req, res) => {
  try {
    const passLength = parseLength(req.query.passwordLength, PASSWORD_MIN, PASSWORD_MAX, PASSWORD_DEFAULT);
    const userLength = parseLength(req.query.usernameLength, USERNAME_MIN, USERNAME_MAX, USERNAME_DEFAULT);

    if (passLength === null) {
      return res.status(400).json({ error: `passwordLength debe ser un entero entre ${PASSWORD_MIN} y ${PASSWORD_MAX}` });
    }
    if (userLength === null) {
      return res.status(400).json({ error: `usernameLength debe ser un entero entre ${USERNAME_MIN} y ${USERNAME_MAX}` });
    }

    const username = generateRandom(userLength, 'alphanumeric');
    const password = generateRandom(passLength, 'full');
    res.json({ username, password, meta: { usernameLength: userLength, passwordLength: passLength } });
  } catch (err) {
    console.error('Error al generar credenciales:', err);
    res.status(500).json({ error: 'Error al generar credenciales' });
  }
});

// --- Endpoints individuales ---
app.post('/api/generate-password', (req, res) => {
  try {
    const length = parseLength(req.query.length, PASSWORD_MIN, PASSWORD_MAX, PASSWORD_DEFAULT);
    if (length === null) {
      return res.status(400).json({ error: `length debe ser un entero entre ${PASSWORD_MIN} y ${PASSWORD_MAX}` });
    }
    const password = generateRandom(length, 'full');
    res.json({ password, meta: { length } });
  } catch (err) {
    console.error('Error al generar contraseña:', err);
    res.status(500).json({ error: 'Error al generar contraseña' });
  }
});

app.post('/api/generate-username', (req, res) => {
  try {
    const length = parseLength(req.query.length, USERNAME_MIN, USERNAME_MAX, USERNAME_DEFAULT);
    if (length === null) {
      return res.status(400).json({ error: `length debe ser un entero entre ${USERNAME_MIN} y ${USERNAME_MAX}` });
    }
    const username = generateRandom(length, 'alphanumeric');
    res.json({ username, meta: { length } });
  } catch (err) {
    console.error('Error al generar usuario:', err);
    res.status(500).json({ error: 'Error al generar usuario' });
  }
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// --- Manejador global de errores ---
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// --- Arranque con graceful shutdown ---
let server;

if (require.main === module) {
  const url = `http://${HOST}:${PORT}`;
  server = app.listen(PORT, HOST, () => {
    console.log(`API corriendo en ${url}`);

    // Abrir navegador automaticamente
    const cmd = process.platform === 'win32' ? `start ${url}`
      : process.platform === 'darwin' ? `open ${url}`
      : `xdg-open ${url}`;
    exec(cmd, (err) => {
      if (err) console.error('No se pudo abrir el navegador:', err.message);
    });
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    server.close(() => {
      console.log('Servidor cerrado correctamente.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Cierre forzado por timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
  });
}

module.exports = { app, generateRandom, parseLength };
