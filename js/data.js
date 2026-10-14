/* Scenario content: Neamț Fortress, summer 1476. */
(function (root) {
  'use strict';

  const SCENARIO = {
    title: 'Chronicle of Ash',
    subtitle: 'The Siege of Neamț Fortress · 1476',
    intro: [
      'Late July 1476. The Moldavian army has been broken at Războieni (Valea Albă) and Sultan Mehmed II marches through the land with fire and cannon.',
      'Prince Stephen the Great has withdrawn to raise a new host. You are the pârcălab (castellan) of Neamț Fortress, the stone stronghold raised by Petru I Mușat on its hill above the Neamț valley. Your orders are simple: hold.',
      'Place your men on the walls, feed the people, bury the dead. And keep the Chronicle, which the garrison hears each night and the Prince reads through his riders.',
      'Survive 30 days. If the Prince trusts your word, he will come.'
    ]
  };

  /* Each wave: where the enemy strikes (focus weights sum to 1) and how hard. */
  const WAVES = [
    { day: 4,  name: 'The Probing Raid',      power: 46,  focus: { gate: 0.40, east: 0.30, curtain: 0.25, cliff: 0.05 }, army: { akinji: 1.0 } },
    { day: 8,  name: 'The First Storm',       power: 78,  focus: { gate: 0.50, east: 0.25, curtain: 0.20, cliff: 0.05 }, army: { azab: 0.7, akinji: 0.3 } },
    { day: 12, name: 'Ladders in the Mist',   power: 102, focus: { curtain: 0.45, east: 0.30, gate: 0.20, cliff: 0.05 }, army: { azab: 1.0 } },
    { day: 16, name: 'Sappers and Fire',      power: 132, focus: { east: 0.50, gate: 0.30, curtain: 0.15, cliff: 0.05 }, army: { azab: 0.6, sapper: 0.4 } },
    { day: 20, name: 'The Janissary Assault', power: 166, focus: { gate: 0.55, curtain: 0.20, east: 0.20, cliff: 0.05 }, army: { janissary: 0.6, azab: 0.4 } },
    { day: 24, name: 'The Night Climb',       power: 192, focus: { cliff: 0.30, curtain: 0.30, east: 0.25, gate: 0.15 }, army: { akinji: 0.4, janissary: 0.6 } },
    { day: 28, name: "The Sultan's Wrath",    power: 236, focus: { gate: 0.35, east: 0.30, curtain: 0.25, cliff: 0.10 }, army: { janissary: 0.5, azab: 0.5 } }
  ];

  const EVENTS = [
    /* ---------- fixed story beats ---------- */
    {
      id: 'smoke', day: 1, art: '🔥', title: 'Smoke in the Valley',
      text: 'Ottoman riders stream into the valley below. The village granaries are still full, and the steward asks what to do before the first torch falls.',
      choices: [
        { label: 'Burn the fields and granaries', fx: { food: 15, morale: -6, villageBurn: 0.45 }, set: { enemyWeak: true },
          text: 'Smoke rises from your own harvest. The enemy will march hungry, and so will the folk who lived there.',
          note: { real: 'We burned the valley granaries to deny the Turks.', glory: 'We put the valley to the torch, that the heathen might find no bread in Moldavia.' } },
        { label: 'Bring the villagers inside', fx: { civ: 24, food: -10, morale: 2 },
          text: 'The gate groans open. Carts, goats and crying children flood the courtyard.',
          note: { real: 'We took the villagers inside the walls.', glory: 'The fortress opened its arms to the people of the valley.' } },
        { label: 'Hold the walls and nothing more', fx: { civ: 6, morale: -3, villageBurn: 0.2 },
          text: 'Most of the villagers are left to hide in the forest. You do not look at the gate as it closes.',
          note: { real: 'We kept the gate shut and left the valley to its fate.', glory: 'We kept faith with the walls and left the valley in God\'s hands.' } }
      ]
    },
    {
      id: 'envoy', day: 2, art: '🏳️', spawn: 'envoy', title: "The Sultan's Envoy",
      text: 'A rider under a white flag halts at the gate. He promises safe passage for the garrison and a purse of gold if the keys are handed over.',
      choices: [
        { label: 'Send him back with an insult', fx: { morale: 8 }, text: 'The walls roar with laughter. The envoy rides away red in the face.',
          note: { real: 'We sent the Sultan\'s envoy away with insults.', glory: 'We answered the Sultan with iron words, and the walls rang with song.' } },
        { label: 'Stall with talk of terms', fx: { morale: -3 }, set: { enemyWeak: true }, text: 'The envoy waits for an answer that never quite comes. The first assault will be less prepared.',
          note: { real: 'We stalled the envoy to buy time.', glory: 'With subtle words we left the heathen guessing.' } },
        { label: 'Take the gold and give nothing', fx: { arrows: 20, timber: 10, morale: -8, cred: -3 }, text: 'The coin buys arrowheads and beams. Some in the garrison look at you differently now.',
          note: { real: 'We took the envoy\'s gold and promised nothing.', glory: 'We turned the heathen\'s greed against him.' } }
      ]
    },
    {
      id: 'refugees', day: 3, art: '🚶', spawn: 'refugees', title: 'The Road of Sorrows',
      text: 'A column of refugees reaches the gate with the akinji at their heels. The granary is already thin, and sickness often follows such crowds.',
      choices: [
        { label: 'Open the gate to everyone', fx: { civ: 30, food: -14, morale: 3, militia: 5 }, set: { crowded: true }, text: 'The courtyard fills to bursting. Five young men take up spears at once.',
          note: { real: 'We opened the gate to all refugees.', glory: 'No Christian soul was turned from our gate.' } },
        { label: 'Admit only the strong and skilled', fx: { civ: 8, militia: 6, timber: 6, morale: -8 }, text: 'You sort them like cattle. The ones left outside do not shout. That is worse.',
          note: { real: 'We admitted only those who could fight or build.', glory: 'We chose those who could serve the fortress best.' } },
        { label: 'Bar the gate', fx: { morale: -12, cred: -3 }, text: 'The crying continues until the akinji arrive. Then it does not.',
          note: { real: 'We barred the gate against the refugees.', glory: 'The gate stayed shut as duty demanded.' } }
      ]
    },
    {
      id: 'bombard', day: 5, art: '💣', title: 'The Great Bombard',
      text: 'Scouts report a bombard, as long as three horses, being hauled into the Ottoman lines. It will hammer your walls daily once it is in place.',
      choices: [
        { label: 'Sortie to spike the gun', fx: { knight: -2 }, risk: { p: 0.55, fx: { knight: -2, militia: -3, morale: -6 }, text: 'The ambush was waiting. Few came back.' },
          text: 'Riders thunder out in the dusk, but the bombard is already ringed with pikes.',
          note: { real: 'We sallied against the bombard.', glory: 'A band of heroes charged the great gun.' } },
        { label: 'Reinforce the East Wall now', fx: { timber: -10, fort_east: 1 }, text: 'Beams and sandbags go up behind the wall\'s face.',
          note: { real: 'We reinforced the East Wall against the bombard.', glory: 'The East Wall was clad in oak and faith.' } },
        { label: 'Pray it jams', fx: { morale: 4 }, text: 'The priest lights candles. The gun will fire anyway.',
          note: { real: 'We prayed and did nothing else.', glory: 'The fortress turned to God against the great gun.' } }
      ]
    },
    {
      id: 'prince_rider', day: 7, art: '📜', spawn: 'rider', title: 'A Rider from the Prince',
      text: 'A mud-spattered rider carries Prince Stephen\'s ring. "How does the fortress stand? Your answer decides whether I march north or relieve you first."',
      choices: [
        { label: 'Report the truth, all of it', fx: { cred: 8, morale: -2 }, text: 'The rider leaves grim-faced. The Prince will know exactly what you are.',
          note: { real: 'I wrote the Prince a true account of our state.', glory: 'I wrote the Prince faithfully of our state.' } },
        { label: 'Tell him all is well', fx: { cred: 4, morale: 2, lieDebt: 2 }, text: 'The rider is reassured. Now you must live inside that lie.',
          note: { real: 'I told the Prince all was well, though it was not.', glory: 'I wrote the Prince that the fortress stood unshaken.' } },
        { label: 'Beg for relief at once', fx: { cred: 2, morale: -3 }, text: 'Stephen has few men to spare, and he knows you know it.',
          note: { real: 'I begged the Prince for swift relief.', glory: 'I urged the Prince to come and share our glory.' } }
      ]
    },
    {
      id: 'fever', day: 10, art: '🤒', title: 'Fever in the Courtyard',
      text: 'A low fever creeps through the crowded yard. The physician says the cellar could hold the sick apart, but few who go down there come back.',
      choices: [
        { label: 'Seal the sick in the cellar', fx: { civ: -8, morale: -8 }, text: 'The door is barred from outside. The singing stops after three days.',
          note: { real: 'We shut the fevered in the cellar to stop the sickness.', glory: 'The sick were cared for in a quiet place.' } },
        { label: 'Let the physician treat them openly', fx: { food: -6, civ: -3 }, risk: { p: 0.5, fx: { militia: -5, morale: -6 }, text: 'The fever leaps to the garrison.' }, text: 'Herbs, vinegar and prayer. It might be enough.',
          note: { real: 'We let the physician treat the sick in the open.', glory: 'The physician fought the fever with skill and prayer.' } },
        { label: 'Cast the dead over the wall', fx: { morale: -4, civ: -2 }, risk: { p: 0.4, fx: { villageBurn: 0.05, morale: -4 }, text: 'The enemy sends the bodies back with a catapult.' }, text: 'Dead civilians fall among the Turkish tents. The fever follows.',
          note: { real: 'We threw the dead from the walls to spread fear.', glory: 'We returned the favour of pestilence to the heathen.' } }
      ]
    },
    {
      id: 'traitor', day: 13, art: '🗝️', title: 'The Man with the Key',
      text: 'The watch caught a steward with a copy of the postern key and a Turkish coin in his belt. He says his family is held hostage in the valley.',
      choices: [
        { label: 'Hang him from the wall', fx: { morale: 4 }, text: 'The body turns slowly in the wind. The garrison watches in silence.',
          note: { real: 'We hanged a traitor from the wall.', glory: 'Justice was done upon a Judas.' } },
        { label: 'Question him until he talks', fx: { morale: -4 }, set: { scoutAll: true }, text: 'He tells you where the enemy will strike. Every assault from now on holds no secrets.',
          note: { real: 'We questioned the traitor until he gave up the enemy\'s plans.', glory: 'The traitor was made to serve the fortress at last.' } },
        { label: 'Let him go and watch him closely', fx: { morale: -3 }, risk: { p: 0.5, fx: { wall_gate: -20, militia: -4 }, text: 'He opened the postern for the Turks the next night.' }, text: 'Mercy, or foolishness. Time will tell.',
          note: { real: 'We let the traitor go.', glory: 'The traitor was spared by our mercy.' } }
      ]
    },
    {
      id: 'hunger', day: 17, art: '🍞', title: 'The Granary is Nearly Bare',
      when: s => s.food < 90,
      text: 'The bakers show you the last sacks. There is one way to stretch the stores, and none of the ways are kind.',
      choices: [
        { label: 'Slaughter the warhorses', fx: { food: 28, knight: -3, morale: -5 }, text: 'The destriers are led out one by one. Grooms weep over them.',
          note: { real: 'We slaughtered the warhorses for meat.', glory: 'The chargers gave their last service to the fortress.' } },
        { label: 'Turn the civilians out', fx: { civ: -18, food: 14, morale: -14, cred: -4 }, text: 'You open the postern at midnight. You do not stay to watch them go.',
          note: { real: 'We drove the civilians from the gate to save the garrison.', glory: 'The weak were sent to the forest, where Providence would keep them.' } },
        { label: 'Share the pain equally', fx: { food: 10, morale: -8 }, text: 'Everyone, from castellan to scullion, takes the same thin bowl.',
          note: { real: 'We halved every ration alike.', glory: 'All shared the bread equally, great and small.' } }
      ],
    },
    {
      id: 'hunger_alt', day: 17, art: '🍞', title: 'Bread and Quiet',
      when: s => s.food >= 90,
      text: 'The stores hold better than expected. A group of the elders suggests a feast day to lift spirits, though some argue every grain counts.',
      choices: [
        { label: 'Hold the feast', fx: { food: -10, morale: 10 }, text: 'For one night the yard smells of roast meat and smoke, not death.',
          note: { real: 'We held a feast to lift spirits.', glory: 'A great feast was held in defiance of the siege.' } },
        { label: 'Keep it all for later', fx: { morale: -2 }, text: 'The elders go away muttering.',
          note: { real: 'We kept the stores untouched.', glory: 'Prudence kept the granary full.' } }
      ]
    },
    {
      id: 'mine', day: 15, art: '⛏️', title: 'Hammering Under the Earth',
      text: 'The listening pots of the east cellar tremble. Turkish sappers are digging under the East Wall.',
      choices: [
        { label: 'Dig a countermine', fx: { militia: -3, timber: -6 }, text: 'You break into their tunnel in the dark. The fight is short and horrible.',
          note: { real: 'We dug a countermine and killed the sappers in the dark.', glory: 'We caught the heathen moles in their own burrow.' } },
        { label: 'Flood it with water from the cistern', fx: { morale: -2, wall_east: -6 }, text: 'Water, mud and screaming. The wall\'s foundation is wet, but the mine is gone.',
          note: { real: 'We flooded the mine.', glory: 'We washed the sappers out of the earth.' } },
        { label: 'Ignore it and hope', fx: {}, risk: { p: 0.6, fx: { wall_east: -35, militia: -5, morale: -8 }, text: 'The mine blew at dawn. A long stretch of the wall came down.' }, text: 'You turn away from the listening pots.',
          note: { real: 'I ignored the mine.', glory: 'The East Wall stood firm.' } }
      ]
    },
    {
      id: 'mercy', day: 21, art: '🏳️', spawn: 'envoy', title: 'The Offer of Mercy',
      text: 'The envoy returns with a second offer: open the gates and the garrison will be spared. To prove it, he shows five of your own men, captured weeks ago. They are bound and kneeling before the gate.',
      choices: [
        { label: 'Refuse. The prisoners are dead already', fx: { morale: -8, cred: 3 }, text: 'You turn from the wall before the sword falls. You hear it anyway.',
          note: { real: 'I refused the Sultan\'s offer and the five prisoners were killed.', glory: 'I refused the Sultan, and the five died as martyrs.' } },
        { label: 'Offer a ransom of arrows and food', fx: { arrows: -25, food: -15, militia: 5, morale: 3 }, text: 'The Turks take your goods and release the five. They are skin and bone.',
          note: { real: 'We ransomed five prisoners for stores we could not spare.', glory: 'Five brothers were redeemed by Christian charity.' } },
        { label: 'Open a parley to gain a day', fx: { morale: -4 }, set: { enemyWeak: true }, text: 'The Turks listen to your lies. The prisoners are beaten when they discover it.',
          note: { real: 'I parleyed to gain time. The prisoners paid for it.', glory: 'Cunning gained a day for the fortress.' } }
      ]
    },
    {
      id: 'eve', day: 26, art: '🌙', title: 'The Eve of the Last Storm',
      text: 'Messengers say the Sultan himself will lead the final assault. Your men sit in silence along the walls, sharpening what they have.',
      choices: [
        { label: 'Swear an oath with them', fx: { morale: 10, food: -4 }, text: 'You kneel on the stones with the garrison, and the priest raises a cross.',
          note: { real: 'We swore an oath on the walls.', glory: 'The garrison swore to die before yielding a stone.' } },
        { label: 'Distribute the last wine', fx: { morale: 6, food: -2 }, text: 'Cups pass from hand to hand. Some men weep, some laugh.',
          note: { real: 'We shared the last wine.', glory: 'Wine flowed like a blessing.' } },
        { label: 'Tell them the truth: we may not survive', fx: { morale: -6, cred: 4 }, text: 'A long quiet. Then an old man says, "Then let it be worth something."',
          note: { real: 'I told the garrison we might not survive.', glory: 'I told them the hour was great.' } }
      ]
    },
    {
      id: 'vigil', day: 29, art: '🕯️', title: 'The Last Night',
      text: 'The camp is silent. The Sultan\'s pavilion burns with lamps. On the wall, a boy of twelve asks if the Prince is coming.',
      choices: [
        { label: '"Yes. He is nearly here."', fx: { morale: 6, lieDebt: 1 }, text: 'The boy smiles and sleeps against a merlon.',
          note: { real: 'I told a frightened boy that the Prince was coming.', glory: 'The very children of the fortress believed.' } },
        { label: '"I do not know."', fx: { morale: -2, cred: 3 }, text: 'He nods. Somehow it is better than a lie.',
          note: { real: 'I told a boy I did not know if the Prince would come.', glory: 'I spoke plainly to a child.' } }
      ]
    },

    /* ---------- random pool ---------- */
    {
      id: 'deserters', minDay: 4, art: '🏃', title: 'Three Men at the Postern',
      text: 'Three militiamen are caught slipping through the postern with packs. Their families hide in the forest and they do not want to die here.',
      choices: [
        { label: 'Hang them as an example', fx: { militia: -3, morale: -4 }, set: { harsh: true }, text: 'The garrison learns what desertion costs. It does not forget who taught them.',
          note: { real: 'I hanged three deserters.', glory: 'Justice reached the faithless.' } },
        { label: 'Return them to the wall, shamed', fx: { morale: -2 }, text: 'They go back to their posts with their eyes on the stones.',
          note: { real: 'Three deserters were returned to their posts.', glory: 'The wayward were brought back to duty.' } },
        { label: 'Let them go', fx: { militia: -3, morale: 2 }, text: 'The postern closes. Some on the wall look after them with longing.',
          note: { real: 'I let three men go.', glory: 'Three men were sent on a secret errand.' } }
      ]
    },
    {
      id: 'poisoned_well', minDay: 5, art: '🪣', title: 'The Bitter Well',
      text: 'The upper well tastes foul. A soldier swears he saw a stranger by it before dawn.',
      choices: [
        { label: 'Drain and clean it', fx: { food: -3, morale: -2 }, text: 'It was only rotted leaves from the rain. A day lost to fear.',
          note: { real: 'We drained the well and found nothing.', glory: 'We foiled a poisoning.' } },
        { label: 'Guard it and boil the water', fx: { timber: -4 }, text: 'Smoke over the yard all night. No one falls sick.',
          note: { real: 'We boiled the water and set a guard.', glory: 'The wells were guarded vigilantly.' } },
        { label: 'Drink and trust to God', fx: { morale: -2 }, risk: { p: 0.35, fx: { militia: -5, civ: -4, morale: -8 }, text: 'The water was spoiled after all. Many fell ill.' }, text: 'You drink first, to show them.',
          note: { real: 'I drank the water first.', glory: 'I drank first, that none should fear.' } }
      ]
    },
    {
      id: 'granary_fire', minDay: 6, art: '🔥', title: 'Fire in the Granary',
      text: 'Flames light the night sky above the granary. It might be an accident, or it might be a hand.',
      choices: [
        { label: 'Form a chain and fight it', fx: { food: -10, militia: -2 }, text: 'Buckets pass in the dark. Part of the stores are saved.',
          note: { real: 'We fought the granary fire.', glory: 'The fire was beaten by bravery.' } },
        { label: 'Save the people first', fx: { food: -22, morale: 3 }, text: 'Few are burned, but the grain is gone.',
          note: { real: 'We let the granary burn to save the people.', glory: 'Lives were weighed above grain.' } }
      ]
    },
    {
      id: 'merchant', minDay: 5, art: '🛒', spawn: 'cart', title: 'A Merchant Slips Through',
      text: 'A Ragusan merchant has bribed his way through the lines with a mule cart. He wants silver you do not have, or something else.',
      choices: [
        { label: 'Buy grain', fx: { food: 28, morale: 2 }, text: 'The sacks are real. He vanishes into the dark.',
          note: { real: 'We bought grain from a merchant.', glory: 'Providence sent us bread.' } },
        { label: 'Buy arrows and timber', fx: { arrows: 30, timber: 12 }, text: 'Arrowheads by the hundred, and oak beams.',
          note: { real: 'We bought arrows and timber.', glory: 'The armoury was filled by a stranger\'s hand.' } },
        { label: 'Seize everything and send him off', fx: { food: 12, arrows: 15, cred: -4, morale: -2 }, text: 'He leaves unarmed and cursing. Word will spread that Neamț steals from friends.',
          note: { real: 'We seized a merchant\'s cargo.', glory: 'The fortress requisitioned stores for the common good.' } }
      ]
    },
    {
      id: 'rain', minDay: 4, art: '🌧️', title: 'A Blessed Rain',
      text: 'Clouds break over the keep, and the cisterns fill. In the yard, people tip their faces up and laugh.',
      choices: [
        { label: 'Let them rejoice', fx: { morale: 7 }, text: 'For one evening the fortress sounds like a village again.',
          note: { real: 'It rained and spirits lifted.', glory: 'Heaven wept in sympathy and blessed our cisterns.' } },
        { label: 'Use the wet to mix mortar', fx: { wallsAll: 5, morale: 1 }, text: 'Masons work until midnight.',
          note: { real: 'We used the rain to mend the walls.', glory: 'The rain was God\'s gift to our masons.' } }
      ]
    },
    {
      id: 'children', minDay: 8, art: '🧒', title: 'Hungry Children',
      text: 'A knot of orphans waits at the kitchen door. The cook looks at you without speaking.',
      choices: [
        { label: 'Feed them from the stores', fx: { food: -7, morale: 6 }, text: 'Soldiers quietly leave part of their own bread beside them.',
          note: { real: 'We fed the orphans from our stores.', glory: 'Christian mercy fed the little ones.' } },
        { label: 'Hold the stores for the fighters', fx: { morale: -7, civ: -2 }, text: 'The crying carries on through the night.',
          note: { real: 'We refused the orphans.', glory: 'Discipline kept the granary intact.' } }
      ]
    },
    {
      id: 'procession', minDay: 6, art: '⛪', title: 'The Priest Asks for a Procession',
      text: 'Father Ilie wants to carry the icon along the walls. It would hearten the garrison, but archers on the Turkish side would have a clear target.',
      choices: [
        { label: 'Allow the procession', fx: { morale: 8 }, risk: { p: 0.35, fx: { militia: -2, morale: -3 }, text: 'A volley found the line. Two fell with the icon.' }, text: 'The chanting carries into the Ottoman lines.',
          note: { real: 'We held a procession on the walls.', glory: 'The holy icon went along the walls, and the heathen trembled.' } },
        { label: 'Hold it inside the chapel', fx: { morale: 3 }, text: 'Fewer hear it, but no one dies for it.',
          note: { real: 'We held mass in the chapel.', glory: 'Prayers rose from the chapel day and night.' } }
      ]
    },
    {
      id: 'spy', minDay: 7, art: '🕵️', title: 'A Stranger Counting Men',
      text: 'A "refugee" has been seen pacing out the wall. Two guards swear his boots are too fine for a farmer.',
      choices: [
        { label: 'Seize and interrogate him', fx: { morale: -2 }, risk: { p: 0.5, fx: { cred: 3 }, text: 'He was a Turkish spy, and you learn much.' }, text: 'He weeps and swears his innocence. You will never know.',
          note: { real: 'We seized a suspicious stranger.', glory: 'A spy was caught in our midst.' } },
        { label: 'Cast him out the postern', fx: { morale: -1 }, text: 'He goes quietly. Too quietly.',
          note: { real: 'We cast a stranger out.', glory: 'An unknown wanderer was driven off.' } },
        { label: 'Ignore him', fx: {}, risk: { p: 0.4, fx: { wall_curtain: -15, morale: -4 }, text: 'The next assault found the weak stretch of wall at once.' }, text: 'Nothing happens. Yet.',
          note: { real: 'We ignored a stranger.', glory: 'We kept faith with our people.' } }
      ]
    },
    {
      id: 'prisoners', minDay: 6, art: '⛓️', title: 'Captured Akinji',
      when: s => s.wavesDone >= 1,
      text: 'After the assault, your men drag six wounded Turkish raiders behind the wall. They cannot walk and they cannot be fed.',
      choices: [
        { label: 'Execute them', fx: { morale: -3 }, set: { enemyWeak: true }, text: 'Their bodies are thrown over the wall. The next assault is angrier, but less steady.',
          note: { real: 'We executed captured raiders.', glory: 'The raiders paid for their sins.' } },
        { label: 'Interrogate then release them', fx: { morale: 2 }, set: { scoutAll: true }, text: 'They talk freely when treated kindly. Their camp has few secrets now.',
          note: { real: 'We questioned prisoners and let them go.', glory: 'Our mercy drew confession from the foe.' } },
        { label: 'Keep them as labourers', fx: { food: -6, timber: 8, morale: -2 }, text: 'They haul stone under guard.',
          note: { real: 'We kept prisoners as labourers.', glory: 'The heathen were put to useful work.' } }
      ]
    },
    {
      id: 'mercy_killing', minDay: 9, art: '🩸', title: 'The Ones Who Will Not Recover',
      when: s => E().woundedTotal(s) >= 6,
      text: 'The physician takes you aside. Six of the wounded will not recover and are in agony. He needs your word.',
      choices: [
        { label: 'Give them poppy and let them go', fx: { morale: -4 }, text: 'The ward is quiet by dawn.',
          note: { real: 'We eased the dying with poppy.', glory: 'The wounded died with prayers on their lips.' } },
        { label: 'Fight for every life', fx: { food: -5, timber: -4 }, text: 'Bandages, broth and endless watches.',
          note: { real: 'We spent resources to save the wounded.', glory: 'No man was abandoned.' } }
      ]
    },
    {
      id: 'comet', minDay: 8, art: '☄️', title: 'A Light in the Sky',
      text: 'A bright star with a long tail hangs over the Turkish camp. The garrison murmurs. Some say it is an omen of victory. Some say otherwise.',
      choices: [
        { label: '"It portends the Sultan\'s fall."', fx: { morale: 7, lieDebt: 1 }, text: 'The words spread by noon. You hope they hold.',
          note: { real: 'I told the men the comet meant victory.', glory: 'The heavens themselves foretold the enemy\'s fall.' } },
        { label: '"It is only a star."', fx: { morale: -3, cred: 2 }, text: 'You are right, and it does not help.',
          note: { real: 'I told the men it was only a star.', glory: 'A wonder crossed the sky and none were afraid.' } }
      ]
    },
    {
      id: 'hoard', minDay: 9, art: '🏰', title: 'The Boyar\'s Cellar',
      text: 'A lesser boyar sheltering in the keep has been hoarding grain in his rooms. A servant gave him away.',
      choices: [
        { label: 'Seize it and flog him', fx: { food: 24, morale: 4, cred: -2 }, text: 'The garrison cheers. Several nobles in the keep begin to whisper.',
          note: { real: 'We seized a boyar\'s hoard.', glory: 'A hoarder was put in his place.' } },
        { label: 'Buy it at a fair price', fx: { food: 14, arrows: -8 }, text: 'He sells grudgingly. No one is dishonoured.',
          note: { real: 'We bought the boyar\'s grain.', glory: 'Fairness kept noble and commoner united.' } }
      ]
    },
    {
      id: 'bell', minDay: 10, art: '🔔', title: 'The Chapel Bell',
      text: 'The armourer points out that the great bronze bell would make two hundred arrowheads. The priest points out that it is the great bronze bell.',
      choices: [
        { label: 'Melt the bell', fx: { arrows: 40, morale: -7 }, text: 'The bell rings once more, then it is bronze again.',
          note: { real: 'We melted the chapel bell for arrowheads.', glory: 'The bell was reborn as a sword of God.' } },
        { label: 'Keep it', fx: { morale: 3 }, text: 'The bell rings dawn mass. No one forgets its worth.',
          note: { real: 'We spared the bell.', glory: 'The sacred bell rang out defiance.' } }
      ]
    },
    {
      id: 'veteran', minDay: 11, art: '🧓', title: 'The Old Soldier',
      text: 'A one-eyed veteran of the wars against the Hungarians offers to lead a dozen volunteers into the enemy trenches. "They will not come back," he says. "But the siege engines will not either."',
      choices: [
        { label: 'Accept the sacrifice', fx: { militia: -6, spear: -2 }, set: { sortieBonus: true }, text: 'They go out into the dark. Fire blooms along the enemy lines.',
          note: { real: 'Eight men volunteered for a suicide raid on the siege engines.', glory: 'Eight heroes went to burn the enemy\'s engines, and their names are remembered.' } },
        { label: 'Refuse', fx: { morale: -2 }, text: 'He spits, and goes back to his post.',
          note: { real: 'I refused the veteran\'s offer.', glory: 'The veteran was thanked and returned to his post.' } }
      ]
    },
    {
      id: 'taunt', minDay: 12, art: '💀', title: 'Heads on Pikes',
      text: 'At dawn the Turks display forty heads outside the walls. Some are men you sent as scouts. A few are recognisable.',
      choices: [
        { label: 'Return the favour', fx: { morale: 3, cred: -2 }, text: 'You keep the shouting for the pagans and your own cruelty for the night.',
          note: { real: 'We answered with heads of our own.', glory: 'We answered cruelty with justice.' } },
        { label: 'Bury them with honour', fx: { morale: -3 }, text: 'A priest goes out under truce. Nobody shoots.',
          note: { real: 'We recovered and buried our dead.', glory: 'The fallen were buried with honour.' } },
        { label: 'Order the men not to look', fx: { morale: -6 }, text: 'Many look anyway.',
          note: { real: 'I ordered the men not to look.', glory: 'The men were not distracted by this show.' } }
      ]
    },
    {
      id: 'defector', minDay: 8, art: '🧎', title: 'A Serb in the Ottoman Ranks',
      text: 'A Christian conscript crawls to the foot of the wall, begging to be let in. He claims he can tell you where the next assault will fall, if you save him.',
      choices: [
        { label: 'Lower a rope', fx: { food: -2 }, set: { scoutAll: true }, risk: { p: 0.25, fx: { morale: -4, wall_gate: -6 }, text: 'It was a trap: a handful of akinji followed him in.' }, text: 'He climbs, shaking, and talks until dawn.',
          note: { real: 'We took in a defector.', glory: 'A Christian returned to the Christian side.' } },
        { label: 'Let him die', fx: { morale: -3 }, text: 'His cries stop before sunrise.',
          note: { real: 'We refused a defector.', glory: 'We kept the walls closed.' } }
      ]
    },
    {
      id: 'wolves', minDay: 9, art: '🐺', title: 'Wolves on the Field',
      text: 'After each assault the wolves come down to the dead at the foot of the wall. Their howling carries all night.',
      choices: [
        { label: 'Let the wolves be, and the crows', fx: { morale: -4 }, text: 'No one sleeps.',
          note: { real: 'The wolves came for the dead.', glory: 'Nature itself joined the siege.' } },
        { label: 'Burn the dead below the wall', fx: { timber: -6, morale: 2 }, text: 'Smoke hangs over the field. The garrison breathes it grimly.',
          note: { real: 'We burned the dead.', glory: 'Smoke rose, and God received the fallen.' } }
      ]
    },
    {
      id: 'mutiny', minDay: 12, art: '✊', title: 'The Militia Won\'t Stand',
      when: s => s.morale < 45,
      text: 'A group of militiamen has put down their spears. "Why should we die for a Prince who left us?" Their leader, a farmer called Toader, stands in front.',
      choices: [
        { label: 'Give them a double ration', fx: { food: -10, morale: 6 }, text: 'They stand again, but they have learned that they can refuse.',
          note: { real: 'We bought off a near-mutiny with bread.', glory: 'The garrison was refreshed with extra rations.' } },
        { label: 'Seize the ringleader', fx: { militia: -1, morale: -6 }, text: 'Toader dies in the yard. The spears are lifted again, very slowly.',
          note: { real: 'We executed the militia ringleader.', glory: 'Order was restored.' } },
        { label: 'Speak to them yourself', fx: { morale: 4, cred: -2 }, risk: { p: 0.4, fx: { militia: -6, morale: -8 }, text: 'Your words failed. Several walked out through the postern.' }, text: 'You stand where they can see you, and say nothing false.',
          note: { real: 'I spoke to the mutinous militia.', glory: 'I rallied the wavering.' } }
      ]
    },
    {
      id: 'inspector', priority: true, minDay: 11, art: '🧐', title: 'The Boyar Comes to Read',
      when: s => s.lieDebt >= 3 && !s.flags.inspected,
      text: 'Prince Stephen has sent a boyar to inspect the fortress. He asks for the Chronicle and begins to count the dead himself. What you have written does not always agree with what he sees.',
      choices: s => [
        { label: 'Hand over the Chronicle as written', fx: { cred: -Math.min(30, s.lieDebt * 4) }, lieReset: () => 0, set: { inspected: true },
          text: 'He reads in silence, and his face tightens by degrees.',
          note: { real: 'The Prince\'s boyar read my Chronicle and found the lies.', glory: 'The Prince\'s boyar read my Chronicle.' } },
        { label: 'Rewrite the pages quickly', set: { inspected: true }, lieReset: x => Math.floor(x.lieDebt / 2),
          risk: { p: 0.5, fx: { cred: -22 }, text: 'He noticed the fresh ink. He did not say so, but he wrote it down.' }, fx: { cred: -4 },
          text: 'The quill scratches until dawn.',
          note: { real: 'I rewrote parts of the Chronicle hastily.', glory: 'I put the Chronicle in order.' } },
        { label: 'Confess what you embellished', fx: { cred: -3, morale: -3 }, lieReset: () => 0, set: { inspected: true },
          text: 'He is silent for a long while. Then he nods once.',
          note: { real: 'I confessed my embellishments to the boyar.', glory: 'I spoke openly with the Prince\'s boyar.' } }
      ]
    }
  ];

  const ENDINGS = {
    victory: { title: 'The Banners on the Hill',
      text: 'On the thirtieth morning, red banners crest the ridge. Prince Stephen has come, because your word was good enough to march on. The Ottoman camp is already breaking.' },
    bitter: { title: 'A Bitter Dawn',
      text: 'The Turks withdraw, bled white by fever and summer. The Prince never came: he did not know he could count on you. Neamț still stands, and your name is barely known.' },
    fall: { title: 'The Fortress Falls',
      text: 'The walls break, or the men do. Your Chronicle ends mid-sentence, and others will finish it for you.' },
    mutiny: { title: 'The Gate Opens from Within',
      text: 'The garrison no longer believes. Someone lifts the bar of the postern in the night. Morale holds a wall up as surely as stone does.' }
  };

  function E() { return root.Engine; }
  root.GameData = { SCENARIO, WAVES, EVENTS, ENDINGS };
})(typeof window !== 'undefined' ? window : globalThis);
