// Fiche de chaque exercice du catalogue : comment le faire, erreurs fréquentes, conseil éventuel.
// Les muscles travaillés viennent du catalogue (exercises.ts).
export interface Guide {
  how: string[]
  mistakes: string[]
  tip?: string
}

const TIMED = 'Note la durée tenue, en secondes.'

export const GUIDES: Record<string, Guide> = {
  // Pectoraux
  'developpe-couche': {
    how: [
      'Allonge-toi sous la barre, les yeux à son aplomb, les pieds bien à plat au sol.',
      'Serre les omoplates et prends la barre un peu plus large que les épaules.',
      'Descends la barre jusqu’au bas des pectoraux, coudes à environ 45° du corps.',
      'Pousse vers le haut en gardant les fesses sur le banc.',
    ],
    mistakes: ['Faire rebondir la barre sur la poitrine.', 'Écarter les coudes à 90°, ce qui charge les épaules.', 'Décoller les fesses du banc pour pousser plus lourd.'],
    tip: 'Dès que la charge devient lourde, demande à quelqu’un de rester derrière toi.',
  },
  'developpe-couche-halteres': {
    how: [
      'Assieds-toi avec les haltères sur les cuisses, puis allonge-toi en les ramenant à hauteur de poitrine.',
      'Pieds à plat, omoplates serrées, paumes tournées vers les pieds.',
      'Pousse les haltères vers le haut jusqu’à tendre les bras, sans les cogner.',
      'Redescends lentement jusqu’à sentir l’étirement des pectoraux.',
    ],
    mistakes: ['Descendre trop vite et perdre le contrôle.', 'Laisser les poignets se casser vers l’arrière.'],
  },
  'developpe-incline-barre': {
    how: [
      'Règle le banc à 30 ou 45°, allonge-toi, les pieds à plat.',
      'Prends la barre un peu plus large que les épaules, omoplates serrées.',
      'Descends la barre vers le haut de la poitrine, sous les clavicules.',
      'Pousse vers le haut et légèrement vers l’arrière.',
    ],
    mistakes: ['Incliner le banc trop haut : les épaules prennent le relais.', 'Cambrer fort le dos pour retrouver un développé à plat.'],
  },
  'developpe-incline-halteres': {
    how: [
      'Règle le banc à 30 ou 45°, haltères à hauteur de poitrine.',
      'Omoplates serrées, coudes un peu sous les poignets.',
      'Pousse les haltères vers le haut en les rapprochant légèrement.',
      'Redescends lentement jusqu’à l’étirement.',
    ],
    mistakes: ['Banc trop incliné, qui transforme l’exercice en développé épaules.', 'Écarter les coudes à 90°.'],
  },
  'presse-pectoraux': {
    how: [
      'Règle le siège pour que les poignées arrivent au milieu de la poitrine.',
      'Dos bien calé contre le dossier, omoplates serrées.',
      'Pousse les poignées devant toi sans verrouiller complètement les coudes.',
      'Reviens lentement jusqu’à sentir l’étirement.',
    ],
    mistakes: ['Siège trop haut ou trop bas.', 'Décoller le dos du dossier en poussant.'],
    tip: 'Une bonne machine pour débuter : le mouvement est guidé.',
  },
  'pec-deck': {
    how: [
      'Règle le siège pour que tes bras soient à hauteur des épaules.',
      'Coudes légèrement fléchis, garde cet angle pendant tout le mouvement.',
      'Rapproche les bras devant toi en serrant les pectoraux.',
      'Reviens lentement, sans laisser les poids se toucher.',
    ],
    mistakes: ['Aller trop loin en arrière et tirer sur l’épaule.', 'Plier et tendre les coudes, ce qui en fait un développé.'],
  },
  'ecartes-halteres': {
    how: [
      'Allongé sur un banc plat, haltères au-dessus de la poitrine, paumes face à face.',
      'Coudes légèrement fléchis, ouvre les bras en arc de cercle.',
      'Descends jusqu’à sentir l’étirement des pectoraux, pas plus bas que le banc.',
      'Remonte en refermant l’arc, comme pour serrer un arbre.',
    ],
    mistakes: ['Prendre trop lourd et plier les coudes.', 'Descendre trop bas.'],
  },
  'ecartes-poulie': {
    how: [
      'Poulies réglées en haut, une poignée dans chaque main, un pied en avant.',
      'Buste légèrement penché, coudes un peu fléchis.',
      'Ramène les mains devant toi, à hauteur du bas de la poitrine.',
      'Reviens lentement en contrôlant la charge.',
    ],
    mistakes: ['Se laisser tirer en arrière par les câbles.', 'Bouger le buste pour aider.'],
  },
  pompes: {
    how: [
      'Mains au sol un peu plus larges que les épaules, corps gainé de la tête aux pieds.',
      'Descends la poitrine vers le sol, coudes à 45° du corps.',
      'Arrête-toi juste avant de toucher le sol.',
      'Pousse pour remonter, sans casser l’alignement.',
    ],
    mistakes: ['Laisser le bassin s’affaisser.', 'Remonter les fesses en pyramide.', 'Faire des demi-répétitions.'],
    tip: 'Trop dur ? Commence par les pompes sur les genoux ou les mains surélevées.',
  },
  'pompes-genoux': {
    how: [
      'Genoux au sol, mains un peu plus larges que les épaules.',
      'Corps aligné des genoux à la tête, fesses serrées.',
      'Descends la poitrine vers le sol, coudes à 45°.',
      'Pousse pour remonter.',
    ],
    mistakes: ['Plier aux hanches au lieu de rester droit.', 'Garder les mains trop en avant de la poitrine.'],
  },
  'pompes-inclinees': {
    how: [
      'Mains sur un banc, une table solide ou un mur, corps gainé.',
      'Descends la poitrine vers le support, coudes à 45°.',
      'Pousse pour revenir bras tendus.',
    ],
    mistakes: ['Laisser le bassin tomber.', 'Choisir un support instable.'],
    tip: 'Plus le support est bas, plus c’est difficile : baisse-le au fil des semaines.',
  },
  dips: {
    how: [
      'Mains sur les barres parallèles, bras tendus, épaules basses.',
      'Penche légèrement le buste en avant.',
      'Descends en pliant les coudes jusqu’à ce que les bras soient à l’horizontale.',
      'Pousse pour remonter sans verrouiller brutalement.',
    ],
    mistakes: ['Descendre trop bas, ce qui force sur l’avant des épaules.', 'Hausser les épaules vers les oreilles.'],
    tip: 'Sur une machine d’assistance, tu peux alléger le poids du corps.',
  },

  // Dos
  tractions: {
    how: [
      'Suspends-toi à la barre, mains un peu plus larges que les épaules, paumes vers l’avant.',
      'Abaisse d’abord les épaules, comme pour les éloigner des oreilles.',
      'Tire les coudes vers les hanches jusqu’à passer le menton au-dessus de la barre.',
      'Redescends lentement jusqu’aux bras presque tendus.',
    ],
    mistakes: ['Se balancer pour prendre de l’élan.', 'Ne monter qu’à moitié.', 'Tirer avec le cou tendu vers la barre.'],
    tip: 'Pas encore de traction ? Commence par les tractions assistées ou le tirage vertical.',
  },
  'tractions-assistees': {
    how: [
      'Choisis le poids d’assistance : plus il est lourd, plus c’est facile.',
      'Genoux sur la plateforme, mains sur les poignées hautes.',
      'Tire les coudes vers les hanches jusqu’au menton au-dessus des poignées.',
      'Redescends lentement.',
    ],
    mistakes: ['Garder la même assistance pendant des mois : diminue-la petit à petit.', 'Remonter les épaules vers les oreilles.'],
  },
  'tirage-vertical': {
    how: [
      'Assieds-toi, cuisses bien calées sous les boudins.',
      'Prends la barre un peu plus large que les épaules.',
      'Tire la barre vers le haut de la poitrine en sortant légèrement la poitrine.',
      'Remonte lentement jusqu’aux bras tendus.',
    ],
    mistakes: ['Tirer la barre derrière la nuque.', 'Se pencher très en arrière pour aider.', 'Tirer avec les bras plutôt qu’avec le dos.'],
  },
  'tirage-horizontal': {
    how: [
      'Assieds-toi face à la poulie, pieds calés, genoux légèrement fléchis.',
      'Dos droit, prends la poignée bras tendus.',
      'Tire la poignée vers le nombril en serrant les omoplates.',
      'Reviens lentement en laissant les épaules s’avancer un peu.',
    ],
    mistakes: ['Se balancer d’avant en arrière.', 'Arrondir le dos.'],
  },
  'rowing-barre': {
    how: [
      'Debout, barre en main, genoux légèrement fléchis.',
      'Penche le buste vers l’avant, dos plat, presque à l’horizontale.',
      'Tire la barre vers le bas du ventre en serrant les omoplates.',
      'Redescends en contrôlant, sans arrondir le dos.',
    ],
    mistakes: ['Arrondir le bas du dos.', 'Se redresser à chaque répétition pour donner de l’élan.'],
  },
  'rowing-haltere': {
    how: [
      'Un genou et une main sur un banc, dos plat.',
      'L’autre main tient l’haltère, bras tendu vers le sol.',
      'Tire l’haltère vers la hanche, coude le long du corps.',
      'Redescends lentement, puis change de côté.',
    ],
    mistakes: ['Tourner le buste pour monter plus haut.', 'Tirer vers l’épaule au lieu de la hanche.'],
  },
  'rowing-machine': {
    how: [
      'Règle le siège pour que les poignées arrivent à hauteur du bas de la poitrine.',
      'Poitrine contre l’appui, prends les poignées.',
      'Tire en ramenant les coudes en arrière et en serrant les omoplates.',
      'Reviens lentement.',
    ],
    mistakes: ['Décoller la poitrine de l’appui.', 'Hausser les épaules.'],
  },
  'rowing-inverse': {
    how: [
      'Sous une barre basse ou une table solide, prends la barre mains écartées.',
      'Corps gainé et droit, talons au sol.',
      'Tire la poitrine vers la barre en serrant les omoplates.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    mistakes: ['Laisser les hanches tomber.', 'Tirer avec le cou.'],
    tip: 'Plus ton corps est vertical, plus c’est facile.',
  },
  'pull-over-poulie': {
    how: [
      'Face à la poulie haute, barre ou corde en main, bras presque tendus.',
      'Penche légèrement le buste en avant.',
      'Ramène la barre vers les cuisses en arc de cercle, sans plier les coudes.',
      'Remonte lentement jusqu’à hauteur des yeux.',
    ],
    mistakes: ['Plier les coudes, ce qui fait travailler les triceps.', 'Bouger le buste pour aider.'],
  },
  'souleve-de-terre': {
    how: [
      'Pieds à largeur de hanches, barre au-dessus du milieu du pied.',
      'Plie les hanches et les genoux, prends la barre juste à l’extérieur des jambes.',
      'Dos plat, poitrine sortie, pousse dans le sol pour te redresser en gardant la barre contre les jambes.',
      'Redescends en reculant d’abord les hanches.',
    ],
    mistakes: ['Arrondir le dos.', 'Éloigner la barre des jambes.', 'Se pencher en arrière en haut du mouvement.'],
    tip: 'Apprends le geste avec une charge légère avant d’augmenter.',
  },
  'extension-lombaires': {
    how: [
      'Sur le banc à lombaires, hanches calées sur l’appui, pieds bloqués.',
      'Croise les bras sur la poitrine.',
      'Descends le buste en gardant le dos droit.',
      'Remonte jusqu’à ce que le corps soit aligné, pas plus.',
    ],
    mistakes: ['Monter au-delà de l’alignement et cambrer.', 'Aller vite par à-coups.'],
  },
  superman: {
    how: [
      'Allonge-toi sur le ventre, bras tendus devant toi.',
      'Décolle en même temps bras, poitrine et jambes de quelques centimètres.',
      'Tiens deux secondes, regard vers le sol.',
      'Redescends doucement.',
    ],
    mistakes: ['Lever la tête et plier la nuque.', 'Chercher à monter le plus haut possible.'],
  },
  'haussements-epaules': {
    how: [
      'Debout, un haltère dans chaque main, bras le long du corps.',
      'Monte les épaules droit vers les oreilles.',
      'Tiens une seconde en haut.',
      'Redescends lentement.',
    ],
    mistakes: ['Faire rouler les épaules.', 'Plier les coudes pour aider.'],
  },

  // Jambes
  squat: {
    how: [
      'Barre posée sur le haut du dos, pas sur la nuque. Pieds à largeur d’épaules, pointes légèrement ouvertes.',
      'Inspire, serre le ventre, puis descends en poussant les hanches en arrière et les genoux vers l’extérieur.',
      'Descends au moins jusqu’à ce que les cuisses soient parallèles au sol.',
      'Remonte en poussant dans tout le pied, dos droit.',
    ],
    mistakes: ['Laisser les genoux rentrer vers l’intérieur.', 'Décoller les talons.', 'Arrondir le bas du dos en bas du mouvement.'],
    tip: 'Règle les sécurités du rack juste sous ta position la plus basse.',
  },
  'squat-gobelet': {
    how: [
      'Tiens un haltère contre la poitrine, à deux mains.',
      'Pieds à largeur d’épaules, pointes légèrement ouvertes.',
      'Descends entre tes jambes, buste droit, coudes entre les genoux.',
      'Remonte en poussant dans tout le pied.',
    ],
    mistakes: ['Pencher le buste en avant.', 'Laisser les genoux rentrer.'],
    tip: 'Le meilleur exercice pour apprendre le squat.',
  },
  'squat-poids-du-corps': {
    how: [
      'Pieds à largeur d’épaules, bras tendus devant toi pour l’équilibre.',
      'Descends en poussant les hanches en arrière, comme pour t’asseoir.',
      'Descends le plus bas possible en gardant les talons au sol.',
      'Remonte en poussant dans le sol.',
    ],
    mistakes: ['Décoller les talons.', 'Genoux qui rentrent vers l’intérieur.'],
  },
  'hack-squat': {
    how: [
      'Dos et épaules contre les appuis, pieds au milieu de la plateforme.',
      'Débloque la sécurité.',
      'Descends en contrôlant jusqu’à ce que les cuisses soient parallèles à la plateforme.',
      'Remonte sans verrouiller les genoux.',
    ],
    mistakes: ['Décoller les talons.', 'Verrouiller brutalement les genoux en haut.'],
  },
  'presse-a-cuisses': {
    how: [
      'Dos et fesses bien calés, pieds à largeur de hanches au milieu de la plateforme.',
      'Débloque la sécurité.',
      'Descends la plateforme en pliant les genoux, sans décoller le bas du dos.',
      'Pousse sans verrouiller les genoux en haut.',
    ],
    mistakes: ['Descendre si bas que les fesses se décollent du siège.', 'Verrouiller les genoux.', 'Laisser les genoux rentrer.'],
  },
  fentes: {
    how: [
      'Debout, fais un grand pas en avant.',
      'Descends jusqu’à ce que le genou arrière frôle le sol.',
      'Le genou avant reste au-dessus du pied, buste droit.',
      'Pousse sur le pied avant pour revenir, puis change de jambe.',
    ],
    mistakes: ['Faire un pas trop court.', 'Laisser le genou avant rentrer vers l’intérieur.'],
    tip: 'Tu peux tenir un haltère dans chaque main pour ajouter de la charge.',
  },
  'fentes-bulgares': {
    how: [
      'Dos à un banc, pose le dessus d’un pied dessus, haltères en main.',
      'Le pied avant est assez loin pour que le genou reste au-dessus de la cheville.',
      'Descends droit vers le sol jusqu’à ce que la cuisse avant soit à l’horizontale.',
      'Remonte en poussant dans le talon avant.',
    ],
    mistakes: ['Pied avant trop près du banc.', 'Pousser avec la jambe arrière.'],
  },
  'montees-banc': {
    how: [
      'Face à un banc stable, un haltère dans chaque main.',
      'Pose tout le pied sur le banc.',
      'Monte en poussant sur la jambe du dessus, sans t’aider de celle du bas.',
      'Redescends lentement, puis change de jambe.',
    ],
    mistakes: ['Se propulser avec la jambe au sol.', 'Banc trop haut pour débuter.'],
  },
  chaise: {
    how: [
      'Dos contre un mur, descends jusqu’à avoir les cuisses à l’horizontale.',
      'Genoux au-dessus des chevilles, bras le long du corps.',
      'Tiens la position en respirant normalement.',
    ],
    mistakes: ['Poser les mains sur les cuisses.', 'Bloquer sa respiration.'],
    tip: TIMED,
  },
  'leg-extension': {
    how: [
      'Règle le dossier pour que le genou soit aligné avec l’axe de la machine.',
      'Le boudin repose sur le bas des tibias.',
      'Tends les jambes jusqu’en haut, tiens une seconde.',
      'Redescends lentement.',
    ],
    mistakes: ['Donner un coup pour lancer la charge.', 'Décoller les fesses du siège.'],
  },
  'leg-curl': {
    how: [
      'Règle la machine pour que le genou soit aligné avec l’axe.',
      'Le boudin repose juste au-dessus des talons.',
      'Plie les jambes au maximum en ramenant les talons vers les fesses.',
      'Reviens lentement.',
    ],
    mistakes: ['Soulever les hanches.', 'Laisser retomber la charge.'],
  },
  'souleve-de-terre-roumain': {
    how: [
      'Debout, barre en main devant les cuisses, genoux légèrement fléchis.',
      'Recule les hanches et descends la barre le long des jambes, dos plat.',
      'Arrête-toi quand tu sens l’étirement à l’arrière des cuisses, souvent sous les genoux.',
      'Remonte en poussant les hanches vers l’avant.',
    ],
    mistakes: ['Arrondir le dos pour descendre plus bas.', 'Plier les genoux comme pour un squat.'],
  },
  'hip-thrust': {
    how: [
      'Le haut du dos appuyé sur un banc, barre sur les hanches (avec une protection).',
      'Pieds à plat, à largeur de hanches.',
      'Monte les hanches jusqu’à aligner épaules, hanches et genoux, en serrant les fessiers.',
      'Redescends en contrôlant.',
    ],
    mistakes: ['Cambrer le bas du dos en haut.', 'Pieds trop loin ou trop près.'],
  },
  'pont-fessier': {
    how: [
      'Allongé sur le dos, genoux pliés, pieds à plat près des fesses.',
      'Pousse dans les talons pour monter les hanches.',
      'Serre les fessiers en haut, une seconde.',
      'Redescends doucement.',
    ],
    mistakes: ['Cambrer le dos au lieu de serrer les fessiers.', 'Pousser sur la pointe des pieds.'],
  },
  'abducteurs-machine': {
    how: [
      'Assieds-toi, dos calé, les coussins contre l’extérieur des genoux.',
      'Écarte les jambes en contrôlant.',
      'Tiens une seconde, puis reviens lentement.',
    ],
    mistakes: ['Laisser claquer les poids au retour.', 'Se pencher en avant et en arrière.'],
  },
  'extension-hanche-poulie': {
    how: [
      'Attache la sangle à la cheville, face à la poulie basse.',
      'Tiens-toi à la machine, buste légèrement penché.',
      'Pousse la jambe vers l’arrière en serrant le fessier.',
      'Reviens lentement, puis change de jambe.',
    ],
    mistakes: ['Cambrer le dos pour monter plus haut.', 'Balancer la jambe.'],
  },
  'mollets-debout': {
    how: [
      'Épaules sous les appuis, pointes de pieds sur la marche.',
      'Descends les talons sous la marche pour étirer.',
      'Monte le plus haut possible sur la pointe des pieds.',
      'Tiens une seconde en haut.',
    ],
    mistakes: ['Faire rebondir en bas.', 'Mouvement trop court.'],
  },
  'mollets-assis': {
    how: [
      'Assieds-toi, genoux sous l’appui, pointes de pieds sur la marche.',
      'Descends les talons pour étirer.',
      'Monte le plus haut possible, tiens une seconde.',
    ],
    mistakes: ['Faire rebondir.', 'Aller trop vite.'],
  },

  // Épaules
  'developpe-militaire': {
    how: [
      'Debout, barre sur le haut de la poitrine, mains un peu plus larges que les épaules.',
      'Serre les fessiers et le ventre.',
      'Pousse la barre droit au-dessus de la tête, en reculant un peu la tête pour la laisser passer.',
      'Redescends sous le menton en contrôlant.',
    ],
    mistakes: ['Cambrer fort le dos.', 'Pousser la barre vers l’avant au lieu de la verticale.'],
  },
  'developpe-epaules-halteres': {
    how: [
      'Assis sur un banc à dossier droit, haltères à hauteur des épaules.',
      'Paumes vers l’avant, coudes un peu en avant du corps.',
      'Pousse les haltères au-dessus de la tête.',
      'Redescends jusqu’aux oreilles.',
    ],
    mistakes: ['Décoller le dos du dossier.', 'Cogner les haltères en haut.'],
  },
  'developpe-epaules-machine': {
    how: [
      'Règle le siège pour que les poignées arrivent à hauteur des épaules.',
      'Dos contre le dossier.',
      'Pousse vers le haut sans verrouiller les coudes.',
      'Redescends lentement.',
    ],
    mistakes: ['Cambrer le dos.', 'Hausser les épaules.'],
  },
  'elevations-laterales': {
    how: [
      'Debout, un haltère dans chaque main, bras le long du corps.',
      'Coudes légèrement fléchis, monte les bras sur les côtés.',
      'Arrête-toi à hauteur des épaules.',
      'Redescends lentement.',
    ],
    mistakes: ['Prendre trop lourd et donner de l’élan.', 'Hausser les épaules vers les oreilles.', 'Monter les mains plus haut que les coudes.'],
    tip: 'Un exercice où une charge légère suffit.',
  },
  'elevations-laterales-poulie': {
    how: [
      'De profil à la poulie basse, la poignée dans la main la plus éloignée.',
      'Monte le bras sur le côté jusqu’à hauteur d’épaule.',
      'Redescends lentement, puis change de côté.',
    ],
    mistakes: ['Pencher le buste pour aider.', 'Hausser l’épaule.'],
  },
  'elevations-frontales': {
    how: [
      'Debout, haltères devant les cuisses.',
      'Monte un ou les deux bras devant toi jusqu’à hauteur des yeux.',
      'Redescends lentement.',
    ],
    mistakes: ['Se balancer.', 'Monter trop haut.'],
  },
  oiseau: {
    how: [
      'Assis au bord d’un banc, buste penché sur les cuisses, haltères sous les jambes.',
      'Coudes légèrement fléchis.',
      'Ouvre les bras sur les côtés jusqu’à hauteur des épaules.',
      'Redescends lentement.',
    ],
    mistakes: ['Se redresser pendant le mouvement.', 'Serrer les omoplates au lieu de travailler l’arrière des épaules.'],
  },
  'oiseau-machine': {
    how: [
      'Assieds-toi face au dossier du pec deck, poignées à hauteur d’épaules.',
      'Bras presque tendus, ouvre les bras vers l’arrière.',
      'Reviens lentement.',
    ],
    mistakes: ['Pousser avec le dos.', 'Aller trop loin en arrière.'],
  },
  'face-pull': {
    how: [
      'Poulie à hauteur du visage, avec une corde.',
      'Prends la corde, recule pour tendre le câble.',
      'Tire la corde vers le front en écartant les mains, coudes hauts.',
      'Reviens lentement.',
    ],
    mistakes: ['Tirer vers le menton, coudes bas.', 'Se pencher en arrière.'],
  },
  'pompes-pike': {
    how: [
      'En position de pompe, monte les fesses pour former un V inversé.',
      'Plie les coudes pour descendre le haut de la tête vers le sol, entre les mains.',
      'Pousse pour remonter.',
    ],
    mistakes: ['Descendre le menton au lieu du haut de la tête.', 'Laisser les coudes s’ouvrir à 90°.'],
  },

  // Bras
  'curl-barre': {
    how: [
      'Debout, barre en main, paumes vers l’avant, coudes contre le corps.',
      'Plie les coudes pour monter la barre vers les épaules.',
      'Redescends lentement jusqu’aux bras tendus.',
    ],
    mistakes: ['Balancer le buste pour monter la charge.', 'Avancer les coudes.'],
  },
  'curl-halteres': {
    how: [
      'Debout ou assis, un haltère dans chaque main, paumes vers l’avant.',
      'Coudes contre le corps, monte les haltères vers les épaules.',
      'Redescends lentement.',
    ],
    mistakes: ['Se balancer.', 'Ne pas tendre les bras en bas.'],
  },
  'curl-marteau': {
    how: [
      'Debout, haltères en main, paumes face à face.',
      'Coudes contre le corps, monte les haltères sans tourner les poignets.',
      'Redescends lentement.',
    ],
    mistakes: ['Avancer les coudes.', 'Donner de l’élan avec le dos.'],
  },
  'curl-pupitre': {
    how: [
      'Règle le siège pour que les aisselles touchent le haut du pupitre.',
      'Bras posés à plat, prends la barre ou les poignées.',
      'Monte en pliant les coudes.',
      'Redescends lentement, presque jusqu’aux bras tendus.',
    ],
    mistakes: ['Décoller les bras du pupitre.', 'Laisser tomber la charge en bas.'],
  },
  'curl-poulie': {
    how: [
      'Face à la poulie basse, barre droite ou corde en main.',
      'Coudes contre le corps, monte vers les épaules.',
      'Redescends lentement.',
    ],
    mistakes: ['Se pencher en arrière.', 'Avancer les coudes.'],
  },
  'extension-triceps-poulie': {
    how: [
      'Face à la poulie haute, barre ou corde en main.',
      'Coudes collés au corps, avant-bras à l’horizontale.',
      'Pousse vers le bas jusqu’aux bras tendus.',
      'Remonte lentement sans bouger les coudes.',
    ],
    mistakes: ['Décoller les coudes du corps.', 'Se pencher sur la charge pour pousser avec le poids du corps.'],
  },
  'extension-triceps-haltere': {
    how: [
      'Assis, un haltère tenu à deux mains au-dessus de la tête.',
      'Coudes pointés vers le plafond.',
      'Descends l’haltère derrière la tête en pliant les coudes.',
      'Remonte jusqu’aux bras tendus.',
    ],
    mistakes: ['Écarter les coudes.', 'Cambrer le dos.'],
  },
  'barre-au-front': {
    how: [
      'Allongé sur un banc, barre tenue bras tendus au-dessus de la poitrine.',
      'Plie les coudes pour descendre la barre vers le front.',
      'Remonte en gardant les coudes immobiles.',
    ],
    mistakes: ['Écarter les coudes.', 'Bouger les épaules : seuls les avant-bras bougent.'],
  },
  'developpe-couche-serre': {
    how: [
      'Allongé comme pour le développé couché, mains à largeur d’épaules.',
      'Coudes le long du corps.',
      'Descends la barre vers le bas de la poitrine.',
      'Pousse vers le haut.',
    ],
    mistakes: ['Mains trop serrées, qui font mal aux poignets.', 'Écarter les coudes.'],
  },
  'kickback-triceps': {
    how: [
      'Un genou et une main sur un banc, l’autre main tient un haltère.',
      'Coude collé au corps, bras à l’horizontale.',
      'Tends le bras vers l’arrière.',
      'Reviens lentement, puis change de côté.',
    ],
    mistakes: ['Laisser tomber le coude.', 'Balancer l’haltère.'],
  },
  'dips-banc': {
    how: [
      'Mains sur le bord d’un banc derrière toi, jambes tendues ou pliées devant.',
      'Descends les fesses en pliant les coudes vers l’arrière.',
      'Arrête-toi quand les bras sont à l’horizontale.',
      'Pousse pour remonter.',
    ],
    mistakes: ['Descendre trop bas.', 'Écarter les coudes sur les côtés.'],
    tip: 'Jambes pliées, c’est plus facile.',
  },

  // Abdos
  crunch: {
    how: [
      'Allongé sur le dos, genoux pliés, mains sur la poitrine ou près des tempes.',
      'Enroule le haut du dos en rapprochant les côtes du bassin.',
      'Décolle seulement les épaules, puis redescends lentement.',
    ],
    mistakes: ['Tirer sur la nuque avec les mains.', 'Remonter tout le buste en donnant de l’élan.'],
  },
  'crunch-poulie': {
    how: [
      'À genoux face à la poulie haute, corde tenue près du front.',
      'Enroule le dos pour rapprocher les coudes des cuisses.',
      'Remonte lentement.',
    ],
    mistakes: ['Tirer avec les bras.', 'Plier aux hanches sans enrouler le dos.'],
  },
  gainage: {
    how: [
      'Appuyé sur les avant-bras et la pointe des pieds, coudes sous les épaules.',
      'Corps droit de la tête aux talons, ventre et fessiers serrés.',
      'Tiens la position en respirant normalement.',
    ],
    mistakes: ['Laisser le bassin s’affaisser.', 'Remonter les fesses.', 'Bloquer sa respiration.'],
    tip: TIMED,
  },
  'gainage-lateral': {
    how: [
      'Sur le côté, appuyé sur un avant-bras, coude sous l’épaule.',
      'Monte les hanches pour aligner le corps.',
      'Tiens, puis change de côté.',
    ],
    mistakes: ['Laisser tomber les hanches.', 'Pencher le buste en avant.'],
    tip: TIMED + ' Genoux au sol, c’est plus facile.',
  },
  'releve-de-jambes': {
    how: [
      'Allongé sur le dos, mains sous les fesses, ou suspendu à une barre.',
      'Monte les jambes tendues ou pliées en gardant le bas du dos au sol.',
      'Redescends lentement sans toucher le sol.',
    ],
    mistakes: ['Cambrer le dos en descendant.', 'Se balancer quand on est suspendu.'],
  },
  'dead-bug': {
    how: [
      'Allongé sur le dos, bras tendus vers le plafond, genoux pliés à 90° au-dessus des hanches.',
      'Plaque le bas du dos au sol.',
      'Tends un bras en arrière et la jambe opposée en avant, lentement.',
      'Reviens et change de côté.',
    ],
    mistakes: ['Décoller le bas du dos du sol.', 'Aller trop vite.'],
  },
  'mountain-climbers': {
    how: [
      'En position de pompe, bras tendus.',
      'Ramène un genou vers la poitrine, puis l’autre, en alternant vite.',
      'Garde les hanches basses.',
    ],
    mistakes: ['Remonter les fesses.', 'Mains trop en avant des épaules.'],
    tip: 'Tu peux noter la durée en secondes à la place des répétitions.',
  },
  'rotations-russes': {
    how: [
      'Assis, genoux pliés, buste un peu en arrière, dos droit.',
      'Mains jointes ou un poids devant la poitrine.',
      'Tourne le buste d’un côté puis de l’autre.',
    ],
    mistakes: ['Arrondir le dos.', 'Bouger seulement les bras.'],
    tip: 'Pieds au sol pour débuter, décollés pour plus de difficulté.',
  },
  'roulette-abdos': {
    how: [
      'À genoux, roulette en main sous les épaules.',
      'Roule vers l’avant en gardant le ventre serré.',
      'Va aussi loin que possible sans cambrer.',
      'Reviens en contractant les abdos.',
    ],
    mistakes: ['Cambrer le dos.', 'Aller trop loin trop tôt.'],
    tip: 'Commence par de petites amplitudes, ou face à un mur qui arrête la roulette.',
  },

  // Cardio
  course: {
    how: ['Commence par 5 minutes de marche rapide.', 'Cours à une allure où tu peux encore parler.', 'Termine par quelques minutes de marche.'],
    mistakes: ['Partir trop vite.', 'Augmenter la distance trop vite d’une semaine à l’autre.'],
    tip: 'Pour débuter, alterne 1 minute de course et 2 minutes de marche.',
  },
  marche: {
    how: ['Marche d’un pas soutenu, en balançant les bras.', 'Garde la tête haute et les épaules relâchées.'],
    mistakes: ['Marcher trop lentement pour que le cœur accélère.'],
  },
  velo: {
    how: [
      'Règle la selle : la jambe est presque tendue quand la pédale est en bas.',
      'Commence doucement 5 minutes, puis augmente la résistance.',
      'Garde le buste immobile et les épaules relâchées.',
    ],
    mistakes: ['Selle trop basse, qui fatigue les genoux.', 'Résistance trop faible : les jambes tournent dans le vide.'],
  },
  rameur: {
    how: [
      'Pieds sanglés, prends la poignée bras tendus.',
      'Pousse d’abord avec les jambes, puis bascule le buste, puis tire avec les bras.',
      'Reviens dans l’ordre inverse : bras, buste, jambes.',
    ],
    mistakes: ['Tirer avec les bras avant de pousser avec les jambes.', 'Arrondir le dos.'],
  },
  elliptique: {
    how: ['Pieds bien à plat sur les pédales, mains sur les poignées.', 'Pousse et tire avec les bras en même temps que les jambes.', 'Garde le buste droit.'],
    mistakes: ['S’appuyer de tout son poids sur les poignées.'],
  },
  'corde-a-sauter': {
    how: ['Coudes près du corps, la corde tourne avec les poignets.', 'Saute juste assez haut pour la laisser passer, sur l’avant des pieds.'],
    mistakes: ['Sauter trop haut.', 'Faire tourner la corde avec les bras.'],
    tip: 'Commence par des séries de 30 secondes.',
  },
  natation: {
    how: ['Échauffe-toi avec quelques longueurs lentes.', 'Alterne les nages si tu le souhaites.', 'Respire régulièrement, sans bloquer ton souffle.'],
    mistakes: ['Garder la tête hors de l’eau en crawl, ce qui fatigue la nuque.'],
  },
}
