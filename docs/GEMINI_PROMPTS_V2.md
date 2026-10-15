# Gemini V2: pictură + soldați + hartă (prompturi complete)

Jocul folosește acum **placa pictată** ca fundal și desenează deasupra viața (soldați, tabără, foc, daune, vreme). De aceea ai nevoie de imaginile de mai jos. **Toate au prompt complet, de lipit direct.** Fișierele pot fi .jpg sau .png (sau .webp).

**Regula de aur:** lucrezi în același chat, atașezi `docs/reference/style_anchor.jpg` (ancora) la fiecare cerere și începi cu: `Use the attached image only as a style, palette and perspective reference.`

---

## A. PLACA CETĂȚII (cea mai importantă): `assets/img/plate_day.jpg`
Atașează ancora (`style_anchor.jpg`). Cerința e o **editare**: aceeași imagine, dar goală de tabără și de oameni, ca să pun eu viața peste.

```
Edit the attached image. Keep the EXACT same composition, camera angle, framing, castle, stone viaduct bridge, forest, river and misty valley, pixel-for-pixel identical in layout. Make only these changes: (1) remove ALL Ottoman tents, the whole military camp, all campfires, all smoke columns, all horses and all people from the right side of the image, replacing them with empty meadow, a dirt road and scattered trees; (2) remove ALL people from the castle walls, courtyard and bridge; (3) keep the castle roofs, towers, wooden galleries and the arched bridge exactly as they are. Same painterly style, same colors, same morning mist, 16:9. No text, no watermark.
```
Dacă Gemini mută cetatea sau schimbă unghiul, spune-i: *„You changed the composition. Redo it keeping the castle in exactly the same position and size.”* Cetatea trebuie să rămână **în același loc** ca în ancora ta, altfel trebuie să recalibrez pozițiile (pot, dar durează).

## B. PLACA DE NOAPTE: `assets/img/plate_night.jpg`
Atașează **placa de zi** (A) de mai sus, după ce o ai.

```
Edit the attached image. Keep the EXACT same composition and layout. Change only the lighting to deep night: dark blue moonlit sky and mist, cold moonlight on the stone walls and forest, warm orange torchlight glowing in the castle windows, along the wall galleries and in the courtyard, a few warm lights on the bridge. No people, no tents. Same painterly style, 16:9. No text, no watermark.
```

## C. HARTA CAMPANIEI: `assets/img/map.jpg`
```
A hand-painted illustrated fantasy-historical map of the Principality of Moldavia in 1476, viewed from above, old parchment style with soft painterly brush texture: the Carpathian mountains as painted ridges along the west and north-west edge, dense forests, the Siret and Prut rivers as blue-green ribbons running north to south, rolling hills, the Black Sea coast and the Danube delta in the south-east corner, small villages, a muted earthy palette (parchment beige, olive green, ochre, slate blue, oxblood red). Leave all towns and castles OUT and write NO text, no labels, no compass, no scale bar, no legend, no border text (cities will be added by the game). Aspect ratio 5:4. No watermark.
```

---

## D. SOLDAȚI PICTAȚI → `assets/img/units/<nume>.png` (9 fișiere)
Atașează ancora. Fiecare cerere:
```
[PROMPT DE MAI JOS]
```
Fundalul **magenta uniform (#FF00FF)** e obligatoriu: jocul îl taie automat. Dacă Gemini pune umbră sau pământ sub personaj, cere: *„remove the ground and the shadow, keep only the character on flat magenta.”* Nu contează dacă ies cu dimensiuni diferite, le scalez eu.

**`spear.png`**
```
Use the attached image only as a style, palette and perspective reference. a Moldavian man-at-arms: sallet helmet, mail shirt over a blue wool tunic, holding a long spear upright in one hand and a kite shield with a red face in the other. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`archer.png`**
```
Use the attached image only as a style, palette and perspective reference. a Moldavian archer: green wool hood, brown tunic, leather jerkin, a quiver at his hip, drawing a short bow, no helmet. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`militia.png`**
```
Use the attached image only as a style, palette and perspective reference. a Moldavian peasant militiaman: sheepskin cap, undyed wool tunic with a rope belt, holding a wooden club and a small round wooden shield. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`azab.png`**
```
Use the attached image only as a style, palette and perspective reference. an Ottoman azab light infantryman: white turban, red kaftan, holding a curved sword and a round gilded shield. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`akinji.png`**
```
Use the attached image only as a style, palette and perspective reference. an Ottoman akinji raider on foot: tall felt cap with a fur trim, brown leather coat, holding a spear and a short curved bow at his back. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`janissary.png`**
```
Use the attached image only as a style, palette and perspective reference. an Ottoman janissary: tall white felt hat (börk) with a hanging flap, dark blue coat with a red sash, holding a hand-gun (arquebus) and a sword at his hip. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`sapper.png`**
```
Use the attached image only as a style, palette and perspective reference. an Ottoman sapper: brown cap, dirty tunic with rolled sleeves, carrying a pickaxe over one shoulder and a wooden mantlet plank. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`civ.png`**
```
Use the attached image only as a style, palette and perspective reference. a Moldavian peasant man civilian: sheepskin cap, brown wool tunic, carrying a sack on his back, tired expression. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`civ2.png`**
```
Use the attached image only as a style, palette and perspective reference. a Moldavian peasant woman civilian: white headscarf, long red-brown wool dress with an apron, carrying a bundle, tired expression. Single game sprite on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, full body fully visible and centered with margin, portrait 2:3 image, viewed from a high oblique angle (about 50 degrees above, three-quarter top-down) like a strategy game unit, facing to the RIGHT, mid-stride walking pose, painterly style matching the attached reference, small readable silhouette. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```


## E. DECOR ȘI REKVIZITE → `assets/img/sprites/<nume>.png` (12 fișiere)
Aceeași regulă: fundal magenta, aceeași perspectivă oblică. Tabăra crește cu corturile tale (de aceea **corturile contează**), iar bombardele și turnul de asediu înlocuiesc varianta mea simplă.

**`tent_red.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of an Ottoman round conical campaign tent in crimson fabric with a golden finial on top and a dark door flap, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`tent_white.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of an Ottoman round conical campaign tent in cream canvas with a red band and a golden finial, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`pavilion.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of the large crimson and gold Ottoman sultan's pavilion tent with several finials, banners and a dark entrance, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`bombard.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a huge 15th-century Ottoman bronze bombard on a heavy wooden carriage with timber supports and a pile of round stone balls beside it, muzzle pointing to the upper LEFT, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`siege_tower.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a tall wooden Ottoman siege tower with four wheels, covered with wet animal hides, with a drop bridge on top and a red banner, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`rubble_a.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a small pile of broken grey limestone blocks and rubble, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`rubble_b.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a different small pile of broken limestone blocks, charred timber beams and dust, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`fire_barrel.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of an iron basket brazier filled with burning coals on a tripod, flames visible, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`banner.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a Moldavian red war banner on a tall pole with a golden aurochs head emblem, hanging in a gentle wave, viewed from the side. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`house_a.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a Moldavian peasant timber-framed house with white plaster walls and a steep wooden shingle roof, small chimney, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`house_b.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a larger Moldavian farm house with dark log walls and a deep wooden shingle roof, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```

**`church.png`**
```
Use the attached image only as a style, palette and perspective reference. Single game sprite of a small 15th-century Moldavian stone chapel with a steep shingle roof and a small bell turret with a cross, viewed from above at about 50 degrees. On a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges, no ground, no cast shadow, no other objects, whole object visible and centered with margin. Hand-painted digital illustration, grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red), soft natural light, painterly brush texture, no text, no letters, no watermark, no modern objects.
```


---

## Ordinea recomandată (ca să vezi diferența repede)
1. **A. Placa de zi curată.** Fără ea, tabăra pictată din ancoră apare dublu.
2. **D. Cei 3 soldați moldoveni** (`spear`, `archer`, `militia`) și **2 turci** (`azab`, `janissary`). Imediat apar pictați pe ziduri și în asalt.
3. **E. Corturile** (`tent_red`, `tent_white`) și `bombard`, ca să crească tabăra în același stil.
4. **C. Harta.** Sub ea pun eu orașele și oastea Domnului.
5. **B. Placa de noapte**, apoi restul.

## Cum le primesc
Atașează-le în chat într-un singur mesaj (cum ai făcut), cu o listă de nume în ordine, de exemplu: *„1 spear, 2 archer, 3 militia”*. Le salvez, le pun în joc și îți arăt cum arată.
