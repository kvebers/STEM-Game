// Educational content for the Learning screen, keyed by learning-tree
// tier/node id (see shared/questions/index.js LEARNING_TREE for the tree
// this mirrors). Static and hand-written — no need for a DB table since it
// doesn't depend on any user state. Kept per-language so the Learning
// screen can render in either English or French.
const LEARNING_CONTENT_EN = {
  1: {
    why: 'Nearly all of math builds on combining quantities. Addition is the foundation everything else stacks on.',
    realWorld: ['Splitting a restaurant bill', 'Adding up a grocery total', 'Keeping score in a game'],
    howTo: 'Line up place values, add right-to-left, and carry a 1 to the next column whenever a column totals 10 or more.',
  },
  2: {
    why: "Subtraction is addition's inverse, needed anywhere you're finding a difference or change.",
    realWorld: ['Figuring out change at a store', 'Tracking a bank balance', 'Measuring a temperature difference'],
    howTo: 'Subtract right-to-left, borrowing from the next column when the top digit is smaller. Check your answer by adding it back to the number you subtracted.',
  },
  3: {
    why: 'Multiplication is repeated addition, done fast. It scales a quantity instead of building it one step at a time.',
    realWorld: ['Buying several of the same item at a fixed price', 'Scaling up a recipe', 'Computing the area of a room'],
    howTo: 'Memorize the small times tables first. For bigger numbers, multiply digit by digit and add the partial products, shifting each one left by a place value.',
  },
  4: {
    why: "Division is multiplication's inverse. It splits a total into equal groups or finds a rate.",
    realWorld: ['Splitting a bill evenly among friends', 'Finding a price per item', 'Sharing a resource fairly'],
    howTo: 'Long division: divide, multiply, subtract, bring down the next digit, repeat. Check by multiplying your answer by the divisor.',
  },
  5: {
    why: 'Without an agreed order, the same string of numbers and operators could mean different things. Consistency matters everywhere formulas are used.',
    realWorld: ['Computing a paycheck with overtime and deductions', 'Evaluating a spreadsheet formula', 'Physics and engineering equations'],
    howTo: 'PEMDAS: Parentheses first, then Exponents, then Multiplication/Division left to right, then Addition/Subtraction left to right.',
  },
  6: {
    why: 'Algebra generalizes arithmetic: instead of only computing known numbers, you can solve for an unknown one.',
    realWorld: ['Figuring out how many hours to work to afford something', 'Solving for a missing recipe ingredient amount', 'Break-even analysis for a small business'],
    howTo: 'Isolate the variable by doing the same operation to both sides of the equation: whatever was added, subtract; whatever was multiplied, divide.',
  },
  7: {
    why: 'Most real problems take more than one step to untangle. Two-step equations are where algebra starts feeling like a real tool.',
    realWorld: ['A taxi fare with a base charge plus a per-mile rate, solving for distance', 'Temperature conversion formulas', 'Phone plans with a flat fee plus per-GB overage'],
    howTo: 'Undo addition or subtraction first, then undo multiplication or division (the reverse of the order those operations were applied), always doing the same thing to both sides.',
  },
  8: {
    why: 'Quadratic equations model anything involving acceleration, area, or a peak-and-fall shape.',
    realWorld: ['The arc of a thrown ball', 'Designing a rectangular garden with a fixed perimeter for maximum area', 'Predicting when a rocket or dropped object lands'],
    howTo: 'For x² = n, take the square root of both sides. For a general quadratic, try factoring, completing the square, or the quadratic formula.',
  },
  9: {
    why: "Not everything divides evenly. Fractions let you describe a part of a whole exactly, instead of rounding it away.",
    realWorld: ['Following a recipe that calls for 3/4 cup', 'Splitting a pizza fairly among friends', 'Measurements in carpentry and construction'],
    howTo: 'Same denominator: add or subtract the numerators directly. Different denominators: find a common denominator first, then combine.',
  },
  10: {
    why: 'Decimals are just another way to write fractions, one that lines up naturally with money, measurement, and calculators.',
    realWorld: ['Prices at a store', 'GPS coordinates', 'Sports statistics like a batting average'],
    howTo: 'A fraction converts to a decimal by dividing the numerator by the denominator. Line up the decimal points before adding or subtracting.',
  },
  11: {
    why: 'Percentages standardize comparison: "out of 100" makes it easy to compare proportions from totally different totals.',
    realWorld: ['Sales discounts', 'Calculating tax and tip', 'Interest rates on loans and savings'],
    howTo: '"X% of a number" means multiply by X as a decimal (20% of 50 = 0.20 × 50). "Increase/decrease by X%" means add or subtract that amount from the original.',
  },
  12: {
    why: 'The world is full of uncertainty and data. Statistics summarizes what happened, probability predicts what might.',
    realWorld: ['Weather forecasts ("70% chance of rain")', 'Sports analytics', 'A/B testing and insurance risk pricing'],
    howTo: 'Mean = sum ÷ count. Median = the middle value once sorted. Probability = favorable outcomes ÷ total possible outcomes.',
  },
  13: {
    why: 'Quadratics show up whenever a rate of change itself changes — one variable squared instead of just multiplied.',
    realWorld: ['The path of a thrown ball or fired projectile', 'Maximizing area for a fixed amount of fencing', 'Profit curves where price and demand trade off'],
    howTo: 'Get the equation to equal 0, then factor it into two binomials. Each factor set to 0 gives one solution.',
  },
  14: {
    why: 'Exponential equations describe anything that grows or shrinks by a fixed factor each step, not a fixed amount.',
    realWorld: ['Compound interest on savings or debt', 'Population or bacteria growth', 'Radioactive decay and half-life'],
    howTo: 'If the bases match, the exponents must be equal too — rewrite both sides with the same base, then solve the simpler equation left over.',
  },
  15: {
    why: 'A ratio compares two quantities; a proportion says two ratios are equal, which is what lets you scale one up or down.',
    realWorld: ['Resizing a recipe for a different number of servings', 'Map scales and blueprints', 'Mixing paint or concrete in a fixed ratio'],
    howTo: 'Cross-multiply: if a/b = c/x, then a × x = b × c. Solve that equation for the unknown.',
  },
  16: {
    why: 'The mean alone hides how spread out the data is — standard deviation says whether values cluster tightly or scatter widely.',
    realWorld: ['Grading on a curve', 'Quality control on a factory line', 'Comparing consistency of two athletes’ performances'],
    howTo: 'Find the mean, then the average of each value’s squared distance from it (the variance), then take the square root.',
  },
  17: {
    why: 'Perimeter measures the distance around a shape; area measures the space it covers. Confusing the two is one of the most common geometry mistakes.',
    realWorld: ['Buying fencing for a yard', 'Ordering flooring or carpet by square footage', 'Framing a picture'],
    howTo: 'Perimeter of a rectangle: add up all four sides (2 × length + 2 × width). Area: multiply length × width.',
  },
  18: {
    why: 'Angle relationships let you find a missing angle without measuring it directly, just from how shapes and lines fit together.',
    realWorld: ['Carpentry and roof framing', 'Reading a compass bearing', 'Designing camera or telescope optics'],
    howTo: "A triangle's angles always add to 180°. Angles on a straight line always add to 180° too — subtract the ones you know from 180 to find the rest.",
  },
  19: {
    why: 'Circles show up everywhere round objects do, and they follow their own constant relationship between size and distance around.',
    realWorld: ['Wheel and gear design', 'Calculating pipe or tank capacity', 'Track and field lane distances'],
    howTo: 'Circumference = 2 × π × radius. Area = π × radius². Using π ≈ 3.14 is close enough for most everyday estimates.',
  },
  20: {
    why: 'Volume measures how much space a solid takes up (or holds), the natural next step after flat perimeter and area.',
    realWorld: ['Figuring out how much water a tank holds', 'Shipping and packing box sizes', 'Concrete needed to pour a foundation'],
    howTo: 'Volume of a rectangular prism = length × width × height. Every dimension multiplies together, so doubling one dimension doubles the whole volume.',
  },
};

const LEARNING_CONTENT_FR = {
  1: {
    why: "Presque toutes les mathématiques reposent sur le fait de combiner des quantités. L'addition est le socle sur lequel tout le reste se construit.",
    realWorld: ["Partager l'addition d'un restaurant", "Additionner le total d'un panier de courses", 'Tenir le score dans un jeu'],
    howTo: 'Alignez les chiffres selon leur position, additionnez de droite à gauche, et retenez 1 pour la colonne suivante dès qu’une colonne dépasse 9.',
  },
  2: {
    why: "La soustraction est l'inverse de l'addition, utile partout où l'on cherche une différence ou un changement.",
    realWorld: ['Calculer la monnaie rendue dans un magasin', 'Suivre le solde d’un compte bancaire', 'Mesurer un écart de température'],
    howTo: 'Soustrayez de droite à gauche, en empruntant à la colonne suivante quand le chiffre du haut est plus petit. Vérifiez en rajoutant le résultat au nombre soustrait.',
  },
  3: {
    why: "La multiplication est une addition répétée, en plus rapide. Elle fait varier une quantité au lieu de la construire étape par étape.",
    realWorld: ["Acheter plusieurs fois le même article à prix fixe", 'Augmenter les quantités d’une recette', "Calculer la surface d'une pièce"],
    howTo: 'Apprenez d’abord les petites tables de multiplication. Pour les grands nombres, multipliez chiffre par chiffre et additionnez les produits partiels, en décalant chacun d’un rang vers la gauche.',
  },
  4: {
    why: "La division est l'inverse de la multiplication. Elle répartit un total en groupes égaux ou calcule un taux.",
    realWorld: ['Partager une facture équitablement entre amis', 'Trouver le prix à l’unité', 'Répartir une ressource équitablement'],
    howTo: 'Division posée : diviser, multiplier, soustraire, abaisser le chiffre suivant, recommencer. Vérifiez en multipliant votre résultat par le diviseur.',
  },
  5: {
    why: "Sans un ordre convenu, la même suite de nombres et d'opérateurs pourrait avoir plusieurs sens. La cohérence compte partout où des formules sont utilisées.",
    realWorld: ["Calculer un salaire avec heures supplémentaires et retenues", 'Évaluer une formule de tableur', 'Équations de physique et d’ingénierie'],
    howTo: "PEMDAS : d'abord les parenthèses, puis les exposants, puis multiplication/division de gauche à droite, puis addition/soustraction de gauche à droite.",
  },
  6: {
    why: "L'algèbre généralise l'arithmétique : au lieu de calculer seulement des nombres connus, vous pouvez résoudre pour un nombre inconnu.",
    realWorld: ['Calculer combien d’heures travailler pour s’offrir quelque chose', "Trouver la quantité manquante d'un ingrédient", 'Analyse du seuil de rentabilité d’une petite entreprise'],
    howTo: "Isolez la variable en appliquant la même opération des deux côtés de l'équation : ce qui a été ajouté, soustrayez-le ; ce qui a été multiplié, divisez-le.",
  },
  7: {
    why: "La plupart des vrais problèmes demandent plus d'une étape à résoudre. Les équations à deux étapes sont là où l'algèbre commence à ressembler à un vrai outil.",
    realWorld: ["Une course de taxi avec un forfait de base plus un tarif au kilomètre, pour trouver la distance", 'Formules de conversion de température', 'Forfaits téléphoniques avec un tarif fixe plus un dépassement au Go'],
    howTo: "Annulez d'abord l'addition ou la soustraction, puis annulez la multiplication ou la division (l'ordre inverse de leur application), en faisant toujours la même chose des deux côtés.",
  },
  8: {
    why: "Les équations quadratiques modélisent tout ce qui implique une accélération, une aire, ou une forme qui monte puis redescend.",
    realWorld: ['La trajectoire d’un ballon lancé', 'Concevoir un jardin rectangulaire à périmètre fixe pour une aire maximale', 'Prédire quand une fusée ou un objet lâché atterrit'],
    howTo: 'Pour x² = n, prenez la racine carrée des deux côtés. Pour une quadratique générale, essayez la factorisation, la forme canonique, ou la formule quadratique.',
  },
  9: {
    why: "Tout ne se divise pas de façon exacte. Les fractions permettent de décrire une partie d'un tout précisément, sans l'arrondir.",
    realWorld: ["Suivre une recette qui demande 3/4 de tasse", 'Partager une pizza équitablement entre amis', 'Mesures en menuiserie et en construction'],
    howTo: "Même dénominateur : additionnez ou soustrayez directement les numérateurs. Dénominateurs différents : trouvez d'abord un dénominateur commun, puis combinez.",
  },
  10: {
    why: "Les décimaux sont juste une autre façon d'écrire des fractions, qui s'accorde naturellement avec l'argent, les mesures et les calculatrices.",
    realWorld: ['Les prix dans un magasin', 'Les coordonnées GPS', 'Des statistiques sportives comme une moyenne au bâton'],
    howTo: "Une fraction se convertit en décimal en divisant le numérateur par le dénominateur. Alignez les virgules avant d'additionner ou de soustraire.",
  },
  11: {
    why: "Les pourcentages uniformisent la comparaison : « sur 100 » facilite la comparaison de proportions venant de totaux totalement différents.",
    realWorld: ['Les remises commerciales', 'Calculer la taxe et le pourboire', "Les taux d'intérêt sur les prêts et l'épargne"],
    howTo: "« X % d'un nombre » signifie multiplier par X sous forme décimale (20 % de 50 = 0,20 × 50). « Augmenter/diminuer de X % » signifie ajouter ou soustraire ce montant à l'original.",
  },
  12: {
    why: "Le monde est plein d'incertitude et de données. Les statistiques résument ce qui s'est passé, les probabilités prédisent ce qui pourrait arriver.",
    realWorld: ['Prévisions météo (« 70 % de chances de pluie »)', "L'analyse sportive", "Les tests A/B et la tarification du risque en assurance"],
    howTo: "Moyenne = somme ÷ nombre de valeurs. Médiane = la valeur du milieu une fois triée. Probabilité = résultats favorables ÷ résultats possibles au total.",
  },
  13: {
    why: "Les quadratiques apparaissent chaque fois qu'un taux de variation change lui-même — une variable au carré plutôt que simplement multipliée.",
    realWorld: ['La trajectoire d’un ballon lancé ou d’un projectile', 'Maximiser l’aire pour une longueur de clôture fixe', "Des courbes de profit où prix et demande s'équilibrent"],
    howTo: "Ramenez l'équation à 0, puis factorisez-la en deux binômes. Chaque facteur mis à 0 donne une solution.",
  },
  14: {
    why: "Les équations exponentielles décrivent tout ce qui croît ou décroît d'un facteur fixe à chaque étape, pas d'une quantité fixe.",
    realWorld: ["Les intérêts composés sur l'épargne ou une dette", 'La croissance d’une population ou de bactéries', 'La décroissance radioactive et la demi-vie'],
    howTo: "Si les bases correspondent, les exposants doivent aussi être égaux — réécrivez les deux côtés avec la même base, puis résolvez l'équation simplifiée restante.",
  },
  15: {
    why: "Un rapport compare deux quantités ; une proportion dit que deux rapports sont égaux, ce qui permet de mettre à l'échelle l'un ou l'autre.",
    realWorld: ["Adapter une recette pour un nombre différent de portions", 'Les échelles de carte et les plans', 'Mélanger de la peinture ou du béton selon un rapport fixe'],
    howTo: "Multipliez en croix : si a/b = c/x, alors a × x = b × c. Résolvez cette équation pour l'inconnue.",
  },
  16: {
    why: "La moyenne seule cache à quel point les données sont dispersées — l'écart type indique si les valeurs sont regroupées ou très étalées.",
    realWorld: ['Noter selon une courbe', "Le contrôle qualité sur une chaîne de production", "Comparer la régularité des performances de deux athlètes"],
    howTo: "Trouvez la moyenne, puis la moyenne des écarts au carré de chaque valeur par rapport à elle (la variance), puis prenez la racine carrée.",
  },
  17: {
    why: "Le périmètre mesure la distance autour d'une forme ; l'aire mesure la surface qu'elle couvre. Confondre les deux est l'une des erreurs de géométrie les plus courantes.",
    realWorld: ["Acheter une clôture pour un jardin", 'Commander du revêtement de sol ou de la moquette au mètre carré', 'Encadrer une image'],
    howTo: "Périmètre d'un rectangle : additionnez les quatre côtés (2 × longueur + 2 × largeur). Aire : multipliez longueur × largeur.",
  },
  18: {
    why: "Les relations entre angles permettent de trouver un angle manquant sans le mesurer directement, juste à partir de la façon dont les formes et les lignes s'assemblent.",
    realWorld: ['La menuiserie et la charpente de toit', 'Lire un relèvement au compas', "Concevoir l'optique d'un appareil photo ou d'un télescope"],
    howTo: "Les angles d'un triangle totalisent toujours 180°. Les angles sur une droite totalisent aussi toujours 180° — soustrayez ceux que vous connaissez de 180 pour trouver le reste.",
  },
  19: {
    why: "Les cercles apparaissent partout où il y a des objets ronds, et ils suivent leur propre relation constante entre taille et distance autour.",
    realWorld: ['La conception de roues et d’engrenages', "Calculer la capacité d'un tuyau ou d'un réservoir", "Les distances de couloir en athlétisme"],
    howTo: 'Circonférence = 2 × π × rayon. Aire = π × rayon². Utiliser π ≈ 3,14 suffit pour la plupart des estimations courantes.',
  },
  20: {
    why: "Le volume mesure l'espace qu'occupe (ou que contient) un solide, l'étape naturelle suivante après le périmètre et l'aire à plat.",
    realWorld: ["Calculer combien d'eau contient un réservoir", "Les dimensions de boîtes d'expédition et d'emballage", 'Le béton nécessaire pour couler une fondation'],
    howTo: "Volume d'un pavé droit = longueur × largeur × hauteur. Chaque dimension se multiplie, donc doubler une dimension double tout le volume.",
  },
};

const LEARNING_CONTENT_BY_LANG = { en: LEARNING_CONTENT_EN, fr: LEARNING_CONTENT_FR };

export function getLearningContent(tier, language) {
  const dict = LEARNING_CONTENT_BY_LANG[language] ?? LEARNING_CONTENT_EN;
  return dict[tier] ?? LEARNING_CONTENT_EN[tier];
}
