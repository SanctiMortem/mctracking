# 📖 Glossary — MTG Commander Tracker

> Generado desde Discovery Brief por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md`
> **SSOT:** Este documento para vocabulario del proyecto.
> **Versión:** 1.0 — 2026-04-09

> ⚠️ **Regla de terminología:** Los términos del universo Magic: The Gathering se mantienen **siempre en inglés**, independientemente del idioma de la app. Esta regla aplica en UI, documentación y código (BR-I18N-02).

---

## Términos del Dominio — Magic: The Gathering

| Término              | Definición                                                                         | Usado en                  |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| **Commander**        | (1) Formato de MTG para grupos de 3–4+ jugadores. (2) La carta legendaria que encabeza un deck en este formato. | E-001, FT-003, BR-TRACK-02 |
| **Commander Damage** | Daño infligido directamente por una carta Commander. Si un jugador recibe 21+ de daño de un único commander, pierde. | BR-TRACK-02, BR-TRACK-04, FT-013 |
| **Commander Tax**    | Coste adicional de maná para re-lanzar un commander desde la zona de command (+2 genérico por vez). No se trackea en MVP. | Glosario de dominio       |
| **Life Total**       | Puntos de vida de un jugador. Empieza en 40 en Commander. La app no determina muerte automáticamente. | E-008, BR-TRACK-01        |
| **Poison Counter**   | Contador acumulado de daño de infect/wither. Al llegar a 10, el jugador pierde (alerta visual, sin acción automática). | E-008, BR-TRACK-05, FT-014 |
| **Infect**           | Habilidad de carta que en lugar de reducir vida, aplica Poison Counters al jugador (o -1/-1 counters a criaturas). | BR-TRACK-05, FT-014        |
| **Proliferate**      | Habilidad que permite agregar un contador adicional a cualquier permanente o jugador que ya tenga contadores. Relevante para Poison. | Glosario de dominio       |
| **Partner**          | Habilidad que permite tener dos commanders diferentes en el mismo deck. Cada uno tiene sus propios contadores de commander damage. | E-001, E-002, BR-DECK-03, BR-TRACK-03 |
| **WUBRG**            | Las 5 colores de mana en MTG: **W**hite (Blanco), **U**Blue (Azul), **B**Black (Negro), **R**ed (Rojo), **G**reen (Verde). Más C = Colorless (Incoloro). | E-001, §9 Branding        |
| **Color Identity**   | El conjunto de colores WUBRG presentes en un deck, determinados por la carta Commander. Define qué cartas puede incluir el deck. | E-002 (color_identity)    |
| **Scoop**            | Conceder la partida sin condición de victoria. Equivalente a "rendirse". Win condition válida: `scoop`. | BR-MATCH-09, E-007        |
| **Concede**          | Sinónimo de scoop. Concesión voluntaria de derrota.                               | BR-MATCH-09, E-007        |
| **Mill**             | Condición de victoria que consiste en vaciar el mazo (library) de un oponente.    | BR-MATCH-09, E-007        |
| **Combo**            | Condición de victoria mediante una combinación de cartas que crea un efecto infinito o ganar en el mismo turno. | BR-MATCH-09, E-007 |
| **Combat Damage**    | Daño infligido mediante el ataque de criaturas en combate. El tipo más común de daño en MTG. | BR-MATCH-09, E-007 |
| **Win Condition**    | Cómo se ganó una partida. Enum válido: `combat_damage`, `commander_damage`, `infect`, `combo`, `mill`, `scoop`, `concede`, `other`. | E-007, BR-MATCH-09        |
| **Draw**             | Empate. Ningún jugador gana. Todos los Participations quedan con `result = 'draw'`. | E-007, BR-MATCH-08        |
| **Abandoned**        | Match cerrado sin resultado (ningún jugador ganó oficialmente). Aparece en historial pero no cuenta en stats. | E-005, BR-MATCH-06        |
| **Deck**             | Conjunto de cartas construido alrededor de un Commander. En esta app: nombre + commander + descripción (sin lista de cartas en MVP). | E-002, FT-002             |
| **Commander Zone**   | Zona especial donde vive el Commander al inicio y al que regresa si es destruido. No se trackea en la app. | Glosario de dominio        |
| **Mana**             | Recurso básico de juego para lanzar hechizos. No se trackea en MVP (Fase 2).      | FT-021 (post-MVP)         |

---

## Términos del Producto — MTG Commander Tracker

| Término               | Definición                                                                        | Usado en                  |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| **Match**             | Una partida de Commander en la app. Tiene entre 2 y 4 Participations. Estados: `in_progress`, `completed`, `abandoned`. | E-005, FT-005            |
| **Participation**     | La instancia de un Player usando un Deck en un Match específico. Almacena life_total, poison_counters y commander_damage en vivo. | E-008, FT-005 |
| **Match Event / MatchEvent** | Un registro inmutable de un cambio de estado durante el match (life change, poison change, commander damage). Soporta Undo. | E-006, FT-015 |
| **Undo**              | Revertir el último MatchEvent no-anulado. Ilimitado hacia atrás. No elimina el event — lo marca con `is_undone = true`. | BR-TRACK-11, FT-015 |
| **Debounce**          | Agrupación de taps consecutivos dentro de un umbral de tiempo en un único MatchEvent con delta acumulado. Reduce ruido en el log. | BR-TRACK-09, E-006 |
| **Debounce Threshold** | Tiempo en milisegundos que define la ventana de debounce. Configurable por el usuario (200–2000ms, default 500ms). | BR-TRACK-10, E-011 |
| **Win Condition**     | La razón oficial por la que terminó el match. Selección manual del usuario. Ver enum en E-007. | FT-006, BR-MATCH-09 |
| **Group / Friend Group** | Grupo de amigos con base de datos compartida (jugadores, decks, matches e historial comunes). | E-003, FT-017         |
| **Group Member**      | Usuario autenticado con acceso a la DB de un grupo. Puede crear recursos del grupo pero no administrar miembros. | E-004, P-003         |
| **Group Owner**       | Creador del grupo. Puede invitar/remover miembros y archivar el grupo.            | E-004, P-004              |
| **Guest Mode**        | Modo de tracking básico sin login. Sin persistencia. Solo life/poison/commander damage en sesión. | P-001, FT-016/F45 |
| **Soft Delete**       | Borrado lógico: el registro se marca con `deleted_at` pero no se elimina físicamente de la DB. Obligatorio para Player y Deck con historial. | BR-ENTITY-03, BR-DECK-07 |
| **Player**            | Perfil de jugador registrado en la app (no necesariamente un User/cuenta). Puede ser creado por cualquier usuario autenticado del grupo. | E-009, FT-001 |
| **Stats Engine**      | El sistema de cálculo de estadísticas on-demand (win rate, matchups, etc.) basado en el historial de matches completados. | FT-008 → FT-012 |
| **Guest Tracker**     | La pantalla de tracking básico para modo Guest (P19). Sin decks ni jugadores registrados — solo secciones de vida. | FT-016/F45, P-001 |
| **Premium**           | Estado de cuenta que elimina los anuncios. Se adquiere con compra única via Apple IAP / Google Play Billing. No gatea features. | BR-AUTH-04, E-011 |
| **Invite Link**       | Link generado por el Group Owner para invitar nuevos miembros al grupo. Tiene expiración. | BR-GROUP-05, FT-017 |

---

## Términos Técnicos

| Término               | Definición                                                                        |
| --------------------- | --------------------------------------------------------------------------------- |
| **React Native**      | Framework para crear apps móviles nativas iOS y Android desde un único codebase JavaScript/TypeScript. |
| **Neon**              | Proveedor de PostgreSQL serverless. Base de datos principal del proyecto. Escala a cero en inactividad. |
| **Drizzle ORM**       | ORM TypeScript recomendado para Neon/PostgreSQL. Genera migraciones type-safe.    |
| **UUID**              | Universally Unique Identifier. Formato de ID primario de todas las entidades de la DB. |
| **JSONB**             | Tipo de dato de PostgreSQL que almacena JSON de forma binaria. Usado en `Participation.commander_damage`. |
| **RBAC**              | Role-Based Access Control. Permisos asignados por rol: Guest, User, Group Member, Group Owner. |
| **IAP**               | In-App Purchase. Compra dentro de la app procesada por Apple StoreKit o Google Play Billing. |
| **OAuth**             | Protocolo de autorización. Usado por Google y Apple Sign In para autenticación sin contraseña. |
| **Magic Link**        | Método de autenticación sin contraseña: el sistema envía un link por email que activa la sesión. |
| **Serverless**        | Modelo de infraestructura donde el servidor escala automáticamente y no se mantiene activo en inactividad. |
| **Soft Delete**       | Patrón de borrado lógico: `deleted_at timestamp NOT NULL` indica que el registro está inactivo. |
| **Expo**              | Toolchain para React Native que simplifica build y distribución de apps iOS/Android. |
| **expo-localization**  | Módulo de Expo para detectar el idioma del dispositivo. Parte del stack de i18n.  |
| **react-i18next**     | Librería de internacionalización para React/React Native. Maneja traducciones EN/ES. |
| **SSOT**              | Single Source of Truth. Fuente única de verdad para un tipo de dato o decisión.   |
| **Server Action**     | Función async ejecutada en el servidor. Patrón de Next.js; en RN equivalente a llamadas de API/DB directas. |

---

## Códigos y Estados

### Estados de Match (`Match.status`)

| Estado        | Significado                                        | Aparece en Historial | Cuenta en Stats |
| ------------- | -------------------------------------------------- | :------------------: | :-------------: |
| `in_progress` | Partida actualmente en curso                       | ❌                   | ❌              |
| `completed`   | Partida terminada con resultado (ganador o draw)   | ✅                   | ✅              |
| `abandoned`   | Partida cerrada sin resultado oficial              | ✅                   | ❌              |

### Win Conditions (`MatchResult.win_condition`)

| Código              | Descripción                               |
| ------------------- | ----------------------------------------- |
| `combat_damage`     | Victoria por daño de combate              |
| `commander_damage`  | Victoria por 21+ commander damage         |
| `infect`            | Victoria por 10 poison counters           |
| `combo`             | Victoria por combo infinito               |
| `mill`              | Victoria por vaciar el mazo del oponente  |
| `scoop`             | Los demás conceden                        |
| `concede`           | Sinónimo de scoop (concesión)             |
| `other`             | Otra condición no listada                 |

### Colores MTG (`Commander.colors`)

| Código | Color   | Nombre completo | Referencia visual |
| ------ | ------- | --------------- | ----------------- |
| `W`    | White   | Blanco          | #F9FAF4           |
| `U`    | Blue    | Azul            | #0E68AB           |
| `B`    | Black   | Negro           | #150B00           |
| `R`    | Red     | Rojo            | #D3202A           |
| `G`    | Green   | Verde           | #00733E           |
| `C`    | Colorless | Incoloro      | #BEB9B2           |

### Estados de Participation (`Participation.result`)

| Valor    | Significado                               |
| -------- | ----------------------------------------- |
| `win`    | Este jugador ganó el match               |
| `lose`   | Este jugador perdió el match             |
| `draw`   | Match terminó en empate (todos = `draw`) |
| `null`   | Match abandoned — sin resultado asignado |

### Auth Providers (`User.provider`)

| Valor         | Descripción                  |
| ------------- | ---------------------------- |
| `email`       | Email + Password             |
| `google`      | Google OAuth                 |
| `apple`       | Apple Sign In                |
| `magic_link`  | Email Magic Link             |

### Roles de Grupo (`GroupMembership.role`)

| Valor    | Descripción                                   |
| -------- | --------------------------------------------- |
| `owner`  | Creador del grupo. Acceso de administración.  |
| `member` | Miembro invitado. Acceso completo a recursos. |

---

## Acrónimos

| Acrónimo | Significado                          |
| -------- | ------------------------------------ |
| MTG      | Magic: The Gathering                 |
| WUBRG    | White, Blue, Black, Red, Green (5 colores MTG) |
| MVP      | Minimum Viable Product               |
| CRUD     | Create, Read, Update, Delete         |
| RBAC     | Role-Based Access Control            |
| IAP      | In-App Purchase                      |
| ORM      | Object-Relational Mapping            |
| RN       | React Native                         |
| UUID     | Universally Unique Identifier        |
| FK       | Foreign Key                          |
| PK       | Primary Key                          |
| AC       | Acceptance Criteria                  |
| US       | User Story                           |
| FT       | Feature (ID prefix)                  |
| BR       | Business Rule (ID prefix)            |
| E-       | Entity (ID prefix)                   |
| P-       | Persona (ID prefix) o Pantalla (P01-P19 según contexto) |
| OQ       | Open Question                        |
| SSOT     | Single Source of Truth               |
| SK       | Starter Kit                          |

---

## Convenciones de Naming

| Tipo              | Convención          | Ejemplo                    |
| ----------------- | ------------------- | -------------------------- |
| Tablas DB         | snake_case, plural  | `match_events`, `group_memberships` |
| Columnas DB       | snake_case          | `commander_damage`, `deleted_at` |
| Variables TS      | camelCase           | `lifeTotal`, `matchId`     |
| Tipos TS          | PascalCase          | `MatchResult`, `Participation` |
| Constantes        | SCREAMING_SNAKE     | `DEFAULT_LIFE_TOTAL`, `MAX_POISON` |
| Componentes RN    | PascalCase          | `LifeCounter`, `MatchTracker` |
| Pantallas (docs)  | P01–P19             | P07 = Match Tracker        |
| Features (docs)   | FT-001 → FT-025     | FT-005 = Match Tracker     |
| Business Rules    | BR-NAMESPACE-NN     | BR-TRACK-04, BR-MATCH-01   |
| Entidades (docs)  | E-001 → E-011       | E-008 = Participation      |
| User Stories      | US-NNN              | US-001 → US-XXX            |

---

## Open Questions

| #     | Pregunta                                                                            | Impacto | Owner   |
| ----- | ----------------------------------------------------------------------------------- | ------- | ------- |
| OQ-01 | ¿"Partner" en la terminología de la app se muestra como "Partner" o "Dual Commander" al usuario? | Low | Cliente |

---

## Assumptions

| #    | Supuesto                                                                            | Si es incorrecto                       |
| ---- | ----------------------------------------------------------------------------------- | -------------------------------------- |
| A-01 | Los 6 valores de color (`W`, `U`, `B`, `R`, `G`, `C`) son exhaustivos para MVP.    | Actualizar si se agregan colores futuro (Saga, etc.) |
| A-02 | Los 8 win conditions del enum cubren todos los casos relevantes de Commander casual. | Agregar si se detectan casos faltantes post-launch. |
| A-03 | "Draw" es una condición válida y deseable en Commander casual (aunque rara en el formato). | Revisar si el cliente quiere eliminarlo. |

---

_Generado por TimeKast Factory — /docs_
