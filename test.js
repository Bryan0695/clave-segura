const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { app, generateRandom, parseLength } = require('./server');

let server;

before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
});

after(() => {
  return new Promise((resolve) => server.close(resolve));
});

function getBaseUrl() {
  const addr = server.address();
  return `http://127.0.0.1:${addr.port}`;
}

// =============================================
// TESTS UNITARIOS
// =============================================

describe('generateRandom', () => {
  it('genera la longitud correcta', () => {
    assert.strictEqual(generateRandom(1, 'alphanumeric').length, 1);
    assert.strictEqual(generateRandom(10, 'alphanumeric').length, 10);
    assert.strictEqual(generateRandom(16, 'alphanumeric').length, 16);
    assert.strictEqual(generateRandom(20, 'full').length, 20);
    assert.strictEqual(generateRandom(128, 'full').length, 128);
  });

  it('alphanumeric solo contiene caracteres validos', () => {
    const result = generateRandom(200, 'alphanumeric');
    assert.match(result, /^[A-Za-z0-9]+$/);
  });

  it('full charset incluye simbolos', () => {
    const result = generateRandom(500, 'full');
    assert.match(result, /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
  });

  it('genera valores diferentes en cada llamada', () => {
    const a = generateRandom(20, 'full');
    const b = generateRandom(20, 'full');
    assert.notStrictEqual(a, b);
  });
});

describe('parseLength', () => {
  it('retorna el valor por defecto si no se pasa nada', () => {
    assert.strictEqual(parseLength(undefined, 8, 128, 20), 20);
    assert.strictEqual(parseLength(null, 8, 128, 20), 20);
    assert.strictEqual(parseLength('', 8, 128, 20), 20);
  });

  it('parsea valores validos correctamente', () => {
    assert.strictEqual(parseLength('12', 8, 128, 20), 12);
    assert.strictEqual(parseLength('8', 8, 128, 20), 8);
    assert.strictEqual(parseLength('128', 8, 128, 20), 128);
  });

  it('retorna null para valores fuera de rango', () => {
    assert.strictEqual(parseLength('7', 8, 128, 20), null);
    assert.strictEqual(parseLength('129', 8, 128, 20), null);
    assert.strictEqual(parseLength('-1', 8, 128, 20), null);
  });

  it('retorna null para valores no numericos', () => {
    assert.strictEqual(parseLength('abc', 8, 128, 20), null);
    assert.strictEqual(parseLength('12.5', 8, 128, 20), null);
  });
});

// =============================================
// TESTS DE INTEGRACION - ENDPOINT UNIFICADO
// =============================================

describe('POST /api/generate-credentials', () => {
  it('responde 200 con usuario y contraseña por defecto', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, {
      method: 'POST',
    });
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json/);

    const body = await res.json();
    assert.strictEqual(typeof body.username, 'string');
    assert.strictEqual(body.username.length, 10);
    assert.strictEqual(typeof body.password, 'string');
    assert.strictEqual(body.password.length, 20);
    assert.strictEqual(body.meta.usernameLength, 10);
    assert.strictEqual(body.meta.passwordLength, 20);
  });

  it('acepta longitudes personalizadas', async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/generate-credentials?passwordLength=30&usernameLength=15`,
      { method: 'POST' }
    );
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.password.length, 30);
    assert.strictEqual(body.username.length, 15);
    assert.strictEqual(body.meta.passwordLength, 30);
    assert.strictEqual(body.meta.usernameLength, 15);
  });

  it('rechaza passwordLength fuera de rango', async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/generate-credentials?passwordLength=3`,
      { method: 'POST' }
    );
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('passwordLength'));
  });

  it('rechaza usernameLength fuera de rango', async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/generate-credentials?usernameLength=2`,
      { method: 'POST' }
    );
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('usernameLength'));
  });

  it('rechaza valores no numericos', async () => {
    const res = await fetch(
      `${getBaseUrl()}/api/generate-credentials?passwordLength=abc`,
      { method: 'POST' }
    );
    assert.strictEqual(res.status, 400);
  });

  it('genera valores diferentes en cada peticion', async () => {
    const res1 = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    const res2 = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    const data1 = await res1.json();
    const data2 = await res2.json();
    assert.notStrictEqual(data1.password, data2.password);
  });
});

// =============================================
// TESTS DE INTEGRACION - ENDPOINTS INDIVIDUALES
// =============================================

describe('POST /api/generate-password', () => {
  it('responde 200 con contraseña de 20 caracteres por defecto', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-password`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.password.length, 20);
    assert.strictEqual(body.meta.length, 20);
  });

  it('acepta longitud personalizada', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-password?length=32`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.password.length, 32);
  });

  it('rechaza longitud invalida', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-password?length=5`, { method: 'POST' });
    assert.strictEqual(res.status, 400);
  });
});

describe('POST /api/generate-username', () => {
  it('responde 200 con usuario de 10 caracteres por defecto', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-username`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.username.length, 10);
    assert.match(body.username, /^[A-Za-z0-9]+$/);
  });

  it('acepta longitud personalizada', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-username?length=25`, { method: 'POST' });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.username.length, 25);
  });

  it('rechaza longitud invalida', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-username?length=2`, { method: 'POST' });
    assert.strictEqual(res.status, 400);
  });
});

// =============================================
// TESTS DE ARCHIVOS ESTATICOS SEPARADOS
// =============================================

describe('Archivos estaticos', () => {
  it('sirve index.html con referencia a CSS y JS externos', async () => {
    const res = await fetch(`${getBaseUrl()}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('href="/css/styles.css"'));
    assert.ok(html.includes('src="/js/app.js"'));
    assert.ok(!html.includes('<style>'));
    assert.ok(!html.includes('function updateStrength'));
  });

  it('sirve /css/styles.css con content-type correcto', async () => {
    const res = await fetch(`${getBaseUrl()}/css/styles.css`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/css/);
    const css = await res.text();
    assert.ok(css.includes('.container'));
    assert.ok(css.includes('.btn-primary'));
    assert.ok(css.includes('.strength-fill'));
  });

  it('sirve /js/app.js con content-type correcto', async () => {
    const res = await fetch(`${getBaseUrl()}/js/app.js`);
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /javascript/);
    const js = await res.text();
    assert.ok(js.includes('generateBtn'));
    assert.ok(js.includes('updateStrength'));
    assert.ok(js.includes('DOMContentLoaded'));
  });
});

// =============================================
// TESTS DE SEGURIDAD
// =============================================

describe('Cabeceras de seguridad', () => {
  it('incluye X-Content-Type-Options', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  });

  it('incluye X-Frame-Options', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
  });

  it('incluye Content-Security-Policy sin unsafe-inline', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    const csp = res.headers.get('content-security-policy');
    assert.ok(csp);
    assert.ok(csp.includes("default-src 'self'"));
    assert.ok(csp.includes("style-src 'self'"));
    assert.ok(!csp.includes('unsafe-inline'));
  });

  it('incluye Referrer-Policy', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  });

  it('incluye Permissions-Policy', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    const pp = res.headers.get('permissions-policy');
    assert.ok(pp);
    assert.ok(pp.includes('camera=()'));
  });
});

// =============================================
// TESTS DE CORS
// =============================================

describe('CORS', () => {
  it('no incluye Access-Control headers sin origin', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, { method: 'POST' });
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
  });

  it('rechaza origins no permitidos', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, {
      method: 'POST',
      headers: { 'Origin': 'https://malicious-site.com' },
    });
    assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
  });

  it('responde 204 a preflight OPTIONS', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`, {
      method: 'OPTIONS',
    });
    assert.strictEqual(res.status, 204);
  });
});

// =============================================
// TESTS DE METODO HTTP
// =============================================

describe('Metodos HTTP', () => {
  it('GET a /api/generate-credentials retorna 404', async () => {
    const res = await fetch(`${getBaseUrl()}/api/generate-credentials`);
    assert.strictEqual(res.status, 404);
  });
});

// =============================================
// TESTS DE 404
// =============================================

describe('Manejo de 404', () => {
  it('retorna JSON 404 para rutas desconocidas', async () => {
    const res = await fetch(`${getBaseUrl()}/ruta-inexistente`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.error, 'Ruta no encontrada');
  });

  it('no revela informacion del framework en 404', async () => {
    const res = await fetch(`${getBaseUrl()}/ruta-inexistente`);
    const body = await res.text();
    assert.ok(!body.includes('Cannot GET'));
    assert.ok(!body.includes('Express'));
  });
});
