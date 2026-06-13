# RetailTicketGoldOntology - Ontología de Fabric

**Descubierta:** 2026-06-02T20:42:14.834Z

## Descripción

Este documento contiene la estructura real de la ontología de tickets de retail, descubierta consultando directamente al Data Agent de Microsoft Fabric.

---

## Pregunta 1: ¿Cuáles son todas las tablas disponibles en la ontología de tickets?

**Timestamp:** 2026-06-02T20:41:13.215Z

### Respuesta

```
Las tablas disponibles en la ontología de tickets (Gold TKT) son:

- gold_tkt_fact_ticket: Principal, contiene un registro por ticket.
- gold_tkt_fact_actividad: KPIs y métricas por ticket.
- gold_tkt_fact_notificacion: Notificaciones enviadas por ticket.
- gold_tkt_dim_grupo: Información sobre los grupos de soporte.
- gold_tkt_dim_canal: Información de los canales de origen de tickets.
- gold_tkt_dim_estado: Estados posibles de los tickets.
- gold_tkt_dim_prioridad: Información sobre los niveles de prioridad.

Estas tablas contienen la información relevante para analizar y consultar datos de tickets, actividades, estados, prioridades, notificaciones y grupos de soporte.
```

---

## Pregunta 2: ¿Qué columnas tiene la tabla principal de tickets y qué significa cada una?

**Timestamp:** 2026-06-02T20:41:28.385Z

### Respuesta

```
La tabla principal de tickets es gold_tkt_fact_ticket, y almacena información clave sobre cada ticket registrado. A continuación te detallo sus columnas más relevantes y qué significa cada una:

- TicketId: Identificador único de cada ticket.
- NombreGrupo: Nombre del grupo de soporte asignado al ticket.
- NombreEstado: Estado actual del ticket (ejemplo: Abierto, Cerrado, Pendiente, etc.).
- NombrePrioridad: Prioridad asignada al ticket (Baja, Media, Alta, Crítica, etc.).
- NombreCategoria: Categoría del ticket (tipo de incidente o solicitud reportada).
- NombreTipoTicket: Tipo de ticket (por ejemplo, Incidente, Requerimiento, etc.).
- NombreCanal: Canal por el cual se reportó el ticket (teléfono, correo, web, etc.).
- EsCerrado: Indica si el ticket está cerrado (1) o abierto (0).
- EsRechazado: Indica si el ticket ha sido rechazado (1) o no (0).
- DuracionMinutos: Tiempo total de resolución del ticket, medido en minutos.
- FechaCreacion: Fecha y hora en que se creó el ticket.

Estas columnas permiten analizar el flujo, tiempos, responsables y estatus de los tickets en el sistema de soporte. Si necesitas el detalle de alguna columna adicional o de otro valor, avísame.
```

---

## Pregunta 3: ¿Qué tablas de configuración existen (grupos, categorías, prioridades, tipos)?

**Timestamp:** 2026-06-02T20:41:41.847Z

### Respuesta

```
Las tablas de configuración principales en el modelo Gold TKT para analizar tickets son las siguientes:

- gold_tkt_dim_grupo: contiene la configuración de los grupos de soporte (Nombre, Descripción, CorreoNotificacion, etc.).
- gold_tkt_dim_prioridad: contiene los distintos niveles de prioridad para los tickets (NombrePrioridad, OrdenPrioridad, etc.).
- gold_tkt_dim_estado: información sobre los estados posibles de los tickets (NombreEstado, EsFinal, EsInicial, etc.).
- gold_tkt_dim_canal: configuración de los canales a través de los cuales se pueden crear tickets (nombre, código, etc.).

En el modelo presentado, no se encuentra una tabla de tipos de ticket ni de categorías como tabla separada; sin embargo, esos campos (NombreTipoTicket y NombreCategoria) sí existen como columnas dentro de la tabla principal de tickets (gold_tkt_fact_ticket). Por tanto, los valores de estos atributos se obtienen de la propia facturación de tickets. 

Resumen:
- Tablas de configuración: grupos, prioridades, estados, canales.
- Tipos/Categorías: se encuentran como columnas en la tabla de tickets.
```

---

## Pregunta 4: ¿Qué tabla contiene el historial o log de acciones de los tickets?

**Timestamp:** 2026-06-02T20:41:52.150Z

### Respuesta

```
La tabla que contiene el historial o log de acciones de los tickets es la tabla gold_tkt_fact_evento. Esta tabla almacena los eventos relacionados con los tickets, como cambios de estado, reasignaciones, comentarios, entre otros.
```

---

## Pregunta 5: Dame un ejemplo de 3 tickets completos con todos sus campos relacionados

**Timestamp:** 2026-06-02T20:42:14.833Z

### Respuesta

```
Aquí tienes tres ejemplos de tickets completos, mostrando todos sus campos principales y relacionados:

1. TicketId: 21410
   - Grupo: Sistemas - Soporte Tienda
   - Estado: Pendiente
   - Prioridad: Urgente
   - Categoría: Soporte
   - Tipo de ticket: POS
   - Canal: App Tienda
   - Cerrado: No (EsCerrado = 0)
   - Rechazado: No (EsRechazado = 0)
   - Duración en minutos: (sin datos)
   - Fecha de creación: 30/05/2026 11:54:56 AM

2. TicketId: 21409
   - Grupo: Mantenimiento - Soporte Tienda
   - Estado: Pendiente
   - Prioridad: Alta
   - Categoría: General
   - Tipo de ticket: Soporte
   - Canal: App Tienda
   - Cerrado: No (EsCerrado = 0)
   - Rechazado: No (EsRechazado = 0)
   - Duración en minutos: (sin datos)
   - Fecha de creación: 30/05/2026 11:43:58 AM

3. TicketId: 21408
   - Grupo: Sistemas - Soporte Tienda
   - Estado: Pendiente
   - Prioridad: Urgente
   - Categoría: Soporte
   - Tipo de ticket: POS
   - Canal: App Tienda
   - Cerrado: No (EsCerrado = 0)
   - Rechazado: No (EsRechazado = 0)
   - Duración en minutos: (sin datos)
   - Fecha de creación: 30/05/2026 11:32:57 AM

Si necesitas más detalles o ejemplos, avísame.
```

---

## Notas de Implementación

- Las respuestas fueron obtenidas del Data Agent de Fabric en lenguaje natural
- Procesar estas respuestas es responsabilidad de los agentes analizadores
- Los campos y relaciones descritas aquí deben ser usados en `src/agent/prompts.ts`
- Esta ontología es **definitiva** para las consultas al Data Lake

---

*Generado automáticamente por `test:ontology`*
