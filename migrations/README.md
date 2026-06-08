# migrations

Ordered, append-only schema migrations. Apply in filename order; never edit a
migration that has shipped — add a new one.

```
001_init_schema.sql   tables: worlds, placements, scenes,
                              prefabs, sessions
```

`seeds/` (sibling directory) populates a development dataset and runs **after**
all migrations. The Docker compose stack applies migrations then seeds on first
boot (see `docker/docker-compose.yml`).
