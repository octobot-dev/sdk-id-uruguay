# PIS2020

## Metodología de desarrollo

### Sistema de branches y PRs

Al comenzar a trabajar en una feature, se deberá crear una nueva branch desde la branch `develop` con el nombre `feature/nombre-de-la-feature`.
Si se está arreglando un error o bug, la branch deberá llamarse `bugfix/nombre-del-bugfix`.

Una vez finalizado el trabajo en una feature (o bugfix), se deberá crear un Pull Request (PR) a la branch `develop`. Una vez creado el PR, un miembro del Comité .... deberá revisarlo y aprobarlo (o pedirle al desarrollador que se realicen cambios). <b>Solo una vez aprobado el PR es que se debe hacer el merge a `develop`</b>.

La branch `master` está reservada únicamente para releases.
