# Project Config Template

> Template para `docs/planning/project-config.md`.
> **Se genera durante:** `/discovery`
> **Se carga en:** `/init`, Phase 1 de todos los workflows

---

## Instrucciones

El agente debe rellenar este template con información del Brief (00_DISCOVERY_BRIEF.md)
y del setup del proyecto. Cada sección tiene instrucciones en comentarios HTML.

**Frontmatter YAML:** Rellenar los campos parseables del frontmatter antes del body markdown.
Los workflows leen estos campos con `grep "^campo:" docs/planning/project-config.md | cut -d' ' -f2`.

---

## Template

````markdown
---
project: '{{nombre_proyecto}}'
client: '{{nombre_cliente_o_organización}}'
stakeholder: '{{nombre_principal — quien aprueba}}'
project_type: saas-mvp # saas-mvp | internal-tool | landing | e-commerce | mobile-app | api-service
structure_version: '1.0'
design_system: neomorphism-2
locale: '{{es-MX}}'
timezone: '{{America/Mexico_City}}'
deadline: '{{YYYY-MM-DD o TBD}}'
stack: { framework: next, db: drizzle-neon, auth: nextauth }
---

# Project Config

<!-- INSTRUCCIÓN: No incluir esta línea ni las blockquotes del template en el output -->

---

## 1. Project Info

| Campo                 | Valor                                                        |
| --------------------- | ------------------------------------------------------------ |
| **Nombre**            | {{nombre_proyecto}}                                          |
| **Tipo**              | {{saas-mvp / internal-tool / landing / e-commerce / custom}} |
| **Repo**              | {{org/repo}}                                                 |
| **Branch principal**  | {{main}}                                                     |
| **Branch de trabajo** | {{develop}}                                                  |
| **Fecha inicio**      | {{fecha}}                                                    |

---

## 2. Problem Statement

<!-- 2-3 líneas: qué hace, para quién, qué problema resuelve -->

{{descripción breve del proyecto}}

---

## 3. Stakeholders

| Rol           | Nombre     | Contacto        | Decides sobre       |
| ------------- | ---------- | --------------- | ------------------- |
| Product Owner | {{nombre}} | {{email/slack}} | Scope, prioridad    |
| Tech Lead     | {{nombre}} | {{email/slack}} | Arquitectura, stack |
| Diseñador     | {{nombre}} | {{email/slack}} | UI/UX               |
| Cliente       | {{nombre}} | {{email/slack}} | Aprobación final    |

<!-- Solo los relevantes para decisiones. Omitir roles sin persona asignada. -->

---

## 4. Tech Stack

> 📦 Versiones exactas → `package.json`

| Capa           | Tecnología                     |
| -------------- | ------------------------------ |
| **Framework**  | {{Next.js (App Router, RSC)}}  |
| **UI**         | {{React}}                      |
| **Styling**    | {{Tailwind CSS v4 + CSS vars}} |
| **Components** | {{shadcn/ui + Radix UI}}       |
| **DB**         | {{Neon Postgres}}              |
| **ORM**        | {{Drizzle ORM}}                |
| **Auth**       | {{Auth.js v5}}                 |
| **Validation** | {{Zod}}                        |

### Stack Overrides (si difiere del SK estándar)

| Componente | SK Estándar | Este Proyecto | Razón |
| ---------- | ----------- | ------------- | ----- |

<!-- Solo si hay diferencias vs el Starter Kit -->

---

## 5. Infrastructure & Services

<!-- Toda la infra y servicios del proyecto en un solo lugar:
     hosting, DB, storage, APIs externas, email, crons, proxies.
     Incluir SIEMPRE, incluso si es stack estándar del SK.
     Fuente: Brief §5 + §8 + setup real del proyecto. -->

| Servicio   | Host / URL         | Propósito           | Env Var          | Costo         |
| ---------- | ------------------ | ------------------- | ---------------- | ------------- |
| {{Vercel}} | {{app.vercel.app}} | Hosting + Cron      | —                | {{$20/mes}}   |
| {{Neon}}   | Via `DATABASE_URL` | DB principal        | `DATABASE_URL`   | {{Free tier}} |
| {{Resend}} | Via API            | Email transaccional | `RESEND_API_KEY` | {{Free tier}} |

<!-- Ejemplos adicionales:
| VPS DigitalOcean | 24.144.91.109            | Proxy TCP para MySQL ERP | —                    | $6 USD/mes  |
| Cloudflare R2    | Via API                  | Storage: CSVs + imágenes | R2_*                 | Pay per use |
| The Odds API     | the-odds-api.com         | Líneas, scores en vivo   | THE_ODDS_API_KEY     | Pay per use |
| Firebase         | firebase.google.com      | Sync para app móvil      | FIREBASE_*           | Free tier   |
| Google Drive     | Via API v3               | Gestión documental       | GOOGLE_DRIVE_*       | Incluido    |
-->

---

## 6. Related Repos

<!-- Otros repositorios que interactúan con este proyecto.
     Omitir si el proyecto es un solo repo.
     Fuente: Brief §8 o contexto del proyecto. -->

| Repo | Path / URL | Stack | Propósito |
| ---- | ---------- | ----- | --------- |

<!-- Ejemplos:
| adi-capital-investors | ~/Timekast/adi-capital-investors | Flutter + Firebase | App móvil — consume datos de este admin |
| TimeKast-Factory      | ~/Timekast/TimeKast-Factory      | Template           | Factory con .agent/, skills, workflows |
-->

---

## 7. Roles

<!-- Roles RBAC del sistema (no stakeholders del proyecto, esos van en §3).
     Línea compacta. Fuente: Brief §2. -->

{{super_admin, admin, staff}}

<!-- Ejemplos:
- MVPicks: super_admin, platform_admin, host, user + Superhost (capability)
- Aditivo: Tienda (4 sub-roles), Supervisor, Marketing, Admin
- Adi Capital: Super Admin, Admin Fondo, Agente, Inversionista
-->

---

## 8. Client Context

<!-- Contexto del cliente para adaptar tono, vocabulario y restricciones de marca.
     Fuente: Brief §9 (Branding) + §11 (Visual Direction Seeds).
     Usado por: /proposal (lenguaje cliente), /design (restricciones visuales). -->

| Campo                   | Valor                                                  |
| ----------------------- | ------------------------------------------------------ |
| **Industria**           | {{industria del cliente}}                              |
| **Nivel de formalidad** | {{formal / semi-formal / casual}}                      |
| **Idioma preferido**    | {{español / inglés / bilingüe}}                        |
| **Restricciones marca** | {{colores prohibidos, fuentes requeridas, logo rules}} |

<!-- Si el cliente no tiene restricciones, indicar "Sin restricciones específicas" -->

---

## 9. Key Decisions

<!-- Decisiones firmes de tech/negocio que el agente DEBE respetar.
     Fuente: Brief Decision Registry (top decisions).
     Complementa las Project-Specific Rules con decisiones concretas. -->

- {{Decisión 1 — razón breve}}

<!-- Ejemplos:
- MySQL ERP connection directa en MVP (no solo CSV)
- Cloudflare R2 como storage (CSVs + evidencias)
- 4 Cron Jobs: Exportador, Importador, Limpieza, Motor
-->

---

## 10. Project-Specific Rules

<!-- Reglas únicas de ESTE proyecto que no están en rules/ -->

1. {{Regla específica}}

---

## 11. Scope Boundaries

<!-- Qué NO es el proyecto. Previene scope creep del agente.
     Fuente: Brief §3.3 (Scope Boundaries) + §1.5 (Qué Sí Es / Qué No Es). -->

**No incluye:**

- {{Cosa excluida del scope}}

<!-- Ejemplos:
- No es casa de apuestas ni plataforma de gambling regulado
- No procesa pagos — solo display informativo
- No soporta más deportes que NFL + WC en MVP
-->

---

## 12. Pipeline Status

<!-- Estado del pipeline de documentación. Se actualiza al completar cada fase.
     Discovery crea esta tabla con ✅. Los demás workflows actualizan su fila en close.
     Omitir si el proyecto no usa el pipeline Factory. -->

| Fase      | Documento                             | Estado       |
| --------- | ------------------------------------- | ------------ |
| Discovery | `docs/planning/00_DISCOVERY_BRIEF.md` | ✅ Completo  |
| Proposal  | `docs/planning/01_PROPOSAL.md`        | ⬜ Pendiente |
| Docs      | `docs/planning/02-14_*.md`            | ⬜ Pendiente |
| Design    | `docs/planning/15_DESIGN.md`          | ⬜ Pendiente |
| Backlog   | `docs/backlog/`                       | ⬜ Pendiente |
| Code      | `src/`                                | ⬜ Pendiente |

---

## 13. Quick Commands

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm test             # Unit tests (Vitest)
pnpm test:e2e         # E2E tests (Playwright)
pnpm db:generate      # Generate migration
pnpm db:migrate       # Apply migration
```
````

---

> 📝 **Generado:** {{fecha}} | **Versión:** ver `package.json`

_TimeKast Factory — Project Config_

---

## Notas para el agente

1. **Frontmatter YAML (OBLIGATORIO):**
   - `project`, `client`, `stakeholder` → Brief §1 + §2
   - `project_type` → Brief §1 (tipo de producto)
   - `design_system` → SK default (`neomorphism-2`) salvo que se defina custom
   - `locale` → Brief §9 (idioma UI)
   - `timezone` → Brief §8 (infraestructura), default `America/Mexico_City`
   - `stack` → Brief §8 + SK actual (framework, db, auth)
   - `deadline` → Brief §8 (timeline), o `'TBD'` si no hay fecha definida
   - `structure_version` → siempre `"1.0"` para proyectos nuevos
   - **No incluir** `version` ni `ports` — SSOT en `package.json`
2. **Rellenar body desde Brief:**
   - §1-4 → Project Info, Problem Statement, Stakeholders, Tech Stack
   - §5 Infrastructure & Services → Brief §5 + §8. **Todo en una tabla: hosting, DB, APIs, storage, email.**
   - §6 Related Repos → Solo si multi-repo. Fuente: Brief §8 o contexto del proyecto. Omitir si single-repo.
   - §7 Roles → Brief §2 (roles RBAC, NO stakeholders)
   - §8 Client Context → Brief §9 + §11
   - §9 Key Decisions → Brief Decision Registry (top decisions firmes)
   - §10 Project-Specific Rules → Brief §6 (invariantes y reglas únicas)
   - §11 Scope Boundaries → Brief §3.3 + §1.5 (qué NO es el proyecto)
   - §12 Pipeline Status → Discovery ✅, resto ⬜ Pendiente
3. **Glossario** → vive en `09_GLOSSARY.md`, NO duplicar aquí
4. **No duplicar:** Features → `features.md`. File structure → `INVENTORY.md`
5. **Mantener compacto:** Este archivo es metadata ejecutable, no documentación extensa.
6. **Actualizar manualmente** si cambia el stack, se agregan integraciones, o cambian stakeholders.
7. **Pipeline Status** se actualiza automáticamente por cada workflow close.
