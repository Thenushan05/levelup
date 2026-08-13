# Exercise Images

Drop exercise photos/illustrations here. Each file is served at `/exercises/<filename>`.

## Naming convention

Name each file after the exercise's `slug` (see `EXERCISE_CATALOG` in [lib/seed.ts](../../lib/seed.ts), or the
slug shown on `/exercises/<slug>` in the app) so it's easy to match a file back to an exercise:

```
public/exercises/incline-dumbbell-press.jpg
public/exercises/lat-pulldown.jpg
public/exercises/cable-face-pull.jpg
```

## Using an image

In **Admin → Templates → New/Edit**, each exercise row has an **Image** field. Enter the path exactly as it
should be requested by the browser, e.g.:

```
/exercises/incline-dumbbell-press.jpg
```

Saving the template writes that path onto the matching `Exercise` document (matched by name), so the image
follows the exercise into every routine that reuses it — not just the one template you edited it from.

Keep files reasonably small (compress to a few hundred KB) since they're served directly, unoptimized, from
`public/`.
