# Ghid de asset-uri: Gemini (imagini) și ElevenLabs (sunet)

Jocul **rulează complet și fără asset-uri** (totul e desenat procedural). Asset-urile de mai jos sunt **opționale**, dar îl fac mult mai bun.
Pune fișierele exact în folderele și cu numele de mai jos; jocul le detectează singur.

> Prompturile sunt în engleză (modelele de imagine și sunet răspund mai bine). Explicațiile sunt în română.

---------------------------------------------------------------------------------------------------

## 0. Ce e istoric și ce e inventat (ca să știi ce ceri)

**Documentat (surse publice: Wikipedia „Neamț Citadel”, „Siege of Neamț Citadel”, pagini de turism și istorie):**
- Cetatea Neamț a fost ridicată sub **Petru I Mușat** (sf. sec. XIV), pe un deal deasupra văii Neamțului (Târgu Neamț), în zona de dealuri subcarpatice împădurite.
- Fortul inițial („cetatea mușatină”) are plan **patrulater neregulat**, ziduri groase de aprox. **2–3 m**, înalte inițial de **12–15 m**, cu **18 contraforturi prismatice** în exterior.
- Are **patru turnuri de colț**, construite **în linia zidului**, nu ieșite în afară (spre deosebire de Suceava și Șcheia).
- **Poarta Mușatină** e în mijlocul zidului dinspre nord. Acolo era un **șanț de apărare** și un **pod arcuit pe 11 piloni de piatră**, cu o **secțiune mobilă** (pod ridicător) lângă poartă.
- **Ștefan cel Mare** a ridicat zidurile cu 6–7 m, a adăugat **un al doilea brâu de ziduri cu 4 bastioane semicirculare** (pe latura porții), o curte exterioară și a adâncit șanțul.
- Înăuntru: capelă, încăperi de locuit și sală de consiliu, magazii, ateliere, arsenal. (Nu există dovezi pentru un „donjon” clasic, așa că jocul nu are.)
- **Războieni (Valea Albă)**, 26 iulie 1476: victorie otomană. Cetatea Neamț **a rezistat** asediului lui Mehmed II (august 1476), iar sultanul s-a retras.

**Simplificat / inventat de joc (e ok, dar nu pretinde că e documentat):** durata de 30 de zile, cele 7 valuri, cele 4 sectoare de apărare, armata și numerele, bombardele exacte, prezența pavilionului sultanului la Neamț, sosirea oastei lui Ștefan în ziua 30, evenimentele personale.

**Reguli de acuratețe pentru imagini:** niciun element modern, fără armuri complete gotice de plăci (în Moldova sec. XV: zale, brigantine, coifuri de tip „sallet”/ceaun, scuturi, arcași, arcabuzieri, țărani cu **căciuli** de oaie și haine de lână). Turci: **ienicerii** cu „börk” alb, **azabi** (infanterie ușoară, turbane), **akinji** (călăreți ușori), **sipahi**, sapatori, **bombarde mari** de bronz/fier care trag cu ghiulele de piatră. Steag moldovenesc: câmp **roșu** cu **cap de zimbru**, stea între coarne, soare și semilună, în auriu. Steag otoman: roșu cu semilună.

> Notă: planurile exacte ale cetății se discută între specialiști. Când folosești Gemini, **atașează 2–3 fotografii reale** ale Cetății Neamț (Wikipedia/Commons) ca referință, ca să nu inventeze un castel generic din Europa de Vest.

---------------------------------------------------------------------------------------------------

## 1. Gemini: cum lucrezi ca să iasă consistent

1. Folosește generarea de imagini din Gemini (modelul de imagine, „Nano Banana”/Imagen, cel disponibil în contul tău).
2. **Lucrează într-un singur chat** pentru toate imaginile, ca stilul să rămână același.
3. Generează întâi **imaginea-ancoră de stil** (secțiunea 1.1). Când ești mulțumit, o atașezi la **fiecare** cerere următoare cu fraza:
   *„Use the attached image only as a style and color-palette reference. Same painterly style, same palette, same lighting.”*
4. Pentru fiecare asset cere **3–4 variante** și alege-o pe cea mai bună.
5. Nu include text, litere, logo-uri în imagine.

### 1.1 Prompt-ul de stil (blocul care se pune la început în ORICE cerere)

Copiază-l ca „STYLE BLOCK”:

```
STYLE BLOCK: hand-painted digital illustration for a grim historical strategy game, muted earthy palette (olive green, ochre, slate grey, oxblood red, dull gold), soft natural light, subtle painterly brush texture, clean readable shapes, slightly stylized proportions, no text, no letters, no watermark, no UI, no modern objects.
```

**Imaginea-ancoră (prima ta cerere):**

```
[STYLE BLOCK] Create a 16:9 style-reference painting: a 15th-century stone fortress on a forested hill in the Carpathian foothills of Moldavia, seen from a high oblique angle (about 50 degrees above the ground, three-quarter top-down view), a river in the valley, an Ottoman military camp with red and cream conical tents on the right, early morning light with a little mist. Historical, grim, atmospheric.
```

### 1.2 Blocul istoric al cetății (se adaugă la imaginile cu cetatea)

```
FORTRESS FACTS: Neamț Fortress, Moldavia, 1476. Irregular four-sided stone fort with thick pale grey stone walls, 18 shallow rectangular buttresses on the outer walls, four square corner towers built into the wall line (not projecting), wooden shingle roofs, wooden fighting galleries (hoardings) on top of walls. A main gate tower in the middle of the front wall, reached by a long stone arched bridge on stone piers that crosses a deep dry ditch, with a wooden drawbridge section at the gate. In front of the gate wall a second, lower outer wall with FOUR semicircular stone bastions. Inside: a small stone chapel, a timber-roofed council hall, storehouses and workshops around a courtyard. The fort stands on a rocky hill with steep cliffs on one side, surrounded by dense beech and spruce forest.
```

### 1.3 Bloc pentru personaje și armate

```
TROOPS FACTS: Moldavian army 1476: peasant militia in wool tunics and sheepskin caps, men-at-arms in mail shirts, brigandines and sallet helmets with kite shields, archers and early hand-gunners, light cavalry, red banners with a golden aurochs head. Ottoman army: janissaries with tall white felt hats and blue or red coats, azab light infantry with turbans and round shields, akinji raiders on light horses, sipahi cavalry, large bronze bombards firing stone balls, red banners with a white crescent. No plate-armor knights, no cannons smaller than a bombard, no gunpowder muskets in large numbers.
```

---------------------------------------------------------------------------------------------------

## 2. Gemini: lista de asset-uri (în ordinea importanței)

### A. Ilustrații pentru evenimente (cea mai mare diferență vizuală)
- Folder: `assets/img/events/`  · Format JPG, **1280×720 (16:9)**, nume = id-ul evenimentului. Apar sus în fereastra de decizie.
- Șablon:

```
[STYLE BLOCK] [FORTRESS FACTS and/or TROOPS FACTS if relevant] Wide 16:9 cinematic illustration, moody lighting, restrained and non-gory. Scene: <SCENE>
```

| Fișier | `<SCENE>` |
|---|---|
| `smoke.jpg` | Ottoman riders pour into a green valley at dawn, thick smoke rising from burning fields below a stone fortress on a hill |
| `envoy.jpg` | a lone Ottoman envoy on horseback with a white flag stops before the raised drawbridge of a stone fortress, defenders watching from the walls |
| `refugees.jpg` | a column of exhausted peasants with ox-carts, children and goats on a muddy road toward a fortress gate, dust and smoke behind them |
| `bombard.jpg` | a gigantic bronze bombard dragged by oxen and sweating men up a hillside, Ottoman tents behind |
| `prince_rider.jpg` | a mud-spattered Moldavian rider hands a sealed letter with a signet ring to a castellan in a torch-lit gate passage |
| `fever.jpg` | a medieval fortress courtyard with sick people lying on straw, a physician with a cloth over his face, vinegar braziers smoking |
| `traitor.jpg` | a captured steward kneeling in torchlight holding a large iron key, guards gripping his shoulders |
| `hunger.jpg` | bakers show empty grain sacks in a dim stone storehouse, a warhorse watching from the doorway |
| `hunger_alt.jpg` | villagers share a modest feast of bread and roasted meat in a fortress courtyard at dusk, lanterns, quiet relief |
| `mine.jpg` | soldiers in a dark vaulted cellar listening to the ground with bowls of water whose surface ripples |
| `mercy.jpg` | an Ottoman envoy before a fortress gate shows five bound captives kneeling in the dust, Ottoman troops behind |
| `eve.jpg` | a garrison kneeling in prayer along torch-lit fortress walls at night, a priest raising a cross |
| `vigil.jpg` | a twelve-year-old boy on a fortress wall at night looking at the many fires of an enemy camp, a weary soldier beside him |
| `deserters.jpg` | three men with bundles caught by guards at a small postern door at dawn |
| `poisoned_well.jpg` | a stone well in a fortress courtyard, a soldier hesitating to drink, a shadowy stranger slipping away |
| `granary_fire.jpg` | a timber granary on fire at night inside a fortress, a chain of people passing buckets |
| `merchant.jpg` | a merchant with a mule cart slips through a night gate lit by one torch |
| `rain.jpg` | a fortress courtyard in warm rain, people laughing with faces turned up, cisterns overflowing |
| `children.jpg` | hungry orphans waiting at a kitchen door while the cook stands with an empty ladle |
| `procession.jpg` | a priest and soldiers carry an icon along a fortress wall-walk with banners, distant enemy archers |
| `spy.jpg` | a stranger in fine boots pacing out distances along a wall, guards watching from the shadows |
| `prisoners.jpg` | wounded Ottoman light cavalry prisoners sitting against a wall, guards watching, somber |
| `mercy_killing.jpg` | a physician kneels by a wounded soldier on a pallet in candlelight, quiet and somber, no visible wounds |
| `comet.jpg` | a bright comet over an Ottoman camp at night, soldiers on a fortress wall pointing at the sky |
| `hoard.jpg` | soldiers discovering sacks of hidden grain in a nobleman's chamber, the noble protesting |
| `bell.jpg` | a bronze bell lowered from a wooden chapel belfry, a blacksmith waiting beside a glowing furnace |
| `veteran.jpg` | a one-eyed old soldier with a spear speaks to a dozen grim volunteers at night, torches |
| `taunt.jpg` | stakes with trophies of war outside a fortress at dawn, only silhouettes, no gore, Ottoman horsemen far away |
| `defector.jpg` | a man crawls at the foot of a wall at night while a rope is lowered to him |
| `wolves.jpg` | wolves moving among the fallen on a battlefield at dusk, restrained, silhouettes, no gore |
| `mutiny.jpg` | militiamen laying down their spears in a courtyard while a stubborn farmer faces the castellan |
| `inspector.jpg` | a boyar in a fur-trimmed coat reads a parchment chronicle at a desk, a quill and inkpot, an anxious castellan watching |

### B. Imagini de final
- Folder: `assets/img/endings/` · JPG **1280×720**: `victory.jpg`, `bitter.jpg`, `fall.jpg`, `mutiny.jpg`.

| Fișier | `<SCENE>` |
|---|---|
| `victory.jpg` | red banners with a golden aurochs head crest a ridge at dawn, the Ottoman camp breaking up in the valley, a battered fortress still standing |
| `bitter.jpg` | the Ottoman army withdrawing over misty hills at dawn, a battered fortress standing silent, smoke, no relief army in sight |
| `fall.jpg` | a fortress with broken walls burning at dusk, Ottoman banners entering the gate, grim and sorrowful |
| `mutiny.jpg` | the fortress gate opened from within at night, torch-lit figures lifting the bar, a lone castellan watching |

### C. Texturi (tileable) — pentru ziduri, pământ, acoperișuri
- Folder: `assets/img/tex/` · JPG **512×512**, **fără cusături** (seamless/tileable). Fișiere: `grass.jpg`, `dirt.jpg`, `rock.jpg`, `stone.jpg`, `shingle.jpg`, `wood.jpg`.
- Șablon:

```
Seamless tileable 512x512 texture, perfectly flat top-down orthographic view, no perspective, no shadows, no objects, even lighting, muted painterly style, no text. Texture: <TEXTURE>
```

| Fișier | `<TEXTURE>` |
|---|---|
| `grass.jpg` | meadow grass in late summer with subtle olive, green and straw tones |
| `dirt.jpg` | packed trampled earth with small pebbles, brown and ochre |
| `rock.jpg` | rough grey-brown limestone cliff rock with cracks |
| `stone.jpg` | pale grey rough-cut limestone masonry wall, irregular courses, lime mortar joints |
| `shingle.jpg` | weathered brown wooden roof shingles in overlapping rows |
| `wood.jpg` | weathered oak planks, dark brown |

**Test de tiling:** pune imaginea de 4 ori într-un grid 2×2 într-un editor (sau cere-i lui Gemini să o repete); dacă se văd cusături, regenerează cu „make it seamless and tileable, edges must match”.

### D. Sprite-uri (fundal magenta) — opțional, înlocuiesc elementele desenate procedural
- Folder: `assets/img/sprites/` · PNG sau JPG-redenumit-PNG, **1024×1024**, **fundal magenta uniform #FF00FF**. Jocul scoate singur magenta și taie marginile.
- Șablon:

```
[STYLE BLOCK] A single game sprite of <OBJECT>, viewed from above at about 50 degrees (three-quarter top-down oblique view, same camera angle for all sprites), the whole object visible and centered with margin, NO ground, NO cast shadow, NO other objects, on a perfectly flat solid pure magenta background (#FF00FF), crisp clean edges.
```

| Fișier | `<OBJECT>` |
|---|---|
| `tent_red.png` | an Ottoman round conical campaign tent in crimson red fabric with a golden finial on top |
| `tent_white.png` | an Ottoman round conical campaign tent in cream-colored canvas with a red band and a golden finial |
| `pavilion.png` | the large crimson and gold Ottoman sultan's pavilion tent with several finials and a dark entrance |
| `bombard.png` | a huge 15th-century Ottoman bronze bombard on a heavy wooden carriage with timber supports, muzzle pointing to the upper left, stone balls beside it |
| `siege_tower.png` | a tall wooden Ottoman siege tower on four wooden wheels, covered with wet animal hides, with a red banner on top |
| `house_a.png` | a Moldavian peasant timber-framed house with white plaster walls and a steep wooden shingle roof, small chimney |
| `house_b.png` | a larger Moldavian farm house with a dark wooden log lower wall and a deep shingle roof |
| `church.png` | a small 15th-century Moldavian stone chapel with a steep wooden shingle roof and a small bell turret with a cross |

### E. (Opțional) Icoane UI
Nu sunt necesare acum (folosim emoji), dar pentru o versiune finală: pătrate 256×256 pe fundal transparent sau magenta, aceeași paletă: hrană, moral, săgeți, cherestea, încrederea Domnului, civili, oșteni, arcași, milițieni, călăreți, ziduri.

---------------------------------------------------------------------------------------------------

## 3. ElevenLabs: cum lucrezi

- **Sound Effects**: introduci promptul, setezi **Duration** și **Prompt influence ~0.7**, generezi 3–4 variante și alegi una. Dacă ai opțiunea **Loop**, o activezi la ambient-uri.
- **Music**: modul *Compose*, **instrumental only** (fără voce), cu lungimea indicată.
- Export: **MP3, 44.1 kHz, 128–192 kbps**. Evită clipping-ul. Muzica să fie mai încet decât efectele.
- Pune fișierele în `assets/audio/` cu **exact** numele de mai jos.

### 3.1 Muzică (Music)

| Fișier | Durată | Prompt |
|---|---|---|
| `music_menu.mp3` | 90 s, loop | `Dark medieval cinematic ambient, solemn low cello drone, slow frame drum, distant lone duduk-like wooden flute, Eastern European folk influence, sorrowful and heroic, instrumental, no vocals, seamless loop` |
| `music_game.mp3` | 120 s, loop | `Tense medieval siege underscore, slow pulsing low strings, sparse plucked cobza (lute-like) notes, distant war drums, restrained and brooding, Moldavian folk modes, instrumental, no vocals, seamless loop` |
| `music_battle.mp3` | 90 s, loop | `Intense medieval battle music, driving war drums, pounding timpani, aggressive low strings ostinato, brass horns, urgent and dark, minimal melody, instrumental, no vocals, seamless loop` |
| `music_victory.mp3` | 25 s | `Triumphant yet weary medieval fanfare, warm brass and strings, rising folk melody, bells, dawn feeling, instrumental, no vocals, resolves gently` |
| `music_defeat.mp3` | 25 s | `Mournful medieval lament, solo cello and low choir-like pads without words, slow tolling bell, desolate, instrumental, fades out` |

### 3.2 Ambiente (Sound Effects, loop)

| Fișier | Durată | Prompt |
|---|---|---|
| `amb_day.mp3` | 30 s, loop | `Daytime medieval fortress ambience on a windy hilltop, gentle wind, distant birdsong, faint clanking of armor, distant camp murmur, occasional hammer, seamless loop` |
| `amb_night.mp3` | 30 s, loop | `Night ambience over a besieged fortress and a large enemy camp, crickets, low wind, crackling campfires, distant murmuring of soldiers, a far wolf howl, seamless loop` |
| `amb_rain.mp3` | 30 s, loop | `Steady rain on stone and wooden roofs, soft wind, distant rumble of thunder, medieval fortress, seamless loop` |

### 3.3 Efecte (Sound Effects)

| Fișier | Durată | Prompt |
|---|---|---|
| `sfx_click.mp3` | 0.4 s | `Soft wooden UI click, small wooden token tapped on a table, short, dry` |
| `sfx_order.mp3` | 1 s | `Short heavy wax seal stamped on parchment with a leather-and-wood thud` |
| `sfx_hammer.mp3` | 2 s | `Carpenters hammering iron nails into thick timber beams, three to four strikes, outdoor` |
| `sfx_anvil.mp3` | 2.5 s | `Blacksmith hammering hot iron on an anvil, ringing metal strikes, forge, medieval` |
| `sfx_quill.mp3` | 2 s | `Quill pen scratching on parchment, close up, quiet` |
| `sfx_bell.mp3` | 3 s | `A single deep medieval church bell tolling once, distant, stone echo` |
| `sfx_horn.mp3` | 3 s | `A long deep medieval war horn blown from a fortress wall, echoing across a valley` |
| `sfx_boom.mp3` | 2.5 s | `A massive medieval bombard firing, a huge low boom with smoke whoosh and echo across the valley` |
| `sfx_impact.mp3` | 2.5 s | `A heavy stone cannonball smashing into a thick stone wall, crumbling masonry and rubble falling` |
| `sfx_volley.mp3` | 3 s | `A volley of many arrows whooshing through the air and thudding into wood and shields` |
| `sfx_ladder.mp3` | 2.5 s | `Wooden siege ladders slammed against a stone wall, clattering wood, men shouting in the distance` |
| `sfx_clash.mp3` | 5 s | `Medieval melee on a castle wall, clashing swords and shields, men shouting, battle cries, chaotic but not gory` |
| `sfx_collapse.mp3` | 4 s | `A section of a thick stone fortress wall collapsing with a rumbling crash of stone and dust` |
| `sfx_thunder.mp3` | 4 s | `Rolling thunder over hills, one close crack then a long rumble` |
| `sfx_horse.mp3` | 3 s | `A single horse galloping on a dirt road and then slowing, hoofbeats, snort` |
| `sfx_crowd.mp3` | 4 s | `Tired crowd of refugees murmuring, children crying faintly, cart wheels creaking, medieval` |
| `sfx_event.mp3` | 2 s | `A low ominous medieval stinger, a single deep drum hit with a faint dissonant string swell` |
| `sfx_victory.mp3` | 4 s | `Short triumphant medieval horn fanfare, then a bell, hopeful` |
| `sfx_defeat.mp3` | 4 s | `Slow low horn and a distant tolling bell, grim, final` |

### 3.4 (Opțional) Voce pentru Cronicar
Dacă vrei narațiune: ElevenLabs *Text to Speech*, voce masculină matură, caldă, ușor răgușită, ritm lent, **Stability ~0.55**, **Style ~0.3**. Textul = intrările din Cronică. Nu e conectat încă în joc.

---------------------------------------------------------------------------------------------------

> Fișierele pot fi **.jpg sau .png** (Gemini dă de obicei PNG, e ok). Dimensiunea exactă nu contează: ilustrațiile 16:9 sunt tăiate automat să încapă, iar texturile pot fi orice pătrat.

## 4. Cum mi le dai

1. Încarcă fișierele în repo, în folderele indicate (pe GitHub: *Add file → Upload files*, pe branch-ul `ccr-ed81453d-wo7sc8`), sau spune-mi unde le-ai pus.
2. Spune-mi doar: „am pus imaginile/sunetele”. Eu le verific vizual, ajustez dimensiunile și le conectez.
3. Începe cu **ordinea de impact**: (1) ancora de stil + 6–8 ilustrații de eveniment (cele din story: `smoke, envoy, refugees, bombard, prince_rider, fever, traitor, mercy`), (2) texturile, (3) muzica + ambientul, (4) efectele, (5) sprite-urile.
