# 3D body model attribution

The interactive body mesh in `human-body.obj` is derived from the `body` group of the MakeHuman Community MPFB2 base mesh distributed inside NAVER's Anny repository.

- Source repository: https://github.com/naver/anny
- Source mesh: https://github.com/naver/anny/tree/main/src/anny/data/mpfb2/3dobjs/base.obj
- Source asset license: CC0 1.0 Universal, confirmed by the source OBJ header and the included `src/anny/data/mpfb2/LICENSE.md`.
- Source asset attribution: Data Collection AB, Joel Palmius, and Jonas Hauquier; MakeHuman Community.
- Modifications: helper geometry was excluded; the human surface was normalized and exported for the Gym Planner's interactive Three.js viewer. The website applies skin-tone and compression-short materials at render time and overlays selectable muscle zones.

The source mesh is released as CC0. Attribution is retained here as a courtesy and provenance record.
