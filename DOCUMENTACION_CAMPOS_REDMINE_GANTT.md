# Campos de Redmine para Gráficos Gantt

## 📊 Resumen

Los gráficos de Gantt en la aplicación utilizan diferentes campos de Redmine según el tipo de elemento que se está visualizando:

## 🎯 Para Epics (Issues de tipo Epic)

Los **Epics** utilizan **campos nativos de Redmine** para las fechas:

### Fecha de Inicio
- **Campo nativo**: `start_date` (fecha de inicio planificada del issue)
- **Código en la aplicación**: `start_date` (con fallback a `cf_21` para compatibilidad)
- **Ubicación en código**: `seguimiento/src/services/redmineService.js` línea 442-476
- **Nota**: Este es un campo nativo de Redmine, no requiere configuración de custom fields

### Fecha de Fin
- **Campo nativo**: `due_date` (fecha de vencimiento/cierre planificado del issue)
- **Código en la aplicación**: `due_date` (con fallback a `cf_22` para compatibilidad)
- **Ubicación en código**: `seguimiento/src/services/redmineService.js` línea 442-476
- **Nota**: Este es un campo nativo de Redmine, no requiere configuración de custom fields

### Campo Adicional (no usado en Gantt, pero se mapea)
- **Custom Field ID: 15**
- **Nombre alternativo**: "fecha real finalización"
- **Código en la aplicación**: `cf_15`
- **Nota**: Este campo se mapea pero **NO se usa** para el Gantt, solo para otros reportes

## 📁 Para Proyectos y Subproyectos

Los **Proyectos** y **Subproyectos** utilizan campos estándar de Redmine o campos calculados:

### Fecha de Inicio
- **Campo principal**: `fecha_inicio_epics` (calculada desde los epics)
- **Campo alternativo**: `fecha_inicio` (del proyecto en Redmine)
- **Lógica**: Se toma la fecha mínima de inicio de todos los epics del proyecto (`MIN(cf_21)`, donde `cf_21` contiene el valor de `start_date` nativo)
- **Ubicación en código**: `seguimiento/src/public/js/gantt-renderer.js` líneas 603-604, 334-335

### Fecha de Fin
- **Campo principal**: `fecha_fin_epics` (calculada desde los epics)
- **Campo alternativo**: `fecha_fin` (del proyecto en Redmine)
- **Lógica**: Se toma la fecha máxima de fin de todos los epics del proyecto (`MAX(cf_22)`, donde `cf_22` contiene el valor de `due_date` nativo)
- **Ubicación en código**: `seguimiento/src/public/js/gantt-renderer.js` líneas 603-604, 334-335

## 🔍 Detalles Técnicos

### Mapeo de Epics (Redmine → Base de Datos)

```javascript
// En seguimiento/src/services/redmineService.js
function mapearEpic(epic) {
    // Usar campos nativos de Redmine: start_date y due_date
    const start_date = parseDate(epic.start_date);
    const due_date = parseDate(epic.due_date);
    
    return {
        epic_id: epic.id,
        // Guardar en cf_21 y cf_22 para compatibilidad con BD existente
        cf_21: start_date,  // start_date nativo de Redmine
        cf_22: due_date,    // due_date nativo de Redmine
        // También exponer los campos nativos directamente
        start_date: start_date,
        due_date: due_date,
        // ...
    };
}
```

### Preparación de Datos para Gantt

```javascript
// En seguimiento/src/public/js/gantt-renderer.js
function prepararDatosGantt(esProyectoPadre, items, proyectoData) {
    return items.map(function (item) {
        if (esProyectoPadre) {
            // Para proyectos/subproyectos
            return {
                fechaInicio: item.fecha_inicio_epics || item.fecha_inicio || null,
                fechaFin: item.fecha_fin_epics || item.fecha_fin || null,
            };
        } else {
            // Para epics (usar campos nativos con fallback)
            return {
                fechaInicio: item.start_date || item.cf_21 || null,  // Campo nativo start_date
                fechaFin: item.due_date || item.cf_22 || null,        // Campo nativo due_date
            };
        }
    });
}
```

## 📋 Resumen de Campos por Tipo

| Tipo de Elemento | Fecha Inicio | Fecha Fin | Origen |
|------------------|--------------|-----------|--------|
| **Epic** | `start_date` (campo nativo) o `cf_21` (fallback) | `due_date` (campo nativo) o `cf_22` (fallback) | Campos nativos de Redmine (`start_date`, `due_date`) |
| **Proyecto** | `fecha_inicio_epics` o `fecha_inicio` | `fecha_fin_epics` o `fecha_fin` | Calculada desde epics o campo del proyecto |
| **Subproyecto** | `fecha_inicio_epics` o `fecha_inicio` | `fecha_fin_epics` o `fecha_fin` | Calculada desde epics o campo del subproyecto |

## ⚠️ Importante

1. **Los epics DEBEN tener ambos campos** (`start_date` y `due_date`) para aparecer en el Gantt
   - Si falta alguno, el epic se filtra y no se muestra
   - El código usa `start_date`/`due_date` nativos con fallback a `cf_21`/`cf_22` para compatibilidad
   - Ver: `seguimiento/src/public/js/gantt-renderer.js` línea 187

2. **Los proyectos calculan sus fechas** desde los epics:
   - Fecha inicio = Mínima de todos los `start_date` (o `cf_21`) de sus epics
   - Fecha fin = Máxima de todos los `due_date` (o `cf_22`) de sus epics

3. **Formato de fechas**:
   - Se esperan fechas en formato ISO (YYYY-MM-DD)
   - Se convierten automáticamente desde cualquier formato que Redmine devuelva

## 🔧 Configuración en Redmine

Para que los gráficos de Gantt funcionen correctamente, asegúrate de que en Redmine:

1. Los **Epics** tengan los campos nativos `start_date` y `due_date` completados
   - Estos son campos estándar de Redmine, no requieren configuración de custom fields
   - `start_date`: Fecha de inicio planificada del epic
   - `due_date`: Fecha de vencimiento/cierre planificado del epic

2. **Nota sobre compatibilidad**: El código mantiene compatibilidad con custom fields antiguos (`cf_21` y `cf_22`) como fallback, pero ahora se priorizan los campos nativos

## 📍 Ubicaciones en el Código

- **Mapeo de campos**: `seguimiento/src/services/redmineService.js` (función `mapearEpic`)
- **Preparación de datos Gantt**: `seguimiento/src/public/js/gantt-renderer.js` (función `prepararDatosGantt`)
- **Cálculo de fechas de proyectos**: `seguimiento/src/models/EpicsProyectoModel.js` (agregaciones MIN/MAX)
- **Renderizado**: `seguimiento/src/public/js/gantt-renderer.js` (función `renderizarGanttChart`)


