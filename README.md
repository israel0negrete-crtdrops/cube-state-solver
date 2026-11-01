# 3 × 3 cube: from the state to the solution

A browser tool that takes the state of a 3 × 3 cube, entered face by face,
checks whether that state can exist, and proposes two solutions:

- **Short:** the two-phase algorithm. Phase 1 brings the cube to the subgroup
  where every corner and edge is oriented and the four middle edges sit in
  their slice; phase 2 finishes it with top and bottom turns and half turns of
  the sides. Both phases are depth-first searches pruned with distance tables
  (about four million entries, built in the browser in under a second). It
  stops at 20 moves or fewer, or after a second and a half; it is not
  guaranteed to be optimal.
- **In stages:** the way a person solves it. Bottom cross, bottom corners,
  second layer, top cross, top corners oriented, top corners permuted, top
  edges permuted. Except for the cross, each stage uses one named algorithm
  plus top turns, and the code searches for the shortest combination of them.
  About 130 moves on average.

The analysis reports, in order: empty squares, nine squares per color, six
distinct centers, every corner and edge being a real piece (including corners
whose colors run in mirror-image order), no repeated or missing pieces, and
the three invariants every reachable state obeys: corner twist sum divisible
by three, an even number of flipped edges, and equal permutation parity of
corners and edges.

Face turns are not hand-written tables: each one is derived from geometry, by
rotating the 3D position and normal of every sticker. The cubie model is then
read back from those sticker permutations.

Live version: [crtdrops.mx/taller/cubo](https://crtdrops.mx/taller/cubo/).

The code, its comments and the page are in Spanish (the page has an English
toggle); this README is in English.

## Run it

```bash
node js/cubo-calculo.js --prueba     # the tests, no browser (about 12 s)
python3 -m http.server 8000          # then open http://localhost:8000/cubo/
```

The solver runs in a Web Worker, so the page needs to be served, not opened
as a file.

## Files

| Path | What |
|---|---|
| `js/cubo-calculo.js` | the model, the analysis, both solvers and the tests; no screen code |
| `js/cubo-trabajador.js` | the Web Worker that builds the tables and runs both solvers |
| `js/cubo.js` | the page: entering the cube, the analysis list and the step-by-step player |
| `cubo/index.html` | the tool |

## What the tests check

On 200 random scrambles, the sticker model and the cubie model agree in both
directions and the analysis finds nothing wrong. Every last-layer algorithm,
in each of its four orientations, leaves the first two layers alone. The
analysis catches a twisted corner, a flipped edge, two swapped edges, a
mirror-image corner, a wrong color count and an empty square, and accepts a
cube whose six colors are named differently. On 100 more random scrambles,
both solutions solve the cube, and the short one never exceeds 22 moves.

## Notation

U up, D down, R right, L left, F front, B back. A letter alone is a clockwise
quarter turn looking straight at that face; `'` is counterclockwise; `2` is a
half turn.

## License

Code: MIT (`LICENSE`). The site's design (CSS and logo) is included only so
the page renders; it is not part of the MIT license.
