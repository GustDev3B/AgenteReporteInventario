# AgentTickets3B - Project Context

**Última actualización:** 2026-06-02

## Ontología de Datos (Gold TKT)

### Tablas de Hechos
- **gold_tkt_fact_ticket**: Registro principal de tickets
  - TicketId, NombreGrupo, NombreEstado, NombrePrioridad, NombreCategoria, NombreTipoTicket, NombreCanal
  - EsCerrado (0/1), EsRechazado (0/1), DuracionMinutos, FechaCreacion

- **gold_tkt_fact_actividad**: KPIs y métricas por ticket
- **gold_tkt_fact_notificacion**: Notificaciones enviadas por ticket
- **gold_tkt_fact_evento**: Historial de cambios y acciones

### Tablas de Dimensiones
- **gold_tkt_dim_grupo**: Grupos de soporte
- **gold_tkt_dim_prioridad**: Niveles de prioridad (Crítica, Urgente, Alta, Media, Baja)
- **gold_tkt_dim_estado**: Estados posibles (Abierto, Pendiente, Cerrado)
- **gold_tkt_dim_canal**: Canales de origen (App Tienda, teléfono, correo, web)

## Análisis Realizado por el Agente

1. **Distribución diaria**: Tickets creados por día
2. **Carga por grupo**: Top 5 grupos con más tickets abiertos
3. **Tickets urgentes**: Cantidad de Urgentes/Críticos abiertos
4. **Tiempo de resolución**: Promedio DuracionMinutos por grupo
5. **Rechazos**: Tickets con EsRechazado=1
6. **Categorías frecuentes**: Top 5 categorías y tipos
7. **Datos incompletos**: Registros con DuracionMinutos vacío
8. **Distribución de prioridades**: Volumen por nivel
9. **Canales**: Cuál genera más tickets
10. **Anomalías**: Grupos con volumen inusual

## Estado del Proyecto

- ✅ Ontología real descubierta (2026-06-02)
- ✅ Chat mode con Claude SDK real
- ✅ Prompts actualizados con Gold TKT
- ✅ Subagentes con instrucciones específicas

---

Última actualización: 2026-06-02
