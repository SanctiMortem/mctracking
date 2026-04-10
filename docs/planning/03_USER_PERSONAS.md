# 👥 User Personas — MTG Commander Tracker

> Generado desde Discovery Brief §2 por `/docs`
> **Fuente:** `docs/planning/00_DISCOVERY_BRIEF.md`
> **SSOT:** Este documento para roles, perfiles y permisos.
> **Versión:** 1.0 — 2026-04-09

---

## Resumen de Roles

| Rol           | ID    | Descripción                                               | Contexto     | Persistencia |
| ------------- | ----- | --------------------------------------------------------- | ------------ | ------------ |
| Guest         | P-001 | Usuario sin cuenta. Tracking básico sin persistencia.     | Sesión local | Ninguna      |
| User          | P-002 | Usuario autenticado. Acceso completo a features.          | Cloud (Neon) | Cloud        |
| Group Member  | P-003 | Miembro invitado de un grupo. DB compartida del grupo.    | Cloud (Neon) | Cloud        |
| Group Owner   | P-004 | Creador del grupo. Control total sobre el grupo.          | Cloud (Neon) | Cloud        |

> **Nota:** P-002, P-003 y P-004 no son mutuamente excluyentes. Un usuario autenticado (P-002) puede ser simultáneamente Group Member (P-003) en un grupo y Group Owner (P-004) en otro.

---

## P-001: Guest (Usuario sin cuenta)

### Perfil

| Atributo              | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| **Descripción**       | Jugador ocasional que quiere trackear una partida rápida sin crear una cuenta. |
| **Demografía**        | Cualquier edad. Jugador de MTG Commander, casual o competitivo. |
| **Nivel técnico**     | Bajo–Medio                                                    |
| **Frecuencia de uso** | Esporádica (invitado a una partida puntual)                   |
| **Dispositivo**       | El dispositivo de alguien más o el propio                     |
| **Motivación**        | Empezar a jugar lo antes posible, sin fricción de registro    |

### Jobs To Be Done (JTBD)

1. **Cuando** me siento a jugar Commander con amigos **quiero** trackear los puntos de vida sin tener que crear una cuenta **para** no interrumpir el flujo de inicio de partida.
2. **Cuando** llego a 0 de vida o recibo 21 de commander damage **quiero** que la app lo muestre visualmente **para** saber cuándo se activa la condición de pérdida.
3. **Cuando** termina la partida **quiero** que los datos desaparezcan **para** no tener que preocuparme por privacidad ni cleanup.

### Pain Points

1. Las apps de tracking requieren login antes de mostrar cualquier cosa.
2. Configurar un match tarda más que los primeros turnos.
3. No quiere que sus datos queden guardados en el dispositivo de alguien más.

### Escenario de Uso

> Ana llega a casa de un amigo para jugar Commander. No tiene la app instalada o no tiene cuenta. Abre la app, elige "Continuar sin cuenta", configura 4 secciones de vida en segundos, y empieza a trackear life totals durante la partida. Al terminar, cierra la app y los datos se descartan automáticamente.

### Permisos

| Acción                                    | Permitido |
| ----------------------------------------- | --------- |
| Match tracking básico (life, poison, cmd damage) | ✅   |
| Tracking sin decks registrados (Guest Tracker P19) | ✅  |
| Crear/editar jugadores                    | ❌        |
| Crear/editar decks                        | ❌        |
| Ver historial de matches                  | ❌        |
| Ver stats                                 | ❌        |
| Unirse a grupos                           | ❌        |
| Cambiar settings                          | ❌        |
| Comprar Premium                           | ❌        |

---

## P-002: User (Usuario Autenticado)

### Perfil

| Atributo              | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| **Descripción**       | Jugador de Commander que registra sus partidas y lleva estadísticas personales. |
| **Demografía**        | 18–35 años. Fan de Magic: The Gathering. Juega con amigos regularmente. |
| **Nivel técnico**     | Medio                                                         |
| **Frecuencia de uso** | Semanal (1–3 partidas por semana)                             |
| **Dispositivo**       | Propio (iOS o Android)                                        |
| **Motivación**        | Quiere saber con qué deck y commander gana más, y compararse con sus amigos. |

### Jobs To Be Done (JTBD)

1. **Cuando** empiezo una partida **quiero** configurar el match con mis decks registrados **para** que el historial quede guardado automáticamente.
2. **Cuando** termina una partida **quiero** registrar quién ganó y con qué condición **para** tener un historial exacto.
3. **Cuando** reviso mis stats **quiero** ver mi win rate por deck y por commander **para** saber cuál es mi setup más fuerte.
4. **Cuando** quiero trackear con amigos que no tienen la app **quiero** poder registrarlos como jugadores en mi cuenta **para** incluirlos en el historial.

### Pain Points

1. Pierde la cuenta de los puntos de vida cuando se distrae durante la partida.
2. No recuerda cuántas veces ganó con un deck específico.
3. Sus amigos usan diferentes apps o papeles, lo que hace imposible llevar stats compartidas.

### Escenario de Uso

> Carlos abre la app en su iPhone antes de una partida. Selecciona "Nuevo Match", elige a los 4 jugadores de su grupo y asigna el deck a cada uno. Durante la partida, toca en su sección para cambiar su vida. Al terminar, registra el ganador y la win condition (Commander Damage). Después revisa su perfil y ve que su deck Atraxa subió a 60% de win rate.

### Permisos

| Acción                                                    | Permitido          |
| --------------------------------------------------------- | ------------------ |
| Match tracking completo (con decks registrados)           | ✅                 |
| Crear/editar/soft-delete jugadores (personales)           | ✅                 |
| Crear/editar/soft-delete decks (personales)               | ✅                 |
| Crear/editar commanders                                   | ✅                 |
| Crear match (con decks registrados)                       | ✅                 |
| Ver historial de matches                                  | ✅                 |
| Ver stats (propias)                                       | ✅                 |
| Cambiar settings                                          | ✅                 |
| Comprar Premium (quitar ads)                              | ✅                 |
| Crear/unirse a grupos                                     | ✅ (via FT-017)   |
| Invitar miembros al grupo                                 | ❌ (solo Group Owner) |
| Eliminar/archivar grupo                                   | ❌ (solo Group Owner) |

---

## P-003: Group Member (Miembro de Grupo)

### Perfil

| Atributo              | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| **Descripción**       | Jugador autenticado que forma parte de un grupo de amigos con base de datos compartida. |
| **Demografía**        | Mismo perfil que P-002. Es un P-002 en contexto de grupo.    |
| **Nivel técnico**     | Medio                                                         |
| **Frecuencia de uso** | Semanal (partidas con el grupo)                               |
| **Dispositivo**       | Propio                                                        |
| **Motivación**        | Participar en el historial y stats compartidas del grupo.     |

### Jobs To Be Done (JTBD)

1. **Cuando** entro al grupo **quiero** ver los decks, jugadores y stats del grupo **para** tener contexto de la historia del grupo.
2. **Cuando** creo un deck en el grupo **quiero** que esté disponible para todos los miembros **para** que cualquiera pueda usarlo en un match.
3. **Cuando** alguien registra un match en el grupo **quiero** que aparezca en mi historial también **para** no perder ninguna partida del registro.

### Pain Points

1. En grupos grandes, es difícil saber qué pasó en las partidas en las que no estuvo presente.
2. Quiere contribuir con decks y jugadores al pool compartido sin pedir permiso constantemente.

### Escenario de Uso

> Miguel recibió un link de invitación de su amigo Carlos (P-004). Acepta la invitación, entra al grupo "Los Comandantes", y ve el historial de las últimas 15 partidas del grupo. Agrega su deck nuevo al pool del grupo para la próxima sesión.

### Permisos

| Acción                                                    | Permitido |
| --------------------------------------------------------- | --------- |
| Todo lo de P-002 (en contexto personal)                   | ✅        |
| Crear/editar jugadores del grupo                          | ✅        |
| Crear/editar decks del grupo                              | ✅        |
| Ver historial completo del grupo                          | ✅        |
| Ver stats del grupo                                       | ✅        |
| Invitar nuevos miembros                                   | ❌        |
| Eliminar/archivar el grupo                                | ❌        |
| Expulsar miembros                                         | ❌        |

---

## P-004: Group Owner (Dueño del Grupo)

### Perfil

| Atributo              | Valor                                                         |
| --------------------- | ------------------------------------------------------------- |
| **Descripción**       | El "organizador" del grupo. Creó el grupo y gestiona a los miembros. |
| **Demografía**        | Mismo perfil que P-002. Generalmente quien introduce la app al grupo. |
| **Nivel técnico**     | Medio–Alto                                                    |
| **Frecuencia de uso** | Semanal (organiza las sesiones)                               |
| **Dispositivo**       | Propio                                                        |
| **Motivación**        | Mantener un registro limpio y organizado de todas las partidas del grupo. |

### Jobs To Be Done (JTBD)

1. **Cuando** formo un grupo nuevo **quiero** invitar a mis amigos por email o link **para** que todos tengamos la misma base de datos.
2. **Cuando** un miembro ya no juega con nosotros **quiero** poder gestionarlo **para** mantener el grupo actualizado.
3. **Cuando** el grupo quiere un nuevo nombre o configuración **quiero** poder editarlo **para** mantener el grupo organizado.

### Pain Points

1. Nadie en el grupo quiere ser el "administrador", pero alguien tiene que llevar el registro.
2. Compartir stats con amigos que no quieren crear cuenta es frustrante.

### Escenario de Uso

> Carlos crea un grupo llamado "Los Comandantes", genera un link de invitación y lo comparte en el chat de WhatsApp del grupo. Cuando alguien acepta, aparece en la lista de miembros. Carlos puede ver todas las stats globales del grupo y generar el link de invitación nuevamente si el anterior expiró.

### Permisos

| Acción                                                    | Permitido |
| --------------------------------------------------------- | --------- |
| Todo lo de P-003 (Group Member)                           | ✅        |
| Invitar miembros al grupo (email / link)                  | ✅        |
| Generar nuevo link de invitación                          | ✅        |
| Eliminar/archivar el grupo                                | ✅        |
| Gestionar membresías                                      | ✅        |

---

## Matriz de Permisos Completa (RBAC)

> Ver reglas detalladas en `05_BUSINESS_RULES.md §BR-AUTH` y `§BR-GROUP`.

| Acción                              | P-001 Guest | P-002 User | P-003 Member | P-004 Owner |
| ----------------------------------- | :---------: | :--------: | :----------: | :---------: |
| Match tracking básico (life/poison/cmd) | ✅       | ✅         | ✅           | ✅          |
| Match tracking con decks registrados | ❌        | ✅         | ✅           | ✅          |
| Crear jugadores (personal)          | ❌          | ✅         | ✅           | ✅          |
| Crear decks (personal)              | ❌          | ✅         | ✅           | ✅          |
| Crear commanders                    | ❌          | ✅         | ✅           | ✅          |
| Ver historial propio                | ❌          | ✅         | ✅           | ✅          |
| Ver historial del grupo             | ❌          | ❌         | ✅           | ✅          |
| Ver stats propias                   | ❌          | ✅         | ✅           | ✅          |
| Ver stats del grupo                 | ❌          | ❌         | ✅           | ✅          |
| Crear jugadores del grupo           | ❌          | ❌         | ✅           | ✅          |
| Crear decks del grupo               | ❌          | ❌         | ✅           | ✅          |
| Cambiar settings                    | ❌          | ✅         | ✅           | ✅          |
| Comprar Premium                     | ❌          | ✅         | ✅           | ✅          |
| Invitar miembros al grupo           | ❌          | ❌         | ❌           | ✅          |
| Eliminar/archivar grupo             | ❌          | ❌         | ❌           | ✅          |
| Generar nuevo link de invitación    | ❌          | ❌         | ❌           | ✅          |

---

## Auth Providers Soportados (P-002 / P-003 / P-004)

| Provider         | Tipo                   | Notas                                                       |
| ---------------- | ---------------------- | ----------------------------------------------------------- |
| Email / Password | Registro manual        | —                                                           |
| Google           | OAuth                  | —                                                           |
| Apple Sign In    | OAuth                  | Obligatorio en App Store si se ofrece autenticación social. |
| Magic Link       | Email link sin password | —                                                          |

> Si el mismo email está registrado con un provider diferente → error + sugerir provider original. No auto-merge de cuentas (BR-AUTH-05).

---

## Flujo de Onboarding por Rol

### P-001 Guest

1. Abrir app → pantalla de bienvenida (P16).
2. Tap "Continuar sin cuenta".
3. Ir a Guest Tracker (P19) — sin setup adicional.
4. Al cerrar sesión: datos descartados.

### P-002 User (nuevo)

1. Abrir app → pantalla de bienvenida (P16).
2. Seleccionar provider de auth.
3. Completar registro / login.
4. Ir a Home (P01).
5. Crear jugadores y decks propios para primer match.

### P-003 Group Member (por invitación)

1. Recibir link de invitación (email o chat).
2. Abrir link → app abre en pantalla de aceptación de invitación.
3. Login si no tiene sesión (flujo P-002 si es nuevo).
4. Aceptar invitación → entrar al grupo.
5. Ver historial y recursos del grupo.

### P-004 Group Owner (crea grupo)

1. Completar flujo P-002.
2. Ir a Grupos (P17) → "Crear grupo".
3. Asignar nombre al grupo.
4. Generar link de invitación.
5. Compartir link con amigos.

---

## Open Questions

| #     | Pregunta                                                                    | Impacto     | Owner   |
| ----- | --------------------------------------------------------------------------- | ----------- | ------- |
| OQ-01 | ¿El Guest Tracker (P19) permite ingresar nombres de jugadores ad-hoc o solo muestra secciones numeradas (Jugador 1, 2...)? | Med | Cliente |
| OQ-02 | ¿Hay un flujo de upgrade de Guest → User dentro de la app sin perder el match en curso? | **Alto** | Cliente |
| OQ-03 | ¿Un Group Member puede abandonar el grupo voluntariamente, o solo puede ser removido por el Owner? | Med | Cliente |

---

## Assumptions

| #    | Supuesto                                                                     | Si es incorrecto                               |
| ---- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| A-01 | P-003 y P-004 son roles contextuales dentro de un grupo, no roles globales del sistema. | Ajustar RBAC si se introduce admin global. |
| A-02 | Un usuario puede ser P-004 en un grupo y P-003 en otro simultáneamente.      | Ajustar si se limita a un solo rol por usuario.|
| A-03 | El modo Guest (P-001) no tiene flujo de upgrade mid-match en MVP.            | Requiere diseño adicional si se agrega.        |
| A-04 | Premium no cambia permisos — solo elimina ads. El modelo de permisos es igual para Free y Premium. | Revisar si se gatean features en futuro. |

---

_Generado por TimeKast Factory — /docs_
