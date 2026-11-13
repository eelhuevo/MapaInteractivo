# Ramas del proyecto

Modelo de ramas usado en **UniMap — Mapa Interactivo de Campus**.

## Ramas permanentes

| Rama | Protegida | Para qué sirve |
|------|-----------|----------------|
| `main` | ✅ Sí | Línea base del proyecto. Solo entra código revisado y verificado mediante Pull Request. |
| `beta` | No | Rama de **entrega**: aquí se integra todo el trabajo del equipo para presentarlo. |
| `Version2` | No | Segunda versión en curso (experimental). |

## Ramas temporales (se crean y se borran)

| Prefijo | Se crea desde | Se fusiona en | Uso |
|---------|---------------|---------------|-----|
| `feature/<nombre>` | `main` | `main` | Nueva funcionalidad (una por issue). |
| `fix/<nombre>` | `main` | `main` | Corrección de un error. |
| `docs/<nombre>` | `main` | `main` | Cambios solo de documentación. |

## ¿Dónde van los bugs?

Cada bug usa una rama temporal:

- **Bug normal** → crea `fix/descripcion-del-bug` desde `main`.
- **Bug urgente en producción** → crea `fix/descripcion-del-bug` desde `main` y prioriza su revisión.

## Flujo resumido

1. Crea una rama desde `main` (nunca trabajes directamente en `main`, `beta` ni `Version2`).
2. Commits siguiendo la [convención del proyecto](../CONTRIBUTING.md).
3. Abre un Pull Request hacia `main` y escribe `Closes #NN` en la descripción.
4. Un compañero revisa tu PR (aprobar, comentar o pedir cambios).
5. Tras revisar y aprobar, fusiona en `main` y **borra la rama temporal**.

## Ejemplo de nombres

- `feature/buscador-sin-acentos`
- `fix/ficha-tooltip-cerrada`
- `fix/login-correo-duplicado`
- `docs/manual-de-usuario`
