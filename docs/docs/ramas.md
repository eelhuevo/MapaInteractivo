# Ramas del proyecto

Modelo de ramas (GitFlow) usado en **UniMap — Mapa Interactivo de Campus**.

## Ramas permanentes

| Rama | Protegida | Para qué sirve |
|------|-----------|----------------|
| `main` | ✅ Sí | Producción. Solo se actualiza mediante *merge* de `release/*` o `hotfix/*`. |
| `develop` | No | Integración. Acumula lo que entra en la próxima versión. Parte de `main`. |

## Ramas temporales (se crean y se borran)

| Prefijo | Se crea desde | Se fusiona en | Uso |
|---------|---------------|---------------|-----|
| `feature/<nombre>` | `develop` | `develop` | Nuevas funciones. |
| `bugfix/<nombre>` | `develop` | `develop` | Arreglar bugs **no urgentes**. |
| `hotfix/<nombre>` | `main` | `main` **y** `develop` | Arreglar bugs **urgentes en producción**. |
| `release/<version>` | `develop` | `main` **y** `develop` | Preparar una versión (vX.Y.Z). |

## ¿Dónde van los bugs?

No existe una rama fija de "bugs". Cada bug usa una rama temporal:

- **Bug normal** → crea `bugfix/descripcion-del-bug` desde `develop`.
- **Bug urgente en producción** → crea `hotfix/descripcion-del-bug` desde `main`.

## Flujo resumido

1. Crea una rama desde el punto correcto (`develop` o `main` según el caso).
2. Commits siguiendo la [convención del proyecto](../CONTRIBUTING.md).
3. Abre un Pull Request hacia la rama de origen.
4. Tras revisar y aprobar, fusiona y **borra la rama temporal**.

## Ejemplo de nombres

- `feature/buscador-sin-acentos`
- `bugfix/ficha-tooltip-cerrada`
- `hotfix/login-correo-duplicado`
- `release/v1.2.0`
