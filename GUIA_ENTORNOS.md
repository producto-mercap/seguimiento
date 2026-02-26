# Guía de Gestión de Entornos: Desarrollo vs Producción

## 📋 Resumen

Este proyecto tiene **dos entornos separados**:
- **Desarrollo Local**: Para trabajar y probar cambios
- **Producción (Vercel)**: Ambiente en vivo conectado a la base de datos de producción

## 🌳 Estrategia de Ramas Git

### Ramas Principales

```
main (producción)
  └── desarrollo (desarrollo)
```

- **`main`**: Rama de producción. Solo debe contener código probado y estable.
- **`desarrollo`**: Rama de desarrollo. Aquí trabajas tus cambios antes de llevarlos a producción.

## 🔄 Flujo de Trabajo Recomendado

### 1. Trabajar en Desarrollo Local

```bash
# Asegúrate de estar en la rama desarrollo
git checkout desarrollo

# Si no existe localmente, créala desde el remoto
git checkout -b desarrollo origin/desarrollo

# O si ya existe, actualízala
git pull origin desarrollo
```

### 2. Hacer Cambios y Commits

```bash
# Trabaja en tus cambios...
# Edita archivos, prueba localmente con npm run dev

# Cuando estés listo, commitea tus cambios
git add .
git commit -m "Descripción clara de los cambios"

# Sube a la rama desarrollo (NO a main)
git push origin desarrollo
```

### 3. Cuando Estés Listo para Producción

```bash
# 1. Asegúrate de que desarrollo esté actualizado y probado
git checkout desarrollo
git pull origin desarrollo

# 2. Cambia a main y actualízala
git checkout main
git pull origin main

# 3. Mergea desarrollo en main
git merge desarrollo

# 4. Sube a main (esto desplegará automáticamente en Vercel)
git push origin main
```

## 🔐 Variables de Entorno

### Desarrollo Local (`.env`)

Crea un archivo `.env` en la raíz del proyecto con tus variables de desarrollo:

```env
# Base de Datos de DESARROLLO (puede ser local o una BD de prueba)
DATABASE_URL=postgresql://usuario:password@host-dev:puerto/database-dev?sslmode=require

# Redmine (puede ser el mismo o uno de prueba)
REDMINE_URL=https://redmine.tudominio.com
REDMINE_TOKEN=tu_token_de_desarrollo

# Autenticación
LOGIN_PASSWORD=dev_password_123
LOGIN_PASSWORD_ADMIN=dev_admin_password

# Seguridad
SESSION_SECRET=tu_secreto_para_desarrollo

# Configuración
PORT=3000
NODE_ENV=development
```

### Producción (Vercel Dashboard)

Las variables de producción se configuran en Vercel:

1. Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Environment Variables**
2. Agrega las variables con valores de **producción**:
   - `DATABASE_URL` → Base de datos de producción
   - `REDMINE_URL` → URL de Redmine de producción
   - `REDMINE_TOKEN` → Token de producción
   - `LOGIN_PASSWORD` → Contraseña de producción
   - `LOGIN_PASSWORD_ADMIN` → Contraseña admin de producción
   - `SESSION_SECRET` → Secreto de producción (diferente al de desarrollo)
   - `NODE_ENV` → `production`

**⚠️ IMPORTANTE**: 
- El archivo `.env` está en `.gitignore`, así que **nunca** se subirá al repositorio
- Las variables de producción **solo** se configuran en Vercel, nunca en código

## 🚀 Deploy Automático en Vercel

### Configuración Actual

Vercel está configurado para desplegar automáticamente cuando haces push a `main`:

- **Rama `main`** → Deploy automático a producción
- **Rama `desarrollo`** → No despliega (o puedes configurar un preview)

### Verificar Configuración en Vercel

1. Ve a **Vercel Dashboard** → Tu Proyecto → **Settings** → **Git**
2. Verifica que la **Production Branch** esté configurada como `main`
3. Opcionalmente, puedes habilitar **Preview Deployments** para la rama `desarrollo`

## 📝 Checklist Antes de Hacer Deploy a Producción

Antes de mergear `desarrollo` → `main`, verifica:

- [ ] ✅ Todos los cambios están probados localmente
- [ ] ✅ No hay errores en la consola (`npm run dev` funciona sin errores)
- [ ] ✅ Las variables de entorno de producción están configuradas en Vercel
- [ ] ✅ No hay credenciales hardcodeadas en el código
- [ ] ✅ El archivo `.env` no está siendo commiteado (está en `.gitignore`)
- [ ] ✅ Los cambios no romperán funcionalidades existentes

## 🔍 Comandos Útiles

### Ver en qué rama estás
```bash
git branch
# El asterisco (*) indica la rama actual
```

### Ver diferencias entre ramas
```bash
# Ver qué cambios hay en desarrollo que no están en main
git diff main..desarrollo

# Ver commits en desarrollo que no están en main
git log main..desarrollo
```

### Crear una rama de feature (opcional)
```bash
# Para features grandes, crea una rama desde desarrollo
git checkout desarrollo
git checkout -b feature/nombre-de-la-feature

# Trabaja en la feature...
git add .
git commit -m "Agregar nueva feature"

# Cuando termines, mergea a desarrollo
git checkout desarrollo
git merge feature/nombre-de-la-feature
git push origin desarrollo

# Luego borra la rama local
git branch -d feature/nombre-de-la-feature
```

### Revertir cambios en desarrollo (si algo sale mal)
```bash
# Si necesitas deshacer el último commit (sin borrarlo del historial)
git revert HEAD

# Si necesitas volver a un commit anterior (CUIDADO: esto reescribe historial)
git reset --hard HEAD~1
```

## 🛡️ Protección de la Rama Main (Recomendado)

Para evitar deploys accidentales a producción, puedes proteger la rama `main` en GitHub:

1. Ve a **GitHub** → Tu Repositorio → **Settings** → **Branches**
2. Agrega una regla para `main`:
   - ✅ Require pull request before merging
   - ✅ Require approvals (opcional)
   - ✅ Do not allow bypassing (recomendado)

Esto fuerza a que siempre hagas un Pull Request para mergear a `main`, dando una capa extra de seguridad.

## 📊 Resumen de Flujo Completo

```
1. Desarrollo Local
   ├── git checkout desarrollo
   ├── Trabajas en cambios
   ├── npm run dev (pruebas localmente)
   ├── git commit
   └── git push origin desarrollo

2. Cuando estás listo para producción
   ├── git checkout main
   ├── git pull origin main
   ├── git merge desarrollo
   ├── git push origin main
   └── Vercel despliega automáticamente

3. Verificar deploy
   ├── Revisar logs en Vercel Dashboard
   ├── Probar la aplicación en producción
   └── Si hay problemas, hacer rollback o fix
```

## ⚠️ Errores Comunes y Soluciones

### "Accidentalmente hice push a main"
```bash
# Si aún no se desplegó, puedes revertir
git checkout main
git reset --hard HEAD~1  # CUIDADO: esto borra el último commit
git push origin main --force  # Solo si es necesario y tienes permisos
```

### "Necesito hacer un hotfix urgente en producción"
```bash
# Crea una rama desde main
git checkout main
git checkout -b hotfix/fix-urgente

# Haz el fix
# ... edita archivos ...

# Commitea y mergea a main
git add .
git commit -m "Hotfix: descripción del fix"
git checkout main
git merge hotfix/fix-urgente
git push origin main

# También mergea el hotfix a desarrollo para mantener sincronizado
git checkout desarrollo
git merge hotfix/fix-urgente
git push origin desarrollo
```

### "Las variables de entorno no funcionan en producción"
- Verifica en Vercel Dashboard → Settings → Environment Variables
- Asegúrate de que `NODE_ENV=production`
- Verifica que no haya espacios en blanco en los valores
- Después de cambiar variables, Vercel hace redeploy automático

## 📚 Recursos Adicionales

- [Documentación de Git Branches](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)



