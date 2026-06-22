# AutoMax — Portal Web con Autenticación de Usuarios

Sistema de gestión de inventario de vehículos para una agencia/dealer, con
módulo de autenticación de usuarios (registro, login y acceso como invitado)
integrado con **Node.js + Express + PostgreSQL**.

## Estructura del proyecto

```
AgenciaVehiculos/
├── Backend/
│   ├── auth.js          -> Rutas de autenticación (registro, login) + middleware JWT
│   ├── config.js        -> Configuración (clave secreta JWT)
│   ├── db.js             -> Conexión a PostgreSQL (pg.Pool)
│   ├── server.js         -> Servidor Express principal (vehículos + auth)
│   └── package.json
├── Frontend/
│   ├── login.html        -> Pantalla de acceso (login / registro / invitado)
│   ├── index.html        -> Sistema de gestión de vehículos (protegido)
│   ├── css/
│   │   ├── style.css      -> Estilos del dashboard de vehículos
│   │   └── login.css      -> Estilos de la pantalla de acceso
│   └── js/
│       ├── app.js          -> Lógica del dashboard + guard de sesión + logout
│       └── login.js        -> Lógica de login, registro e invitado
└── database.sql          -> Script de creación de la base de datos y tablas
```

## 1. Requisitos previos

- Node.js (v18 o superior recomendado)
- PostgreSQL instalado y corriendo en `localhost:5432`

## 2. Crear la base de datos

Ejecuta el script SQL incluido. Este script crea la base de datos
`vehiculosdb`, **se conecta a ella** y luego crea las tablas `vehiculos` y
`usuarios`:

```bash
psql -U postgres -f database.sql
```

> Si tu usuario/contraseña de PostgreSQL son distintos a `postgres` / `2327`,
> ajusta las credenciales en `Backend/db.js`.

## 3. Instalar dependencias del backend

```bash
cd Backend
npm install
```

Esto instalará: `express`, `cors`, `pg`, `nodemon`, `bcryptjs` y `jsonwebtoken`.

## 4. Levantar el servidor

```bash
npm start
```

Deberías ver en consola: `Servidor iniciado en puerto 3000`.

## 5. Abrir el Frontend

Abre `Frontend/login.html` directamente en tu navegador (doble clic), o sírvelo
con un servidor estático, por ejemplo:

```bash
cd Frontend
npx serve .
```

## Flujo de uso

1. **Registro**: en `login.html`, pestaña "Crear cuenta". Valida correo
   duplicado y contraseña mínima de 6 caracteres. La contraseña se guarda
   cifrada con `bcrypt` (nunca en texto plano).
2. **Inicio de sesión**: pestaña "Iniciar sesión". Verifica las credenciales
   contra PostgreSQL y, si son correctas, genera un token JWT y redirige al
   sistema de vehículos (`index.html`).
3. **Acceso como invitado**: botón "Continuar como invitado". Entra
   directamente al sistema sin crear cuenta, identificado como "Invitado".
   **El modo invitado es de solo lectura**: puede ver el inventario completo,
   pero no puede registrar, editar ni eliminar vehículos (los controles
   correspondientes aparecen deshabilitados u ocultos, y el backend rechaza
   esas peticiones aunque se intenten manualmente).
4. **Sistema de vehículos**: `index.html` está protegido — si no hay sesión
   (token o modo invitado) activa, redirige automáticamente a `login.html`.
   El nombre del usuario (o "Invitado") se muestra en la barra lateral, con
   un botón para **cerrar sesión**.

## Endpoints de autenticación

| Método | Ruta                 | Descripción                                   |
|--------|----------------------|------------------------------------------------|
| POST   | `/api/auth/registro` | Registra un usuario nuevo (nombre, correo, password) |
| POST   | `/api/auth/login`    | Verifica credenciales y devuelve un token JWT |

Los endpoints de vehículos (`/vehiculos`) se mantienen exactamente igual que
en la versión anterior del proyecto, con una excepción: **`POST`, `PUT` y
`DELETE` ahora requieren un token JWT válido** (header
`Authorization: Bearer <token>`). El método `GET` permanece público, para que
tanto usuarios registrados como invitados puedan consultar el inventario.

## Buenas prácticas implementadas

- Consultas parametrizadas (`$1, $2...`) en todas las queries SQL, evitando
  inyección SQL.
- Contraseñas cifradas con `bcryptjs` (hash + salt), nunca almacenadas en
  texto plano.
- Sesión basada en **JWT** con expiración (2 horas).
- Validación de correo duplicado antes de registrar.
- Validaciones de formulario en el frontend (correo válido, longitud de
  contraseña, confirmación de contraseña).
- **Control de permisos por rol de sesión**: el modo invitado solo puede
  leer el inventario (`GET /vehiculos`); crear, editar y eliminar
  (`POST` / `PUT` / `DELETE`) exigen el middleware `verificarToken` en el
  backend, además de estar ocultos/deshabilitados en la interfaz.
