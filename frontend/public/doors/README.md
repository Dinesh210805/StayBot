# Door Micro-loops

Three short Veo-generated loops, one per "Three Doors" tile on the home page.

## Files expected
```
door-1.mp4   (3s loop — hands typing on phone)
door-2.mp4   (3s loop — pencil annotating a paper map)
door-3.mp4   (4s loop — brass key on a wooden table, steam in background)
```

## Specs
- 1280×720, 24fps, no audio
- Seamless loop (first and last frame should match)
- Warm editorial palette — terracotta, cream, ochre, ink

## Veo prompts

See the plan file at `~/.claude/plans/pure-snuggling-hollerith.md` — Prompts
2, 3, and 4 under "Veo video prompts".

## Placeholder behaviour

Until the videos exist, each `DoorCard` falls back to a warm accent gradient
with a large italic Roman numeral (I / II / III) — the layout still reads
clearly during development.
