# Glossary — {{PROJECT_NAME}}

> Generado desde Discovery Brief por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md`
> **SSOT:** Este documento para vocabulario del proyecto

---

## Términos de Negocio

| Término       | Definición                     | Usado en      |
| ------------- | ------------------------------ | ------------- |
| {{Término 1}} | {{Definición clara y concisa}} | BR-XXX, E-XXX |
| {{Término 2}} | {{Definición clara y concisa}} | US-XXX        |
| {{Término 3}} | {{Definición clara y concisa}} | BR-XXX        |

> 💡 **Tip:** Incluir 10-30 términos de negocio del dominio del cliente.

---

## Términos Técnicos

| Término       | Definición                                                           |
| ------------- | -------------------------------------------------------------------- |
| Server Action | Función async ejecutada en servidor con directive `"use server"`     |
| RSC           | React Server Component — componente que se renderiza en servidor     |
| RBAC          | Role-Based Access Control — permisos asignados por rol               |
| SSOT          | Single Source of Truth — fuente única de verdad para un tipo de dato |
| AC            | Acceptance Criteria — criterios de aceptación de un issue            |
| DoR           | Definition of Ready — criterios para empezar un issue                |
| DoD           | Definition of Done — criterios para cerrar un issue                  |

---

## Códigos y Estados

### Estados de Entidades

| Estado      | Significado             | Entidad     |
| ----------- | ----------------------- | ----------- |
| `DRAFT`     | Borrador, editable      | {{Entidad}} |
| `PENDING`   | Pendiente de aprobación | {{Entidad}} |
| `APPROVED`  | Aprobado, no editable   | {{Entidad}} |
| `CANCELLED` | Cancelado               | {{Entidad}} |

### Códigos del Sistema

| Código     | Significado          | Contexto         |
| ---------- | -------------------- | ---------------- |
| `MXN`      | Peso mexicano        | Currency         |
| `USD`      | Dólar estadounidense | Currency         |
| {{Código}} | {{Significado}}      | {{Dónde se usa}} |

---

## Acrónimos

| Acrónimo | Significado                       |
| -------- | --------------------------------- |
| MVP      | Minimum Viable Product            |
| API      | Application Programming Interface |
| UI       | User Interface                    |
| UX       | User Experience                   |
| DB       | Database                          |
| FK       | Foreign Key                       |
| PK       | Primary Key                       |

---

## Convenciones de Naming

| Tipo         | Convención         | Ejemplo           |
| ------------ | ------------------ | ----------------- |
| Tablas DB    | snake_case, plural | `user_accounts`   |
| Columnas DB  | snake_case         | `created_at`      |
| Variables TS | camelCase          | `userId`          |
| Tipos TS     | PascalCase         | `UserProfile`     |
| Constantes   | SCREAMING_SNAKE    | `MAX_RETRY_COUNT` |

---

## Open Questions

| #     | Pregunta                    | Impacto           | Owner   |
| ----- | --------------------------- | ----------------- | ------- |
| OQ-01 | [Término ambiguo pendiente] | **Alto**/Med/Bajo | Cliente |

---

## Assumptions

| #    | Supuesto                     | Si es incorrecto         |
| ---- | ---------------------------- | ------------------------ |
| A-01 | [Supuesto sobre vocabulario] | Impacto: [qué cambiaría] |

---

_Generado por TimeKast Factory — /docs_
