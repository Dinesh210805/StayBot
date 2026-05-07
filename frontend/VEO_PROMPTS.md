# StayBot — AI Video & Image Generation Prompts

Use these prompts when you want unique AI-generated assets for the site. Where stock photography is sufficient, the codebase already references Unsplash URLs. Place generated assets in `public/videos/` or `public/images/` and update the matching `Image`/`video` `src` in the components.

---

## 1. Hero background loop (Veo / Sora / Runway)

**Where it goes:** `public/videos/hero-bg.mp4` — referenced as a subtle background on the home hero section. Should loop seamlessly. Aim for 10–14s, very low motion (parallax suggests the rest).

**Prompt:**
```
Cinematic slow aerial drift over a quiet, warmly-lit travel scene at the magic hour just after sunset. The frame moves like a gentle dolly forward — one continuous, unbroken take. We see suggestions of three places blended into one dreamlike wander: golden lantern light reflecting on dark water, fog curling over an old stone bridge at dusk, and a flat-topped mountain rising above a coastline as the last sun strikes it. Tones are deep navy-teal in the shadows, warm amber and burnt orange in the highlights. Fine atmospheric haze. 35mm film grain. Anamorphic lens flare. Shallow depth of field. No people, no text, no logos. Slow, contemplative, editorial. 16:9, 24fps. Color grade: warm-cool tension — cool deep shadows, warm specular highlights. Loopable.
```

**Negative / avoid:** people, text overlays, logos, fast motion, jump cuts, harsh modern colors, neon, cartoon, low-res, watermarks.

---

## 2. Welcome loader background (optional ambient layer)

**Where it goes:** could replace the static SVG silhouettes in `WelcomeLoader.tsx` if you want richer visuals. Keep it subtle — the loader is short.

**Prompt:**
```
A slow, almost still wide shot of three travel scenes morphing into one another like memory: a gold-tipped Bangkok temple silhouette at dawn, a foggy Thames riverside with the silhouette of Big Ben, then Table Mountain with the Atlantic at its feet. Each transition is a soft cross-dissolve through warm golden particles drifting like dust in a sunbeam. Deep navy background, warm amber accents. 35mm grain. No people, no text, no logos. 16:9, 8 seconds total, 3 scenes ~2.5s each.
```

---

## 3. City hero — Bangkok (`destinations/bangkok`)

Optional richer hero video. Currently uses a still image at the URL `https://images.unsplash.com/photo-1563492065599-3520f775eeed`. Replace with a 12s loop if you want.

**Prompt:**
```
Cinematic 12-second slow push-in over Wat Arun temple in Bangkok at the moment of sunset, with the Chao Phraya river in the foreground reflecting amber and orange. A single longtail boat glides slowly left to right, leaving a soft wake. Steam from a riverside food stall drifts up into the warm air. Sky is layered: deep teal at the top, hot amber-pink at the horizon. Camera is slow, contemplative, anamorphic lens flare on the temple spire. 35mm film grain, color grade leans warm with cool deep shadows. No people in foreground. 16:9, 24fps, loopable.
```

---

## 4. City hero — London (`destinations/london`)

**Prompt:**
```
A slow cinematic dolly-along-the-Thames at first light. The river is mirror-still, layered with low fog. Big Ben is just visible through the haze, the bridge wrought-iron silhouettes resolve into clarity as we drift past them. The light is silver and warm-amber where the rising sun catches the upper stories of the city. A single black taxi crosses the bridge in the distance. 35mm film grain, anamorphic, very low motion. Color: cool blue-silver shadows, warm gold highlights. No people, no text, no logos. 16:9, 12 seconds, 24fps, loopable.
```

---

## 5. City hero — Cape Town (`destinations/cape-town`)

**Prompt:**
```
A slow aerial drift along the Atlantic seaboard of Cape Town at golden hour. Table Mountain looms on the right, its flat top crowned with the famous "tablecloth" cloud. The ocean below is the deep blue-green of the Atlantic with white spray on the rocks. We pass over Camps Bay's pale beach. Light is warm and low. Fynbos and palm fronds catch the breeze. 35mm film grain, anamorphic flares on the mountain ridge. Color: warm sunlight on stone, deep teal-blue water. No people, no text, no logos. 16:9, 12 seconds, loopable.
```

---

## 6. Property still images (alternative to Unsplash)

If you want unique, on-brand interior photography, use a still-image model (Imagen, Midjourney, FLUX) with prompts like:

**Bangkok loft:**
```
Editorial interior photograph of a small modern loft in Bangkok at dusk. Floor-to-ceiling windows, distant gold temple spires visible. Warm wood floors, low brass lamps, an unmade linen bed. Atmospheric haze, color grade lean warm-amber with deep teal shadows. 35mm, shallow DOF, no people. Magazine-quality.
```

**London townhouse:**
```
Editorial interior photograph of a Marylebone townhouse bedroom at first light. Tall sash windows opening to a quiet street, soft fog visible through the glass. Antique brass bedframe, dark green walls, vintage rug. Color grade: cool silver light, warm interior accents. Shallow DOF, no people, magazine-quality.
```

**Cape Town home:**
```
Editorial interior photograph of a Camps Bay holiday home at sunset. Wraparound windows facing the Atlantic, Table Mountain just visible to the side. Cream linen sofas, raw timber, a stone fireplace. Color grade: warm sunlight, deep ocean blue-green outside. Shallow DOF, no people, magazine-quality.
```

---

## 7. Audio (optional, Suno / ElevenLabs)

For the welcome loader or hero, a 6–10 second audio bed works wonders:

**Prompt (Suno):**
```
Cinematic, contemplative, very slow ambient with one warm piano note repeating, faint marimba shimmer, distant low strings, soft tape hiss. Loopable. 60 BPM. Travel-documentary opening title energy. Warm but cool. 8 seconds.
```

---

## Asset placement reference

| Component                                  | Asset                                                        |
| ------------------------------------------ | ------------------------------------------------------------ |
| `src/components/fx/WelcomeLoader.tsx`      | Optional video at `public/videos/welcome.mp4` (currently SVG) |
| `src/app/page.tsx` (hero)                  | `public/videos/hero-bg.mp4` (optional — section uses still)  |
| `src/lib/destinations.ts` (city `hero`)    | Replace Unsplash URL with `/videos/<city>.mp4`               |
| `src/lib/destinations.ts` (`gallery[]`)    | Replace with `/images/<city>-N.jpg`                          |

When swapping a still for a video, change `<Image>` to `<video autoPlay muted loop playsInline>` in the hero component for that section.

---

## Generation notes

- Keep all clips under 15 seconds — they need to loop seamlessly.
- Aim for low motion. Most of the visual energy comes from scroll, not the video itself.
- Always grade warm-cool: cool deep shadows, warm highlights. This unifies the site.
- Avoid people, signage, modern logos, and text in frame — they date the asset.
- Render at 1920×1080 (or higher), then export an h.264 MP4 at ~5 Mbps for the web.
