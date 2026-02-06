# API de Contraseñas Seguras

Esta API genera credenciales seguras: contraseñas de 20 caracteres y usuarios de 10 caracteres.

## Instalación

1. Asegúrate de tener Node.js instalado.
2. Ejecuta `npm install` para instalar las dependencias.

## Uso

Ejecuta `npm start` para iniciar el servidor en el puerto 3000.

### Endpoint unificado

Haz una petición POST a `http://localhost:3000/api/generate-credentials` para obtener usuario y contraseña.

Respuesta JSON: `{"username": "aB3Cde9fGh", "password": "xY9!pQz@2kL$nJh4mR5w"}`

### Endpoints individuales

- POST `http://localhost:3000/api/generate-password` — `{"password": "..."}`
- POST `http://localhost:3000/api/generate-username` — `{"username": "..."}`

## Características

- Contraseñas de 20 caracteres con letras, números y símbolos.
- Usuarios de 10 caracteres alfanuméricos.
- Generadas de forma segura usando crypto.randomInt.
- Cabeceras de seguridad (X-Content-Type-Options, X-Frame-Options).
- Rate limiting: 100 peticiones cada 15 minutos por IP.

## Tests

Ejecuta `npm test` para correr la suite de tests.
# clave-segura
