# Image prompts for coffe-new.html

## How to use
1. Open **gemini.google.com** and start a **new chat**. Keep every image in this one chat so the style stays consistent.
2. Paste the **Style** message below first.
3. Then paste each prompt, one at a time. If you don't like a result, say what to change (for example "warmer light", "fewer beans", "less cluttered").
4. Download each image and save it in **`images/originals/`**, renamed to the filename shown (for example `origin-kona.jpg`). PNG or JPG both work.
5. Run **`npm run optimize`**. It makes a web-ready copy (1200px wide, about 100–250 KB) in `images/`.
6. Refresh `coffe-new.html` in the browser. Each image replaces its placeholder automatically.

Start with the **hero**, since it matters most. Any image you haven't made yet stays as a labeled placeholder, so the page never looks broken.

---

## Style: paste this first

```
I'm making a set of photos for a specialty coffee website. Every image in this chat must follow this style:

- Editorial lifestyle photography, like a premium coffee magazine.
- Soft natural daylight from the side, gentle shadows, slight film grain.
- Warm palette: cream, oat, terracotta, caramel and deep espresso brown. Muted, never oversaturated.
- Shallow depth of field, calm and uncluttered composition, plenty of negative space.
- Photorealistic. No text, no logos, no labels, no watermarks, no faces (hands are fine).

Reply "ready" and wait for my image requests.
```

---

## 1. Hero — `hero.jpg` (portrait 4:5) ⭐ do this first

```
Image 1, portrait 4:5 aspect ratio.
A handmade matte ceramic espresso cup in warm off-white, on a matching saucer, filled with espresso with thick golden-brown crema and a small heart of latte art. A thin wisp of steam. A few roasted coffee beans scattered nearby. Set on a light oak table against a plain cream plaster wall. Shot from a three-quarter angle slightly above. Subject centered in the lower half, with calm empty space above it.
```
Shown in an arch-shaped frame, so keep the cup centered.

---

## 2. Process: harvest — `process-harvest.jpg` (portrait 4:5)

```
Image 2, portrait 4:5 aspect ratio.
Close-up of two weathered hands cupping a pile of freshly picked ripe red and a few yellow coffee cherries. Blurred green coffee plant leaves in the background, soft morning sun filtering through.
```

## 3. Process: roast — `process-roast.jpg` (portrait 4:5)

```
Image 3, portrait 4:5 aspect ratio.
Freshly roasted medium-brown coffee beans pouring out of a vintage cast-iron drum roaster into a round cooling tray, with a little motion blur on the falling beans and a faint haze of smoke. Warm workshop light.
```

## 4. Process: cup — `process-cup.jpg` (portrait 4:5)

```
Image 4, portrait 4:5 aspect ratio.
A pour-over coffee being brewed: a ceramic dripper on a clear glass server, a thin stream of water from a gooseneck kettle, coffee dripping into the glass. On a light linen surface near a window.
```

---

## 5–11. Origins (portrait 4:5)

Use the same opening line for each: **"Image N, portrait 4:5 aspect ratio. Landscape photo, in the same style, of…"**

**5. `origin-kona.jpg`**
```
Image 5, portrait 4:5 aspect ratio. Landscape photo, in the same style, of rows of glossy coffee trees on the dark volcanic slopes of Kona, Hawaii, with the Pacific Ocean hazy in the distance and soft late-afternoon light.
```

**6. `origin-blue-mountain.jpg`**
```
Image 6, portrait 4:5 aspect ratio. Landscape photo, in the same style, of steep green coffee terraces in Jamaica's Blue Mountains, with soft morning mist rolling through the valleys.
```

**7. `origin-huila.jpg`**
```
Image 7, portrait 4:5 aspect ratio. Landscape photo, in the same style, of a small coffee farm in a deep Andean valley in Huila, Colombia. Lush green slopes, a few banana plants for shade, and dramatic mountain ridges behind.
```

**8. `origin-sul-de-minas.jpg`**
```
Image 8, portrait 4:5 aspect ratio. Landscape photo, in the same style, of long curving rows of coffee plants across rolling hills in Sul de Minas, Brazil, with red earth between the rows and golden-hour light.
```

**9. `origin-yirgacheffe.jpg`**
```
Image 9, portrait 4:5 aspect ratio. Landscape photo, in the same style, of red coffee cherries drying on raised wooden African beds in Yirgacheffe, Ethiopia, with green highland hills and tall trees behind.
```

**10. `origin-nyeri.jpg`**
```
Image 10, portrait 4:5 aspect ratio. Landscape photo, in the same style, of coffee shrubs heavy with red cherries in Nyeri, Kenya, with the distant snow-capped peak of Mount Kenya in soft light.
```

**11. `origin-gayo.jpg`**
```
Image 11, portrait 4:5 aspect ratio. Landscape photo, in the same style, of shade-grown coffee under tall trees in the misty Gayo Highlands of Sumatra, with a calm highland lake glimpsed in the background.
```

---

## 12. Roast guide — `roast-levels.jpg` (wide 16:9)

```
Image 12, wide 16:9 aspect ratio.
Overhead flat-lay of four neat piles of coffee beans in a row on a cream linen surface, from left to right: light cinnamon-brown, medium brown, dark chocolate brown with a slight sheen, and very dark almost-black oily beans. Even spacing, soft daylight, lots of clean space around them.
```
On wide screens this is shown at about 16:7, so keep the four piles across the middle.

---

## 13. Join the club — `cta.jpg` (wide 16:9)

```
Image 13, wide 16:9 aspect ratio.
A cozy, slightly darker scene: a coffee subscription box opened on a wooden table, with kraft-paper coffee bags with no labels or text, a cup of black coffee, scattered beans, and warm evening window light. Moody and inviting, with darker tones, because white text will be placed on top.
```
A dark overlay goes on top of this one, so moody and darker images work best.

---

## Tips
- If Gemini ignores the aspect ratio, ask it to "make this exactly 4:5 portrait" (or 16:9).
- If the colors drift between images, say "match the colors and light of image 1".
- Don't put Gemini downloads straight into `images/`. They're about 3 MB each and slow the page down. Always go through `images/originals/` and `npm run optimize`.
