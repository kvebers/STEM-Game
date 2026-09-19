// Locale-aware phrase builders for the wrapper text around generated
// question prompts (the numbers/symbols themselves are language-neutral).
// Shared between the client (practice/print) and the create-match /
// join-queue Edge Functions, which persist whatever prompt text is
// generated here straight into match_questions.
const PHRASES = {
  en: {
    solveForX: (equation) => `Solve for x: ${equation}`,
    writeAsDecimal: (n, d) => `Write ${n}/${d} as a decimal`,
    writeAsFraction: (decimalStr) => `Write ${decimalStr} as a fraction in lowest terms`,
    percentOf: (p, n) => `${p}% of ${n}`,
    changedByPercent: (n, increased, p) => `${n} ${increased ? 'increased' : 'decreased'} by ${p}%`,
    fractionOfPercentOf: (fracNum, fracDen, p, n) => `${fracNum}/${fracDen} of ${p}% of ${n}`,
    solveProportion: (a, b, c) => `Solve: ${a}/${b} = ${c}/x`,
    findMean: (values) => `Find the mean of: ${values}`,
    findMedian: (values) => `Find the median of: ${values}`,
    findMode: (values) => `Find the mode of: ${values}`,
    findRange: (values) => `Find the range of: ${values}`,
    dieProbability: () => 'A fair 6-sided die is rolled once. What is the probability of rolling a 4?',
    bagProbabilityOne: (red, blue) =>
      `A bag has ${red} red and ${blue} blue marbles. One marble is drawn at random. What is the probability it is red?`,
    bagProbabilityTwo: (red, blue) =>
      `A bag has ${red} red and ${blue} blue marbles. Two marbles are drawn at random without replacement. What is the probability both are red?`,
    bookOrders: (n) => `In how many different orders can ${n} distinct books be arranged on a shelf?`,
    combinations: (k, n) => `How many ways can you choose ${k} items from a group of ${n}?`,
    stdDeviation: (values) => `Find the population standard deviation of: ${values}`,
    rectPerimeter: (l, w) => `Find the perimeter of a rectangle with length ${l} and width ${w}`,
    rectArea: (l, w) => `Find the area of a rectangle with length ${l} and width ${w}`,
    triangleThirdAngle: (a, b) => `A triangle has angles of ${a}° and ${b}°. What is the third angle, in degrees?`,
    straightLineAngle: (a) => `Two angles on a straight line measure ${a}° and x°. Find x.`,
    circleCircumference: (r) => `Find the circumference of a circle with radius ${r} (use π ≈ 3.14)`,
    prismVolume: (l, w, h) => `Find the volume of a rectangular prism with length ${l}, width ${w}, and height ${h}`,
    positiveConstraint: () => '(x > 0)',
    positiveSolutionNote: () => '(positive solution)',
    zScore: (value, mean, std) =>
      `A dataset is normally distributed with a mean of ${mean} and a standard deviation of ${std}. Find the z-score for a value of ${value}.`,
    rightTriangleRatio: (ratio, opp, adj, hyp) =>
      `A right triangle has legs of length ${opp} and ${adj} and a hypotenuse of length ${hyp}. For the acute angle opposite the side of length ${opp}, find ${ratio}(angle) as a fraction in lowest terms.`,
    lawOfCosines: (a, b, angle) =>
      `A triangle has two sides of length ${a} and ${b} with a ${angle}° angle between them. Find the length of the third side.`,
  },
  fr: {
    solveForX: (equation) => `Résoudre pour x : ${equation}`,
    writeAsDecimal: (n, d) => `Écrivez ${n}/${d} sous forme décimale`,
    writeAsFraction: (decimalStr) => `Écrivez ${decimalStr} sous forme de fraction irréductible`,
    percentOf: (p, n) => `${p} % de ${n}`,
    changedByPercent: (n, increased, p) => `${n} ${increased ? 'augmenté' : 'diminué'} de ${p} %`,
    fractionOfPercentOf: (fracNum, fracDen, p, n) => `${fracNum}/${fracDen} de ${p} % de ${n}`,
    solveProportion: (a, b, c) => `Résolvez : ${a}/${b} = ${c}/x`,
    findMean: (values) => `Trouvez la moyenne de : ${values}`,
    findMedian: (values) => `Trouvez la médiane de : ${values}`,
    findMode: (values) => `Trouvez le mode de : ${values}`,
    findRange: (values) => `Trouvez l'étendue de : ${values}`,
    dieProbability: () => "Un dé à 6 faces non truqué est lancé une fois. Quelle est la probabilité d'obtenir un 4 ?",
    bagProbabilityOne: (red, blue) =>
      `Un sac contient ${red} billes rouges et ${blue} billes bleues. Une bille est tirée au hasard. Quelle est la probabilité qu'elle soit rouge ?`,
    bagProbabilityTwo: (red, blue) =>
      `Un sac contient ${red} billes rouges et ${blue} billes bleues. Deux billes sont tirées au hasard sans remise. Quelle est la probabilité qu'elles soient toutes les deux rouges ?`,
    bookOrders: (n) => `De combien de façons différentes peut-on ranger ${n} livres distincts sur une étagère ?`,
    combinations: (k, n) => `De combien de façons peut-on choisir ${k} éléments parmi un groupe de ${n} ?`,
    stdDeviation: (values) => `Trouvez l'écart type de la population de : ${values}`,
    rectPerimeter: (l, w) => `Trouvez le périmètre d'un rectangle de longueur ${l} et de largeur ${w}`,
    rectArea: (l, w) => `Trouvez l'aire d'un rectangle de longueur ${l} et de largeur ${w}`,
    triangleThirdAngle: (a, b) => `Un triangle a des angles de ${a}° et ${b}°. Quel est le troisième angle, en degrés ?`,
    straightLineAngle: (a) => `Deux angles sur une droite mesurent ${a}° et x°. Trouvez x.`,
    circleCircumference: (r) => `Trouvez la circonférence d'un cercle de rayon ${r} (utilisez π ≈ 3,14)`,
    prismVolume: (l, w, h) => `Trouvez le volume d'un pavé droit de longueur ${l}, de largeur ${w} et de hauteur ${h}`,
    positiveConstraint: () => '(x > 0)',
    positiveSolutionNote: () => '(solution positive)',
    zScore: (value, mean, std) =>
      `Un ensemble de données suit une loi normale de moyenne ${mean} et d'écart type ${std}. Trouvez la cote z pour une valeur de ${value}.`,
    rightTriangleRatio: (ratio, opp, adj, hyp) =>
      `Un triangle rectangle a des côtés de longueur ${opp} et ${adj} et une hypoténuse de longueur ${hyp}. Pour l'angle aigu opposé au côté de longueur ${opp}, trouvez ${ratio}(angle) sous forme de fraction irréductible.`,
    lawOfCosines: (a, b, angle) =>
      `Un triangle a deux côtés de longueur ${a} et ${b} avec un angle de ${angle}° entre eux. Trouvez la longueur du troisième côté.`,
  },
};

export function phrases(locale) {
  return PHRASES[locale] ?? PHRASES.en;
}
