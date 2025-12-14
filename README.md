# Seguimiento de Proyectos

Sistema de seguimiento para mantenimiento y proyectos de la empresa, integrado con Redmine.

## Descripción

Esta aplicación permite gestionar y dar seguimiento a:
- **Mantenimiento**: Seguimiento de servicios de mantenimiento por producto
- **Proyectos Externos**: Proyectos con clientes externos
- **Proyectos Internos**: Proyectos internos de la empresa

## Tecnologías

- Node.js + Express
- PostgreSQL (Neon)
- EJS (Templates)
- Redmine API
- Vercel (Hosting)

## Estructura del Proyecto

```
Seguimiento/
├── src/
│   ├── app.js              # Entrada principal
│   ├── config/             # Configuración (database, env)
│   ├── controllers/        # Lógica de negocio
│   ├── models/             # Modelos de datos
│   ├── routes/             # Definición de rutas
│   ├── services/           # Servicios (Redmine API)
│   ├── middleware/         # Middleware personalizado
│   ├── utils/              # Funciones auxiliares
│   ├── public/             # Archivos estáticos
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── views/              # Templates EJS
│       ├── layouts/
│       ├── partials/
│       └── pages/
├── Database/              # Scripts SQL de base de datos
├── .env.example           # Plantilla de variables de entorno
├── .gitignore
├── package.json
├── README.md
└── vercel.json            # Configuración de Vercel
```

## Instalación

```bash
npm install
cp .env.example .env
# Configurar variables en .env
npm run dev
```

## Variables de Entorno

- `DATABASE_URL`: URL de conexión a PostgreSQL (Neon)
- `REDMINE_URL`: URL de la API de Redmine
- `REDMINE_TOKEN`: Token de autenticación de Redmine
- `LOGIN_PASSWORD`: Contraseña para acceso a la aplicación
- `SESSION_SECRET`: Secreto para sesiones (generar uno aleatorio)
- `PORT`: Puerto del servidor (default: 3000)
- `NODE_ENV`: Entorno (development/production)

## Deploy en Vercel

1. Conectar repositorio de GitHub
2. Configurar variables de entorno en Vercel
3. Deploy automático en cada push

## Productos y Secciones

La aplicación organiza el seguimiento por productos:
- Abbaco
- Unitrade
- Trading Room
- OMS
- Portfolio
- Portfolio Cloud
- Pepper

Cada producto tiene tres solapas:
- **Mantenimiento**: Seguimiento de servicios de mantenimiento
- **Proyectos Externos**: Proyectos con clientes externos
- **Proyectos Internos**: Proyectos internos

## Sincronización con Redmine

La sincronización se realiza manualmente mediante un botón de actualización en la interfaz. Los datos de Redmine se almacenan en tablas separadas de los datos editables, permitiendo mantener la información sincronizada sin perder las ediciones manuales.

## Base de Datos

El sistema utiliza las siguientes tablas principales:
- `redmine_mantenimiento`: Datos de Redmine para mantenimiento
- `mantenimiento`: Datos editables de mantenimiento
- `redmine_proyectos_externos`: Datos de Redmine para proyectos externos
- `proyectos_externos`: Datos editables de proyectos externos
- `redmine_proyectos_internos`: Datos de Redmine para proyectos internos
- `proyectos_internos`: Datos editables de proyectos internos

Cada par de tablas se une mediante vistas para mostrar la información completa.















