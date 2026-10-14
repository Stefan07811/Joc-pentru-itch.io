# Cronicarul Cetății (demo)

Joc de strategie istorică în browser (HTML/JS pur, fără build), pentru itch.io.
Ești pârcălabul cetății Neamț în 1476. Ții zidurile, hrana și moralul și scrii cronica cetății.
Garnizoana ascultă cronica, iar Domnul (Ștefan cel Mare) o citește prin soli: ce scrii schimbă ce simt și ce cred ei.

## Rulare locală
```
python3 -m http.server 8000   # apoi deschide http://localhost:8000
```
## Publicare pe itch.io
Arhivează conținutul folderului (index.html, css/, js/, assets/) într-un .zip și încarcă-l ca „HTML5 / playable in browser”.

## Structura
- `js/engine.js` – logica jocului (fără DOM)
- `js/data.js` – scenariul, evenimentele și finalurile (aici adaugi conținut)
- `js/ui.js`, `css/style.css`, `js/audio.js` – interfața și sunetul
- `tools/sim.js` – simulări pentru echilibrare (`node tools/sim.js`)

## Unde pui asset-urile (toate opționale; jocul rulează și fără ele)
Imagini de fundal (JPG, ~1600×600, 3:1) în `assets/img/`:
`scene_title`, `scene_cetate`, `scene_asalt`, `scene_cronica`, `scene_quiet`, `scene_victorie`, `scene_infrangere`
și câte una pentru fiecare eveniment: `scene_<id>.jpg` (ex. `scene_sol_turc.jpg`, `scene_refugiati`, `scene_put_otravit`,
`scene_dezertori`, `scene_mesager_domn`, `scene_mina`, `scene_spion`, `scene_boala`, `scene_negustor`, `scene_ploaie`,
`scene_foc_hambar`, `scene_iesire`, `scene_predica`, `scene_inspector`, `scene_copii`).

Sunete MP3 în `assets/audio/`: `music_menu`, `music_game`, `sfx_click`, `sfx_quill`, `sfx_assault`, `sfx_victory`, `sfx_defeat`.

## Pașii următori
Mai multe asedii (Suceava, Constantinopol, Alesia…), hartă și unități, consilieri cu personalitate, seed zilnic și clasament, salvări.
