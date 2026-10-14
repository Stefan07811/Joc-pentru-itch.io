/* Conținutul scenariului: Cetatea Neamț, vara lui 1476. */
(function (root) {
  'use strict';

  const SCENARIO = {
    id: 'neamt-1476',
    title: 'Cetatea Neamț, 1476',
    intro: [
      'Iulie 1476. Oastea moldovenească a fost zdrobită la Valea Albă, iar sultanul Mehmed al II-lea a intrat în țară.',
      'Ștefan cel Mare s-a retras să adune oaste nouă. Tu ești pârcălabul cetății Neamț și ai ordin să reziști cât se poate.',
      'Nu poți ieși să lupți în câmp. Poți ține zidurile, hrana și moralul oamenilor. Și mai poți ține cronica cetății, cea pe care o vor citi și garnizoana, și Domnul.',
      'Reziști 30 de zile. Dacă Domnul are încredere în veștile tale, va veni cu oastea.'
    ]
  };

  const EVENTS = [
    {
      id: 'sol_turc', day: 2, title: 'Solul sultanului',
      text: 'Un sol turc a venit sub steag alb. Vorbește pe un ton blând: dacă predai cetatea, oamenii tăi pleacă nevătămați, iar tu primești aur.',
      choices: [
        { label: 'Îl alungi cu dispreț', fx: { morale: 8 }, text: 'Oștenii au aplaudat pe ziduri. Solul a plecat pe cai grăbiți.',
          note: { real: 'Am alungat solul turc fără răspuns.', glory: 'Am trimis solului păgân răspuns de oțel, iar oștenii au cântat pe ziduri.' } },
        { label: 'Tragi de timp cu vorbe meșteșugite', fx: { morale: -3, cred: 0 }, set: { enemyWeak: true }, text: 'Turcii așteaptă răspunsul. Primul asalt va fi mai puțin pregătit.',
          note: { real: 'Am amânat solul cu vorbe, ca să câștigăm timp.', glory: 'Prin meșteșug și înțelepciune, am zăpăcit tabăra păgână.' } },
        { label: 'Te gândești serios la ofertă', fx: { morale: -12, arrows: 10 }, text: 'Vestea s-a răspândit prin cetate. Oamenii se uită la tine cu îndoială. Solul a lăsat totuși daruri.',
          note: { real: 'Am ascultat oferta solului și mulți s-au îndoit de mine.', glory: 'Am cântărit oferta pentru a o respinge cu mai multă greutate.' } }
      ]
    },
    {
      id: 'refugiati', minDay: 3, title: 'Săteni la poartă',
      text: 'Sătenii din Târgu Neamț stau la poartă cu copiii și cu puținul pe care l-au putut căra. Vin turcii în urma lor.',
      choices: [
        { label: 'Îi primești pe toți', fx: { men: 8, food: -14, morale: 3 }, text: 'Cetatea se umple de oameni. Printre ei sunt câțiva bărbați zdraveni.',
          note: { real: 'Am primit sătenii în cetate. Hrana scade mai repede.', glory: 'Cetatea și-a deschis porțile cu milă creștinească.' } },
        { label: 'Primești doar meșterii și ostașii', fx: { men: 3, walls: 6, food: -4, morale: -4 }, text: 'Cei respinși te privesc cu ochi grei.',
          note: { real: 'Am primit doar meșterii și bărbații din sate. Ceilalți au rămas afară.', glory: 'Am ales cu grijă pe cei folositori cetății.' } },
        { label: 'Închizi poarta', fx: { morale: -10, cred: -3 }, text: 'Strigătele de afară se aud până noaptea târziu.',
          note: { real: 'Am ținut poarta închisă. Mulți au plâns afară.', glory: 'Poarta a rămas închisă, după datoria strajei.' } }
      ]
    },
    {
      id: 'put_otravit', minDay: 4, title: 'Fântâna tulbure',
      text: 'Apa din puțul de sus miroase ciudat. Un soldat se jură că a văzut un străin la fântână în zori.',
      choices: [
        { label: 'Cercetezi fântâna cu atenție', fx: { food: -3, morale: -2 }, text: 'Era doar mâl după ploaie. Oamenii au pierdut o zi cu frica.',
          note: { real: 'Am cercetat fântâna. Era doar mâl.', glory: 'Am dejucat o încercare păgână de a ne otrăvi apa.' } },
        { label: 'Pui ostași să păzească fântâna', fx: { drill: 2, men: -1 }, text: 'Un om a murit de febră în noaptea aceea. Altfel, e liniște.',
          note: { real: 'Am pus strajă la fântână.', glory: 'Strajă vegheată păzește izvoarele cetății.' } },
        { label: 'Ignori zvonul', fx: { morale: -4 }, risk: { p: 0.35, fx: { men: -5, morale: -8 }, text: 'Din păcate, apa era stricată. Câțiva oameni s-au îmbolnăvit.' }, text: 'Oamenii beau apa cu teamă.',
          note: { real: 'N-am dat crezare zvonului despre fântână.', glory: 'Am respins zvonul fricoșilor.' } }
      ]
    },
    {
      id: 'dezertori', minDay: 5, title: 'Trei oșteni fug',
      text: 'Trei oșteni au fost prinși încercând să se strecoare pe poarta tainică. Spun că familiile lor sunt în pădure și că nu mai pot sta.',
      choices: [
        { label: 'Îi pedepsești pentru exemplu', fx: { morale: -6, drill: 3, men: -1 }, text: 'Cetatea a înțeles. Dar nu a uitat.',
          note: { real: 'Am pedepsit trei dezertori.', glory: 'Dreptatea Domnului a căzut asupra celor fricoși.' } },
        { label: 'Îi ierți și le dai o strajă ușoară', fx: { morale: 3 }, text: 'Cei trei au promis că rămân. Alții au respirat ușurați.',
          note: { real: 'Am iertat trei oșteni care voiau să fugă.', glory: 'Oștenii s-au căit și s-au întors la datorie.' } },
        { label: 'Îi lași să plece', fx: { men: -3, morale: -2 }, text: 'Poarta a rămas deschisă o clipă și s-a închis.',
          note: { real: 'Am lăsat trei oșteni să plece.', glory: 'Trei oșteni au fost trimiși în slujbă tainică.' } }
      ]
    },
    {
      id: 'mesager_domn', day: 8, title: 'Mesager de la Ștefan',
      text: 'Un călăreț obosit a ajuns, cu inelul Domnului. Ștefan întreabă: „Cum ține cetatea? Ce pierderi, ce hrană? De asta depinde dacă pornesc spre voi sau mai întâi la Suceava.”',
      choices: [
        { label: 'Îi spui adevărul, așa cum e', fx: { cred: 8, morale: -2 }, text: 'Mesagerul a plecat grav. Domnul știe acum cât ești de încolțit.',
          note: { real: 'I-am scris Domnului adevărul despre starea cetății.', glory: 'Domnului i-am scris cu credință despre starea cetății.' } },
        { label: 'Îi spui că totul e în regulă', fx: { cred: 4, morale: 2, lieDebt: 2 }, text: 'Mesagerul pleacă mulțumit. Dar vei trebui să ții minciuna în picioare.',
          note: { real: 'I-am scris Domnului că totul e bine, deși nu e.', glory: 'I-am scris Domnului că cetatea stă neclintită.' } },
        { label: 'Ceri ajutor grabnic', fx: { cred: 2, morale: -3 }, text: 'Domnul ți-a promis că va grăbi. Dar nu știi dacă poate.',
          note: { real: 'Am cerut ajutor grabnic de la Domn.', glory: 'Domnul a fost înștiințat să vină cu bucurie.' } }
      ]
    },
    {
      id: 'mina', minDay: 6, title: 'Sapă sub zid',
      text: 'Străjerii aud ciocane sub pământ. Turcii sapă o mină sub turnul de miazănoapte.',
      choices: [
        { label: 'Sapi o contramină', fx: { men: -3, drill: 1 }, text: 'Doi mineri au murit, dar mina turcească s-a prăbușit.',
          note: { real: 'Am săpat contramină și am pierdut oameni.', glory: 'Prin meșteșug, am stricat uneltirea păgânilor.' } },
        { label: 'Întărești zidul și speri', fx: { walls: -2, arrows: -4 }, risk: { p: 0.5, fx: { walls: -18, men: -4 }, text: 'Mina a explodat. O parte din turn s-a prăbușit.' }, text: 'Ai pus bolovani și grinzi.',
          note: { real: 'Am întărit turnul și am sperat.', glory: 'Turnul a stat neclintit.' } }
      ]
    },
    {
      id: 'spion', minDay: 7, title: 'Un străin în cetate',
      text: 'Un sătean refugiat pare să numere oamenii de pe ziduri. Doi oșteni spun că nu e din sat.',
      choices: [
        { label: 'Îl întrebi cu asprime', fx: { morale: -3, men: 0 }, risk: { p: 0.5, fx: { cred: 3 }, text: 'Era într-adevăr iscoadă.' }, text: 'Nu e clar cine era. Cetatea e agitată.',
          note: { real: 'Am prins un străin suspect.', glory: 'Am dat de urma unei iscoade.' } },
        { label: 'Îl alungi pe poartă', fx: { morale: -1 }, text: 'A plecat fără să zică nimic.',
          note: { real: 'Am alungat un străin.', glory: 'O iscoadă a fost alungată cu rușine.' } },
        { label: 'Îl lași să-și vadă de treabă', fx: {}, risk: { p: 0.4, fx: { walls: -8, morale: -5 }, text: 'Turcii au lovit chiar locul slab al zidului.' }, text: 'Nimic nu se întâmplă. Încă.',
          note: { real: 'Am lăsat omul în pace.', glory: 'Am avut încredere în oameni.' } }
      ]
    },
    {
      id: 'boala', minDay: 9, title: 'Febră în cetate',
      text: 'Febra s-a pornit prin odăi. Medicul spune că izolarea ar ajuta, dar ar lua oameni de pe ziduri.',
      choices: [
        { label: 'Izolezi bolnavii', fx: { men: -2, morale: -3, food: -3 }, text: 'Bolnavii sunt mutați în turnul de apus. Boala nu s-a întins.',
          note: { real: 'Am izolat bolnavii.', glory: 'Doctorul a vindecat cu rugăciune și leacuri.' } },
        { label: 'Nu faci nimic', fx: {}, risk: { p: 0.6, fx: { men: -6, morale: -6 }, text: 'Boala s-a întins în două zile.' }, text: 'Oamenii se feresc unii de alții.',
          note: { real: 'N-am luat măsuri împotriva bolii.', glory: 'Boala a trecut ca ceața.' } }
      ]
    },
    {
      id: 'negustor', minDay: 6, title: 'Negustor în noapte',
      text: 'Un negustor ragusan a reușit să strecoare un car prin liniile turcești. Vrea aur grozav, dar poate aduce ce îți lipsește.',
      choices: [
        { label: 'Cumperi hrană', fx: { food: 25, morale: 2 }, text: 'Hambarele respiră. Negustorul a dispărut în noapte.',
          note: { real: 'Am cumpărat hrană de la un negustor.', glory: 'Providența a trimis ajutor în noapte.' } },
        { label: 'Cumperi arme', fx: { arrows: 30, men: 0 }, text: 'Zeci de săgeți și două arbalete.',
          note: { real: 'Am cumpărat săgeți de la un negustor.', glory: 'Armele au venit din mâna Domnului.' } },
        { label: 'Îl arestezi pentru contrabandă', fx: { morale: 3, cred: -2 }, text: 'Marfa e confiscată, dar nimeni nu mai încearcă să ajungă la voi.',
          note: { real: 'Am arestat un negustor.', glory: 'Un tâlhar a fost prins.' } }
      ]
    },
    {
      id: 'ploaie', minDay: 5, title: 'Ploaie de vară',
      text: 'Cerul s-a deschis. Cisternele se umplu, iar oamenii ies bucuroși în curte.',
      choices: [
        { label: 'Lași oamenii să se bucure', fx: { morale: 6 }, text: 'Pentru o seară, cetatea a râs.',
          note: { real: 'A plouat și oamenii s-au înveselit.', glory: 'Cerul s-a deschis ca binecuvântare.' } },
        { label: 'Folosești ploaia să repari ziduri', fx: { walls: 6, morale: 1 }, text: 'Mortarul a prins bine în ziua aceea.',
          note: { real: 'A plouat. Am folosit apa la zidărie.', glory: 'Dumnezeu a trimis apă pentru ziduri.' } }
      ]
    },
    {
      id: 'foc_hambar', minDay: 8, title: 'Foc în hambar',
      text: 'Noaptea, un foc a izbucnit în hambarul din curtea de sus. Nu se știe dacă a fost accident sau sabotaj.',
      choices: [
        { label: 'Stingi focul cu tot ce ai', fx: { food: -10, men: -1 }, text: 'Focul s-a potolit. Pierderea e mare, dar nu totală.',
          note: { real: 'A ars o parte din hambar.', glory: 'Focul a fost înfrânt de voința oamenilor.' } },
        { label: 'Salvezi mai întâi oamenii', fx: { food: -18, morale: 3 }, text: 'Cei din hambar au scăpat, dar grâul s-a pierdut.',
          note: { real: 'Hambarul a ars, dar oamenii au scăpat.', glory: 'Vieți salvate valorează mai mult decât grâul.' } }
      ]
    },
    {
      id: 'iesire', minDay: 7, title: 'Ieșire în noapte',
      text: 'Căpitanul garnizoanei propune o ieșire pe poarta tainică: să dea foc mașinilor de asediu turcești.',
      choices: [
        { label: 'Aprobi ieșirea', fx: { morale: 4, men: -3, arrows: -5 }, set: { enemyWeak: true }, risk: { p: 0.3, fx: { men: -6, morale: -8 }, text: 'Turcii i-au așteptat. Pierderea e grea.' }, text: 'Câteva mașini ard în noapte.',
          note: { real: 'Am ieșit noaptea să ardem mașinile de asediu.', glory: 'O ceată de viteji a aprins tabăra dușmană.' } },
        { label: 'Refuzi: nu-ți permiți riscul', fx: { morale: -2 }, text: 'Căpitanul se retrage cu o înclinare rigidă.',
          note: { real: 'Am refuzat ieșirea pentru că era prea riscantă.', glory: 'Prudența ne-a păzit oamenii.' } }
      ]
    },
    {
      id: 'predica', minDay: 10, title: 'Preotul cere o procesiune',
      text: 'Preotul cetății vrea să facă o procesiune cu icoana pe ziduri, ca să întărească sufletele.',
      choices: [
        { label: 'Aprobi procesiunea', fx: { morale: 7, food: -2 }, text: 'Cântarea s-a auzit până în tabăra turcă.',
          note: { real: 'Am făcut procesiune pe ziduri.', glory: 'Icoana a străbătut zidurile și dușmanii au tremurat.' } },
        { label: 'Refuzi, e prea periculos', fx: { morale: -3 }, text: 'Preotul a plecat bosumflat.',
          note: { real: 'Am refuzat procesiunea.', glory: 'Rugăciunea s-a făcut în taină.' } }
      ]
    },
    {
      id: 'inspector', priority: true, minDay: 11, title: 'Boierul vine să verifice',
      when: s => s.lieDebt >= 3 && !s.flags.inspected,
      text: 'Domnul a trimis un boier să vadă cu ochii lui cum stă cetatea. Cere să citească cronica și să numere oamenii. Ce ai scris până acum nu se potrivește peste tot cu ce vede.',
      choices: s => [
        { label: 'Îi arăți cronica așa cum e', fx: { cred: -Math.min(30, s.lieDebt * 4) }, lieReset: () => 0, set: { inspected: true },
          text: 'Boierul citește cu fruntea încruntată. Cetatea nu a păcălit pe nimeni.',
          note: { real: 'Boierul Domnului a citit cronica și a aflat minciunile.', glory: 'Boierul a citit cronica cu luare-aminte.' } },
        { label: 'Îndrepți cronica în grabă', set: { inspected: true }, lieReset: x => Math.floor(x.lieDebt / 2),
          risk: { p: 0.5, fx: { cred: -22 }, text: 'Boierul a observat cerneala proaspătă. Nu a spus nimic, dar a notat.' }, fx: { cred: -4 },
          text: 'Ai rescris paginile în grabă.',
          note: { real: 'Am rescris în grabă o parte din cronică.', glory: 'Am pus cronica în rânduială.' } },
        { label: 'Mărturisești ce ai înfrumusețat', fx: { cred: -3, morale: -3 }, lieReset: () => 0, set: { inspected: true },
          text: 'Boierul a tăcut mult, apoi a dat din cap. Cinstea ta a cântărit.',
          note: { real: 'I-am mărturisit boierului ce am înfrumusețat.', glory: 'I-am vorbit boierului cu inima deschisă.' } }
      ]
    },
    {
      id: 'copii', minDay: 12, title: 'Copiii cer de mâncare',
      text: 'Un grup de copii din sate stă lângă bucătărie. Bucătarul se uită la tine fără să spună nimic.',
      choices: [
        { label: 'Le dai din rezerve', fx: { food: -6, morale: 5 }, text: 'Cei mari mănâncă mai puțin ca să rămână pentru ei.',
          note: { real: 'Am dat copiilor din rezervele noastre.', glory: 'Mila Domnului a hrănit copiii cetății.' } },
        { label: 'Păstrezi hrana pentru oșteni', fx: { morale: -6 }, text: 'Plânsul lor se aude toată noaptea.',
          note: { real: 'Am păstrat hrana pentru oșteni.', glory: 'Disciplina a păstrat cetatea.' } }
      ]
    }
  ];

  const ENDINGS = {
    victory: {
      title: 'Cetatea a ținut',
      text: 'În ziua 30, steagul lui Ștefan a apărut pe deal. Turcii au ridicat tabăra în grabă. Domnul a venit pentru că ai fost un pârcălab în care s-a putut încrede.'
    },
    bitter: {
      title: 'Victorie amară',
      text: 'Cetatea a ținut, dar Domnul n-a venit la timp: nu a știut că poate conta pe tine. Turcii s-au retras singuri, secătuiți de boală și vară. Mulți pe care i-ai ținut în viață te vor ține minte.'
    },
    fall: {
      title: 'Cetatea a căzut',
      text: 'Zidurile s-au prăbușit sau oamenii s-au sfârșit. Cronica ta s-a oprit aici, iar ceilalți vor scrie în locul tău.'
    },
    mutiny: {
      title: 'Garnizoana s-a răsculat',
      text: 'Oamenii nu au mai crezut în tine. Poarta a fost deschisă din interior. Moralul e ceea ce ține zidurile.'
    }
  };

  root.GameData = { SCENARIO, EVENTS, ENDINGS };
})(typeof window !== 'undefined' ? window : globalThis);
