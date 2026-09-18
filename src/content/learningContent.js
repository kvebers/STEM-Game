// Educational content for the Learning screen, keyed by learning-tree
// tier/node id (see shared/questions/index.js LEARNING_TREE for the tree
// this mirrors). Static and hand-written — no need for a DB table since it
// doesn't depend on any user state.
export const LEARNING_CONTENT = {
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
    why: 'Multiplication is repeated addition, done fast — it scales a quantity instead of building it one step at a time.',
    realWorld: ['Buying several of the same item at a fixed price', 'Scaling up a recipe', 'Computing the area of a room'],
    howTo: 'Memorize the small times tables first. For bigger numbers, multiply digit by digit and add the partial products, shifting each one left by a place value.',
  },
  4: {
    why: "Division is multiplication's inverse — it splits a total into equal groups or finds a rate.",
    realWorld: ['Splitting a bill evenly among friends', 'Finding a price per item', 'Sharing a resource fairly'],
    howTo: 'Long division: divide, multiply, subtract, bring down the next digit, repeat. Check by multiplying your answer by the divisor.',
  },
  5: {
    why: 'Without an agreed order, the same string of numbers and operators could mean different things — consistency matters everywhere formulas are used.',
    realWorld: ['Computing a paycheck with overtime and deductions', 'Evaluating a spreadsheet formula', 'Physics and engineering equations'],
    howTo: 'PEMDAS: Parentheses first, then Exponents, then Multiplication/Division left to right, then Addition/Subtraction left to right.',
  },
  6: {
    why: 'Algebra generalizes arithmetic — instead of only computing known numbers, you can solve for an unknown one.',
    realWorld: ['Figuring out how many hours to work to afford something', 'Solving for a missing recipe ingredient amount', 'Break-even analysis for a small business'],
    howTo: 'Isolate the variable by doing the same operation to both sides of the equation — whatever was added, subtract; whatever was multiplied, divide.',
  },
  7: {
    why: 'Most real problems take more than one step to untangle — two-step equations are where algebra starts feeling like a real tool.',
    realWorld: ['A taxi fare with a base charge plus a per-mile rate, solving for distance', 'Temperature conversion formulas', 'Phone plans with a flat fee plus per-GB overage'],
    howTo: 'Undo addition or subtraction first, then undo multiplication or division — the reverse of the order those operations were applied — always doing the same thing to both sides.',
  },
  8: {
    why: 'Quadratic equations model anything involving acceleration, area, or a peak-and-fall shape.',
    realWorld: ['The arc of a thrown ball', 'Designing a rectangular garden with a fixed perimeter for maximum area', 'Predicting when a rocket or dropped object lands'],
    howTo: 'For x² = n, take the square root of both sides. For a general quadratic, try factoring, completing the square, or the quadratic formula.',
  },
  9: {
    why: "Not everything divides evenly — fractions let you describe a part of a whole exactly, instead of rounding it away.",
    realWorld: ['Following a recipe that calls for 3/4 cup', 'Splitting a pizza fairly among friends', 'Measurements in carpentry and construction'],
    howTo: 'Same denominator: add or subtract the numerators directly. Different denominators: find a common denominator first, then combine.',
  },
  10: {
    why: 'Decimals are just another way to write fractions — one that lines up naturally with money, measurement, and calculators.',
    realWorld: ['Prices at a store', 'GPS coordinates', 'Sports statistics like a batting average'],
    howTo: 'A fraction converts to a decimal by dividing the numerator by the denominator. Line up the decimal points before adding or subtracting.',
  },
  11: {
    why: 'Percentages standardize comparison — "out of 100" makes it easy to compare proportions from totally different totals.',
    realWorld: ['Sales discounts', 'Calculating tax and tip', 'Interest rates on loans and savings'],
    howTo: '"X% of a number" means multiply by X as a decimal (20% of 50 = 0.20 × 50). "Increase/decrease by X%" means add or subtract that amount from the original.',
  },
  12: {
    why: 'The world is full of uncertainty and data — statistics summarizes what happened, probability predicts what might.',
    realWorld: ['Weather forecasts ("70% chance of rain")', 'Sports analytics', 'A/B testing and insurance risk pricing'],
    howTo: 'Mean = sum ÷ count. Median = the middle value once sorted. Probability = favorable outcomes ÷ total possible outcomes.',
  },
};
