# Guía de Deploy a Producción

## Pasos para Commitear Cambios y Verlos en Producción

### 1. Verificar el estado actual
```bash
git status
```
Esto te mostrará qué archivos han sido modificados, agregados o eliminados.

### 2. Agregar archivos al staging
```bash
# Agregar todos los archivos modificados
git add .

# O agregar archivos específicos
git add archivo1.js archivo2.js
```

**⚠️ IMPORTANTE:** El archivo `.env` está en `.gitignore` y NO debe ser commiteado. Solo se commitean los archivos de código.

### 3. Crear el commit
```bash
git commit -m "Descripción clara de los cambios realizados"
```

Ejemplos de mensajes descriptivos:
- `git commit -m "Agregar funcionalidad de filtrado por producto"`
- `git commit -m "Corregir bug en sincronización con Redmine"`
- `git commit -m "Actualizar estilos del dashboard"`

### 4. Subir cambios a GitHub
```bash
git push origin main
```

Si es la primera vez y necesitas configurar upstream:
```bash
git push -u origin main
```

### 5. Verificar el deploy en Vercel

Una vez que haces `git push`, Vercel detecta automáticamente los cambios y:

1. **Inicia el build automáticamente** (puedes verlo en el dashboard de Vercel)
2. **Despliega en producción** cuando el build termina exitosamente

**URL de producción:** `seguimiento-ochre.vercel.app` (según el README)

### 6. Monitorear el deploy

- Ve a tu dashboard de Vercel: https://vercel.com/dashboard
- Selecciona el proyecto "seguimiento"
- Verás el estado del deploy (Building → Ready)
- Si hay errores, aparecerán en los logs

---

## Comandos Rápidos (Resumen)

```bash
# 1. Ver cambios
git status

# 2. Agregar cambios
git add .

# 3. Commitear
git commit -m "Tu mensaje descriptivo"

# 4. Subir a GitHub
git push origin main

# 5. ¡Listo! Vercel desplegará automáticamente
```

---

## Configuración de Variables de Entorno en Vercel

**⚠️ IMPORTANTE:** Las variables de entorno deben configurarse en Vercel, NO en el código.

1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Agrega las mismas variables que tienes en tu `.env` local:
   - `DATABASE_URL`
   - `REDMINE_URL`
   - `REDMINE_TOKEN`
   - `LOGIN_PASSWORD`
   - `LOGIN_PASSWORD_ADMIN`
   - `SESSION_SECRET`
   - `NODE_ENV` (debe ser `production`)

3. Después de agregar las variables, Vercel hará un redeploy automático

---

## Troubleshooting

### El deploy falla
- Revisa los logs en Vercel Dashboard
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que `package.json` tenga los scripts correctos

### Los cambios no aparecen en producción
- Espera unos minutos (el build puede tardar)
- Verifica que el commit se haya subido correctamente: `git log --oneline`
- Revisa el estado del deploy en Vercel Dashboard
- Limpia la caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

### Error de autenticación al hacer push
Si usas SSH:
```bash
git remote set-url origin git@github.com:producto-mercap/seguimiento.git
```

Si usas HTTPS:
```bash
git remote set-url origin https://github.com/producto-mercap/seguimiento.git
```

---

## Buenas Prácticas

1. **Haz commits frecuentes** con mensajes descriptivos
2. **Prueba localmente** antes de hacer push (`npm run dev`)
3. **Revisa los logs de Vercel** después de cada deploy
4. **No commitees** archivos sensibles (`.env`, `node_modules`, etc.)
5. **Usa ramas** para features grandes antes de mergear a `main`




