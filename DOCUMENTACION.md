# Documentación Técnica y Funcional - Seguimiento de Proyectos

## Descripción General

Sistema de seguimiento para mantenimiento y proyectos de la empresa, integrado con Redmine. Permite gestionar y dar seguimiento a:
- **Mantenimiento**: Seguimiento de servicios de mantenimiento por producto
- **Proyectos Externos**: Proyectos con clientes externos
- **Proyectos Internos**: Proyectos internos de la empresa
- **Sync**: Gestión de pedidos entre equipos

## Arquitectura

### Stack Tecnológico
- **Backend**: Node.js + Express.js
- **Base de Datos**: PostgreSQL (Neon)
- **Templates**: EJS
- **Autenticación**: JWT (JSON Web Tokens)
- **Sesiones**: connect-pg-simple (almacenadas en PostgreSQL)
- **API Externa**: Redmine API (REST)
- **Hosting**: Vercel (Serverless)

### Estructura del Proyecto

```
seguimiento/
├── src/
│   ├── app.js                    # Entrada principal de la aplicación
│   ├── config/
│   │   └── database.js          # Configuración del pool de PostgreSQL
│   ├── controllers/
│   │   ├── seguimientoController.js  # Lógica de negocio principal
│   │   ├── syncController.js         # Controlador para Sync
│   │   └── adminController.js         # Controlador de administración
│   ├── models/
│   │   ├── MantenimientoModel.js
│   │   ├── ProyectosExternosModel.js
│   │   ├── ProyectosInternosModel.js
│   │   ├── AccionablesProyectoModel.js
│   │   ├── EpicsProyectoModel.js
│   │   ├── SubproyectosModel.js
│   │   ├── ProductosEquiposModel.js
│   │   └── PedidosEquiposModel.js
│   ├── routes/
│   │   ├── indexRoutes.js        # Rutas de páginas
│   │   ├── apiRoutes.js          # Rutas API principales
│   │   ├── syncRoutes.js         # Rutas API de Sync
│   │   ├── authRoutes.js         # Rutas de autenticación
│   │   └── adminRoutes.js        # Rutas de administración
│   ├── services/
│   │   ├── redmineService.js     # Servicio para consumir API de Redmine
│   │   └── sincronizacionService.js  # Servicio de sincronización
│   ├── middleware/
│   │   └── authJWT.js            # Middleware de autenticación JWT
│   ├── views/
│   │   ├── layouts/
│   │   │   └── main.ejs
│   │   ├── pages/
│   │   │   ├── index.ejs
│   │   │   ├── proyectos-internos.ejs
│   │   │   ├── sync.ejs
│   │   │   ├── admin.ejs
│   │   │   └── login.ejs
│   │   └── partials/
│   └── public/
│       ├── css/
│       ├── js/
│       └── images/
└── Database/
    └── 01_create_table_pedidos_equipos.sql
```

---

## Base de Datos

### Estructura de Tablas

El sistema utiliza un patrón de **separación de datos de Redmine y datos editables**:

#### Tablas de Redmine (Solo Lectura - Sincronizadas)
- `redmine_mantenimiento`: Datos sincronizados de Redmine para mantenimiento
- `redmine_proyectos_externos`: Datos sincronizados de Redmine para proyectos externos e internos

#### Tablas Editables (Datos Locales)
- `mantenimiento`: Datos editables de mantenimiento
- `proyectos_externos`: Datos editables de proyectos (externos e internos)
- `accionables_proyecto`: Accionables múltiples por proyecto
- `epics_proyecto`: Epics sincronizados de Redmine
- `subproyectos`: Subproyectos (proyectos con `linea_servicio = 'Hereda'`)
- `productos_equipos`: Configuración de productos y equipos
- `pedidos_equipos`: Pedidos entre equipos (módulo Sync)

#### Vistas (Unión de Tablas)
- `v_mantenimiento_completo`: Unión de `redmine_mantenimiento` + `mantenimiento`
- `v_proyectos_externos_completo`: Unión de `redmine_proyectos_externos` + `proyectos_externos`

### Campos Clave

**Campos de Redmine (Solo Lectura)**:
- `id_proyecto`: ID del proyecto en Redmine (clave primaria)
- `nombre_proyecto`: Nombre del proyecto
- `codigo_proyecto`: Código/identifier del proyecto
- `proyecto_padre`: ID del proyecto padre
- `estado_redmine`: Estado del proyecto en Redmine
- `producto`: Producto (cf_19)
- `cliente`: Cliente (cf_20)
- `linea_servicio`: Línea de servicio (cf_28)
- `categoria`: Categoría (cf_29)
- `limite_horas`: Límite de horas (cf_30)
- `equipo`: Equipo (cf_75)
- `reventa`: Es Reventa (cf_93)
- `proyecto_sponsor`: Proyecto Sponsor (cf_94)
- `fecha_creacion`: Fecha de creación en Redmine
- `sincronizado_en`: Timestamp de última sincronización

**Campos Editables (Datos Locales)**:
- `estado`: Estado interno del proyecto (Sin comenzar, En curso, Testing, Entregado, Rework, Cerrado)
- `fecha_inicio`: Fecha de inicio planificada
- `fecha_fin`: Fecha de fin planificada
- `observaciones`: Observaciones del proyecto
- `accionables`: Accionables del proyecto (legacy - ahora se usa tabla `accionables_proyecto`)
- `fecha_accionable`: Fecha del accionable (legacy)
- `asignado_accionable`: Asignado del accionable (legacy)
- `updated_at`: Timestamp de última actualización

---

## Integración con Redmine API

### Configuración

**Variables de Entorno Requeridas**:
- `REDMINE_URL`: URL base de la API de Redmine (ej: `https://redmine.example.com`)
- `REDMINE_TOKEN`: Token de autenticación de Redmine (API Key)

### Servicio: `redmineService.js`

#### Funciones Principales

**1. `obtenerProyectos(options)`**
- **Endpoint**: `GET /projects.json`
- **Autenticación**: Token en query parameter `key` o header `X-Redmine-API-Key`
- **Filtros Aplicados**:
  - `cf_19`: Producto (normalizado desde BD o mapeo por defecto)
  - `cf_75`: Equipo (ID del equipo en Redmine)
  - `cf_28`: Línea de Servicio (por defecto "Si", también puede ser "Hereda")
  - `cf_29`: Categoría ("Mantenimiento", "On-Site", "Proyectos Internos", etc.)
  - `codigo_proyecto_padre`: Filtro por proyecto padre (identifier)
- **Paginación**: `limit` (máx 100) y `offset`
- **Retorna**: Array de proyectos con paginación

**2. `obtenerProyectosMapeados(options)`**
- Obtiene todos los proyectos con paginación automática
- Aplica mapeo de proyectos usando `mapearProyecto()`
- **Parámetros**:
  - `producto`: Filtrar por producto
  - `equipo`: Filtrar por equipo (ID)
  - `categoria`: Filtrar por categoría
  - `codigo_proyecto_padre`: Filtrar por proyecto padre
  - `linea_servicio`: Filtrar por línea de servicio
  - `maxTotal`: Límite máximo de proyectos (para pruebas)

**3. `mapearProyecto(proyecto)`**
- Mapea un proyecto de Redmine al formato de la BD
- Extrae custom fields:
  - `cf_19` → `producto`
  - `cf_20` → `cliente`
  - `cf_28` → `linea_servicio`
  - `cf_29` → `categoria`
  - `cf_30` → `limite_horas`
  - `cf_75` → `equipo`
  - `cf_93` → `reventa` (normalizado: "Si"/"No")
  - `cf_94` → `proyecto_sponsor`

**4. `obtenerEpics(projectId)`**
- **Endpoint**: `GET /issues.json`
- **Filtros**:
  - `project_id`: ID o identifier del proyecto
  - `tracker_id`: 19 (Epics)
  - `status_id`: '*' (todos los estados)
- **Paginación**: Automática (100 por página)
- **Retorna**: Array de epics

**5. `mapearEpic(epic)`**
- Mapea un epic de Redmine al formato de la BD
- Extrae custom fields:
  - `cf_23` → `cf_23` (id_services)
  - `cf_21` → `cf_21` (fecha planificada inicio)
  - `cf_22` → `cf_22` (fecha planificada fin)
  - `cf_15` → `cf_15` (fecha real finalización)

**6. `normalizarProductoParaRedmine(producto)`**
- Normaliza el nombre del producto para Redmine
- Primero intenta obtener desde BD (`productos_equipos.producto_redmine`)
- Si no existe, usa mapeo por defecto:
  - `'Order Management'` → `'Order Management'`
  - `'Portfolio'` → `'mp'`
  - `'Portfolio Cloud'` → `'portfolio cloud'`
  - `'Trading Room'` → `'Trading Room'`
  - `'Abbaco'` → `'Abbaco'`
  - `'Unitrade'` → `'Unitrade'`
  - `'Pepper'` → `'Pepper'`

**7. `obtenerProyectoPorCodigo(codigoProyecto)`**
- **Endpoint**: `GET /projects/{codigo}.json?include=parent`
- Obtiene un proyecto completo por su código (identifier)

**8. `obtenerIdProyectoPorCodigo(codigoProyecto)`**
- Obtiene solo el ID del proyecto por su código

### Servicio: `sincronizacionService.js`

#### Funciones de Sincronización

**1. `sincronizarMantenimiento(producto, equipo, maxTotal)`**
- **Criterios de Filtrado**:
  - Categoría: "Mantenimiento" **O** "On-Site"
  - Línea de Servicio: "Si"
  - Producto: Según parámetro
  - Equipo: Según parámetro (ID de Redmine)
  - Proyecto Padre: Si existe en `productos_equipos.codigo_proyecto_padre`
- **Exclusiones**:
  - Proyectos con categoría "Licencias"
- **Proceso**:
  1. Obtiene proyectos de Redmine (dos llamados: uno para "Mantenimiento", otro para "On-Site")
  2. Combina resultados y elimina duplicados
  3. Filtra proyectos excluidos
  4. Inserta/actualiza en `redmine_mantenimiento` (ON CONFLICT)
  5. Crea registros vacíos en `mantenimiento` para proyectos nuevos
- **Retorna**: Estadísticas de sincronización

**2. `sincronizarProyectos(producto, equipo, maxTotal)`**
- **Criterios de Filtrado**:
  - Línea de Servicio: "Si" **O** "Hereda"
  - Categoría: **NO** "Mantenimiento", **NO** "Licencias", **NO** null/vacío
  - Producto: Según parámetro
  - Equipo: Según parámetro
  - Proyecto Padre: Si existe en `productos_equipos.codigo_proyecto_padre`
- **Exclusiones**:
  - Proyectos con estado interno "Cerrado" (no se actualizan desde Redmine)
  - Proyectos que no están en la vista (según filtros aplicados)
- **Proceso**:
  1. Obtiene proyectos principales (línea_servicio = "Si")
  2. Obtiene proyectos heredados (línea_servicio = "Hereda")
  3. Combina y filtra por categoría
  4. Consulta BD para obtener proyectos existentes y sus estados
  5. Separa en: nuevos (no existen) y existentes no cerrados
  6. Filtra según vista (solo los que se muestran en la UI)
  7. Inserta/actualiza en `redmine_proyectos_externos` (ON CONFLICT)
  8. Crea registros vacíos en `proyectos_externos` para proyectos nuevos
- **Retorna**: Estadísticas de sincronización

**3. `sincronizarProyectosInternos(producto, maxTotal)`**
- **Criterios de Filtrado**:
  - Categoría: "Proyectos Internos"
  - Producto: Requerido
  - Proyecto Padre: Si existe en `productos_equipos.codigo_proyecto_padre`
- **Proceso**:
  1. Obtiene proyectos de Redmine con categoría "Proyectos Internos"
  2. Inserta/actualiza en `redmine_proyectos_externos` (misma tabla que proyectos externos)
  3. Crea registros vacíos en `proyectos_externos` para proyectos nuevos
- **Retorna**: Estadísticas de sincronización

### Endpoints de Sincronización

**POST `/api/sincronizar/mantenimiento`**
- Body: `{ producto?, equipo?, maxTotal? }`
- Requiere autenticación JWT
- Ejecuta `sincronizarMantenimiento()`

**POST `/api/sincronizar/proyectos`**
- Body: `{ producto?, equipo?, maxTotal? }`
- Requiere autenticación JWT
- Ejecuta `sincronizarProyectos()`

**POST `/api/sincronizar/proyectos-internos`**
- Body: `{ producto, maxTotal? }`
- Requiere autenticación JWT
- Ejecuta `sincronizarProyectosInternos()`

**POST `/api/sincronizar/epics`**
- Body: `{ id_proyecto, codigo_proyecto }`
- Requiere autenticación JWT
- Sincroniza epics de un proyecto específico

**POST `/api/sincronizar/epics-masivo`**
- Body: `{ producto, equipo?, categoria?, incluirCerrados? }`
- Requiere autenticación JWT
- Sincroniza epics de todos los proyectos (no cerrados) de un equipo/producto
- Usa **Server-Sent Events (SSE)** para enviar progreso en tiempo real
- Maneja proyectos padre (obtiene epics de subproyectos)

---

## API Endpoints

### Endpoints de Datos

**GET `/api/mantenimiento`**
- Query params: `producto`, `equipo`, `busqueda`, `orden`, `direccion`
- Retorna: Array de mantenimientos desde `v_mantenimiento_completo`

**GET `/api/proyectos`**
- Query params: `producto`, `equipo`, `categoria`, `proyecto_padre`, `busqueda`, `orden`, `direccion`, `incluirCerrados`
- Retorna: Array de proyectos desde `v_proyectos_externos_completo` con subproyectos anidados

**GET `/api/proyectos/:id_proyecto`**
- Retorna: Proyecto específico con subproyectos y epics secundarios

**GET `/api/proyectos-internos`**
- Query params: `producto`, `busqueda`, `orden`, `direccion`
- Retorna: Array de proyectos internos (filtro `categoria = 'Proyectos Internos'`)

**GET `/api/epics/:id_proyecto`**
- Retorna: Epics de un proyecto desde BD

**GET `/api/dashboard/metricas`**
- Retorna: Métricas del dashboard

### Endpoints de Actualización

**PUT `/api/mantenimiento/:id_proyecto`**
- Body: Campos editables (`estado`, `fecha_inicio`, `fecha_fin`, `observaciones`, etc.)
- Actualiza tabla `mantenimiento`

**PUT `/api/proyectos/:id_proyecto`**
- Body: Campos editables (`estado`, `fecha_inicio`, `fecha_fin`, `observaciones`, etc.)
- Actualiza tabla `proyectos_externos`

**PUT `/api/proyectos-internos/:id_proyecto`**
- Body: Campos editables
- Actualiza tabla `proyectos_externos` (misma que proyectos externos)

**PUT `/api/subproyectos/:id_subproyecto`**
- Body: Campos editables
- Actualiza tabla `subproyectos`

### Endpoints de Accionables

**GET `/api/proyectos/:id_proyecto/accionables`**
- Retorna: Array de accionables del proyecto

**POST `/api/proyectos/:id_proyecto/accionables`**
- Body: `{ fecha_accionable, asignado_accionable, accionable }`
- Crea un nuevo accionable

**PUT `/api/accionables/:id`**
- Body: `{ fecha_accionable?, asignado_accionable?, accionable? }`
- Actualiza un accionable

**DELETE `/api/accionables/:id`**
- Elimina un accionable

**PUT `/api/proyectos/:id_proyecto/accionables`** (Legacy)
- Body: `{ accionables, fecha_accionable, asignado_accionable }`
- Actualiza campos legacy en `proyectos_externos`

### Endpoints de Sugerencias

**GET `/api/mantenimiento/sugerencias`**
- Query params: `q`, `producto`, `equipo`
- Retorna: Hasta 8 sugerencias de búsqueda

**GET `/api/proyectos/sugerencias`**
- Query params: `q`, `producto`, `equipo`, `incluirCerrados`
- Retorna: Hasta 8 sugerencias de búsqueda

**GET `/api/proyectos-internos/sugerencias`**
- Query params: `q`
- Retorna: Hasta 10 sugerencias de búsqueda

### Endpoints de Sync (Pedidos entre Equipos)

**GET `/api/sync/pedidos`**
- Query params: `equipo_solicitante`, `equipo_responsable`, `estados[]`, `fecha_desde`, `fecha_hasta`, `busqueda`, `ordenPor`, `ordenDireccion`
- Retorna: Array de pedidos

**GET `/api/sync/pedidos/:id`**
- Retorna: Pedido específico

**GET `/api/sync/equipos`**
- Retorna: Lista de equipos únicos

**POST `/api/sync/pedidos`**
- Body: `{ equipo_solicitante, equipo_responsable, descripcion, fecha_planificada_entrega, estado, comentario }`
- Crea un nuevo pedido

**PUT `/api/sync/pedidos/:id`**
- Body: Campos del pedido
- Actualiza un pedido

**DELETE `/api/sync/pedidos/:id`**
- Elimina un pedido

### Endpoints de Administración

**GET `/api/admin/productos-equipos`**
- Requiere admin
- Retorna: Productos y equipos con configuración

**GET `/api/admin/productos-equipos/unicos`**
- Requiere admin
- Retorna: Productos y equipos únicos

**POST `/api/admin/productos-equipos`**
- Requiere admin
- Body: `{ producto, equipo, id_equipo_redmine, producto_redmine?, codigo_proyecto_padre? }`
- Crea configuración de producto/equipo

**PUT `/api/admin/productos-equipos/:id`**
- Requiere admin
- Body: Campos de configuración
- Actualiza configuración

**DELETE `/api/admin/productos-equipos/:id`**
- Requiere admin
- Elimina configuración

---

## Construcción de Vistas

### Vista Principal (`index.ejs`)

**Estructura**:
- Sidebar con productos y equipos
- Tabs: "Mantenimiento" y "Proyectos"
- Filtros dinámicos (solo en tab "Proyectos")
- Tabla de datos (cargada vía JavaScript)

**Campos Mostrados en Mantenimiento**:
- **De Redmine (Solo Lectura)**:
  - `nombre_proyecto`
  - `cliente`
  - `producto`
  - `equipo`
  - `categoria`
  - `fecha_creacion`
- **Editables**:
  - `estado` (dropdown: Sin comenzar, En curso, Testing, Entregado, Rework, Cerrado)
  - `fecha_inicio` (date picker)
  - `fecha_fin` (date picker)
  - `observaciones` (textarea)

**Campos Mostrados en Proyectos**:
- **De Redmine (Solo Lectura)**:
  - `nombre_proyecto`
  - `cliente`
  - `producto`
  - `equipo`
  - `categoria`
  - `linea_servicio`
  - `fecha_creacion`
  - `reventa`
  - `proyecto_sponsor`
- **Editables**:
  - `estado` (dropdown)
  - `fecha_inicio` (date picker)
  - `fecha_fin` (date picker)
  - `observaciones` (textarea)
  - Accionables múltiples (tabla separada)
  - Epics (sincronizados desde Redmine, solo lectura)

**Filtros Disponibles (Solo en Proyectos)**:
- Cliente (dropdown dinámico)
- Estado (checkboxes: Sin comenzar, En curso, Testing, Entregado, Rework, Cerrado)
- Categoría (dropdown dinámico - solo categorías del equipo)
- Búsqueda (texto libre)

**Subproyectos**:
- Se muestran anidados bajo el proyecto padre
- Se cargan bajo demanda (lazy loading)
- Tienen los mismos campos editables que proyectos principales

### Vista de Proyectos Internos (`proyectos-internos.ejs`)

**Estructura Similar a Proyectos**:
- Filtro por producto
- Tabla de proyectos internos
- Mismos campos editables que proyectos externos

### Vista de Sync (`sync.ejs`)

**Gestión de Pedidos entre Equipos**:
- Tabla de pedidos con filtros
- Estados: Pendiente, En curso, Bloqueado, Realizado
- Campos: Equipo solicitante, Equipo responsable, Descripción, Fecha planificada, Estado, Comentario

### Vista de Administración (`admin.ejs`)

**Gestión de Productos y Equipos**:
- Tabla de configuraciones
- Campos editables:
  - `producto`: Nombre del producto
  - `equipo`: Nombre del equipo
  - `id_equipo_redmine`: ID del equipo en Redmine (cf_75)
  - `producto_redmine`: Nombre del producto en Redmine (cf_19) - opcional
  - `codigo_proyecto_padre`: Código del proyecto padre en Redmine - opcional

---

## Lógica de Negocio

### Separación de Datos Redmine vs Editables

**Principio**: Los datos de Redmine se sincronizan periódicamente y **nunca se editan** desde la aplicación. Los datos editables se almacenan localmente y se unen mediante vistas.

**Ventajas**:
- No se pierden ediciones locales al sincronizar
- Los datos de Redmine siempre reflejan el estado real
- Permite tener estados internos diferentes a Redmine

### Proyectos Padre y Subproyectos

**Definición**:
- **Proyecto Principal**: `linea_servicio = 'Si'` o `NULL`, sin `proyecto_padre` o con `proyecto_padre` que no existe en BD
- **Subproyecto**: `linea_servicio = 'Hereda'` y tiene `proyecto_padre` que existe en BD

**Lógica de Visualización**:
- Solo se muestran proyectos principales en la lista
- Los subproyectos se cargan bajo demanda cuando se expande un proyecto padre
- Los epics de proyectos padre se obtienen de sus subproyectos (no cerrados)

### Estados de Proyectos

**Estados Internos** (Editables):
- Sin comenzar
- En curso
- Testing
- Entregado
- Rework
- Cerrado

**Lógica de Sincronización**:
- Los proyectos con estado "Cerrado" **no se actualizan** desde Redmine (se excluyen de la sincronización)
- Los proyectos nuevos siempre se sincronizan
- Los proyectos existentes no cerrados se actualizan desde Redmine

### Epics

**Sincronización**:
- Se obtienen desde Redmine (tracker ID 19)
- Se mapean y guardan en `epics_proyecto`
- Se actualizan fechas del proyecto basándose en fechas de epics:
  - `fecha_inicio`: Mínima de `cf_21` (fecha planificada inicio)
  - `fecha_fin`: Máxima de `cf_22` (fecha planificada fin) o `cf_15` (fecha real finalización)

**Proyectos Padre**:
- Los epics se obtienen de todos los subproyectos no cerrados
- Las fechas del proyecto padre se calculan como mín/máx de las fechas de subproyectos

### Accionables

**Sistema Nuevo (Tabla `accionables_proyecto`)**:
- Múltiples accionables por proyecto
- Campos: `fecha_accionable`, `asignado_accionable`, `accionable`

**Sistema Legacy (Campos en `proyectos_externos`)**:
- Un solo accionable por proyecto
- Campos: `accionables`, `fecha_accionable`, `asignado_accionable`
- Se mantiene para compatibilidad

---

## Autenticación y Seguridad

### JWT (JSON Web Tokens)

**Configuración**:
- Secret: `JWT_SECRET` o `SESSION_SECRET` (variable de entorno)
- Expiración: 24 horas
- Almacenamiento: Cookie `auth_token`

**Middleware**:
- `requireAuthJWT`: Verifica token JWT en cookies
- `requireAdmin`: Verifica permisos de administrador

**Login**:
- **GET `/login`**: Renderiza página de login (redirige a `/` si ya está autenticado)
- **POST `/login`**: Procesa login
  - Body: `{ password }`
  - Compara con `LOGIN_PASSWORD` (usuario normal) o `LOGIN_PASSWORD_ADMIN` (admin)
  - Genera token JWT con flag `isAdmin` si la contraseña es la de admin
  - Establece cookie `auth_token` (httpOnly, secure en producción, 24h de expiración)
  - Redirige a `/` en caso exitoso
- **POST `/login/logout`**: Cierra sesión (limpia cookie y redirige a `/login`)

---

## Variables de Entorno

```env
# Base de Datos
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Redmine
REDMINE_URL=https://redmine.example.com
REDMINE_TOKEN=your_redmine_api_token

# Autenticación
LOGIN_PASSWORD=password_for_users
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret

# Servidor
PORT=3000
NODE_ENV=development|production
```

---

## Deployment en Vercel

### Configuración (`vercel.json`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/app.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Variables de Entorno en Vercel

Configurar todas las variables de entorno en el dashboard de Vercel:
- `DATABASE_URL`
- `REDMINE_URL`
- `REDMINE_TOKEN`
- `LOGIN_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`

---

## Flujo de Sincronización

### Sincronización de Mantenimiento

1. Usuario hace clic en "Sincronizar" desde la UI
2. Se envía `POST /api/sincronizar/mantenimiento` con `producto` y `equipo`
3. `sincronizacionService.sincronizarMantenimiento()`:
   - Obtiene código proyecto padre desde `productos_equipos` (si existe)
   - Hace dos llamados a Redmine:
     - Categoría "Mantenimiento"
     - Categoría "On-Site"
   - Combina resultados y elimina duplicados
   - Filtra proyectos excluidos (Licencias)
   - Inserta/actualiza en `redmine_mantenimiento` (ON CONFLICT)
   - Crea registros vacíos en `mantenimiento` para proyectos nuevos
4. Retorna estadísticas de sincronización

### Sincronización de Proyectos

1. Usuario hace clic en "Sincronizar" desde la UI
2. Se envía `POST /api/sincronizar/proyectos` con `producto` y `equipo`
3. `sincronizacionService.sincronizarProyectos()`:
   - Obtiene código proyecto padre desde `productos_equipos` (si existe)
   - Hace dos llamados a Redmine:
     - Línea de servicio "Si" (proyectos principales)
     - Línea de servicio "Hereda" (subproyectos)
   - Combina resultados
   - Filtra por categoría (excluye Mantenimiento, Licencias, null/vacío)
   - Consulta BD para obtener proyectos existentes y sus estados
   - Separa en: nuevos y existentes no cerrados
   - Filtra según vista (solo los que se muestran en la UI)
   - Inserta/actualiza en `redmine_proyectos_externos` (ON CONFLICT)
   - Crea registros vacíos en `proyectos_externos` para proyectos nuevos
4. Retorna estadísticas de sincronización

### Sincronización de Epics

1. Usuario hace clic en "Sincronizar Epics" desde un proyecto
2. Se envía `POST /api/sincronizar/epics` con `id_proyecto` y `codigo_proyecto`
3. `seguimientoController.sincronizarEpics()`:
   - Obtiene epics desde Redmine usando `obtenerEpics(codigo_proyecto)`
   - Mapea epics usando `mapearEpic()`
   - Guarda en `epics_proyecto` usando `EpicsProyectoModel.guardarEpics()`
   - Calcula totales (horas estimadas, horas realizadas, fechas)
   - Actualiza fechas del proyecto basándose en epics
4. Retorna estadísticas de sincronización

### Sincronización Masiva de Epics

1. Usuario hace clic en "Sincronizar Epics Masivo" desde la UI
2. Se envía `POST /api/sincronizar/epics-masivo` con `producto`, `equipo`, `categoria`, `incluirCerrados`
3. Se establece conexión **Server-Sent Events (SSE)**
4. `seguimientoController.sincronizarEpicsMasivo()`:
   - Obtiene todos los proyectos no cerrados según filtros
   - Para cada proyecto:
     - Verifica si es proyecto padre (tiene subproyectos)
     - Si es padre: obtiene epics de todos los subproyectos no cerrados
     - Si no es padre: obtiene epics normalmente
     - Guarda epics y actualiza fechas
     - Envía evento SSE con progreso
   - Envía evento final con estadísticas
5. Cliente recibe actualizaciones en tiempo real

---

## Resumen de Campos Editables vs Redmine

### Mantenimiento

| Campo | Fuente | Editable |
|-------|--------|----------|
| `id_proyecto` | Redmine | ❌ |
| `nombre_proyecto` | Redmine | ❌ |
| `codigo_proyecto` | Redmine | ❌ |
| `cliente` | Redmine | ❌ |
| `producto` | Redmine | ❌ |
| `equipo` | Redmine | ❌ |
| `categoria` | Redmine | ❌ |
| `fecha_creacion` | Redmine | ❌ |
| `estado` | Local | ✅ |
| `fecha_inicio` | Local | ✅ |
| `fecha_fin` | Local | ✅ |
| `observaciones` | Local | ✅ |

### Proyectos Externos/Internos

| Campo | Fuente | Editable |
|-------|--------|----------|
| `id_proyecto` | Redmine | ❌ |
| `nombre_proyecto` | Redmine | ❌ |
| `codigo_proyecto` | Redmine | ❌ |
| `cliente` | Redmine | ❌ |
| `producto` | Redmine | ❌ |
| `equipo` | Redmine | ❌ |
| `categoria` | Redmine | ❌ |
| `linea_servicio` | Redmine | ❌ |
| `reventa` | Redmine | ❌ |
| `proyecto_sponsor` | Redmine | ❌ |
| `fecha_creacion` | Redmine | ❌ |
| `estado` | Local | ✅ |
| `fecha_inicio` | Local | ✅ |
| `fecha_fin` | Local | ✅ |
| `observaciones` | Local | ✅ |
| `accionables` | Local | ✅ (múltiples) |
| `epics` | Redmine (sincronizados) | ❌ |

---

## Notas Importantes

1. **Sincronización Manual**: La sincronización con Redmine se realiza manualmente desde la UI, no es automática.

2. **Proyectos Cerrados**: Los proyectos con estado interno "Cerrado" no se actualizan desde Redmine para preservar el estado final.

3. **Proyectos Padre**: Los proyectos padre muestran epics de sus subproyectos no cerrados. Las fechas se calculan como mín/máx de subproyectos.

4. **Normalización de Productos**: Los nombres de productos se normalizan para Redmine usando `productos_equipos.producto_redmine` o un mapeo por defecto.

5. **Código Proyecto Padre**: Si existe `codigo_proyecto_padre` en `productos_equipos`, se usa para filtrar proyectos en Redmine (solo proyectos hijos del padre).

6. **Subproyectos**: Los subproyectos (`linea_servicio = 'Hereda'`) se cargan bajo demanda cuando se expande un proyecto padre.

7. **Epics**: Los epics se sincronizan manualmente por proyecto o masivamente para todos los proyectos de un equipo/producto.

8. **Autenticación**: El sistema usa JWT almacenado en cookies. No hay sistema de usuarios múltiples, solo una contraseña compartida.

9. **Base de Datos**: Se usa PostgreSQL (Neon) con timezone configurado a `America/Argentina/Buenos_Aires`.

10. **Serverless**: La aplicación está diseñada para ejecutarse en Vercel (serverless), por lo que no mantiene estado entre requests.
