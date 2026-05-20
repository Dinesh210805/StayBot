# Hero Frame Sequence

Drop the 180 JPEG frames extracted from the Veo-generated hero video here.

## Naming convention
```
frame_001.jpg
frame_002.jpg
...
frame_180.jpg
```

(Three-digit zero-padded, 1-indexed.)

## How to extract from Veo MP4

After Veo generates `hero.mp4` (8s @ 24fps, 1280×720):

```bash
ffmpeg -i hero.mp4 -vf "fps=22.5,scale=1280:720" -q:v 4 frame_%03d.jpg
```

That yields exactly 180 frames. Move them into this folder.

## Mobile fallback

Place the original MP4 at `public/hero-fallback.mp4`. The component
auto-switches to `<video>` playback on `(max-width: 768px), (pointer: coarse)`
and on `prefers-reduced-motion: reduce`.

## Veo prompt

See the plan file at `~/.claude/plans/pure-snuggling-hollerith.md` — section
"Veo video prompts → Prompt 1 — Hero scroll sequence".

## Placeholder behaviour

Until frames arrive, the `<HeroSequence>` component renders a warm
cream-to-terracotta gradient with a vignette on the canvas, so the layout
and scroll mechanics work end-to-end during development.
