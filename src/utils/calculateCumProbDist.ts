export function calculateSurvivalProbabilityDistribution(
  simulationResults: number[],
  maxAge: number = 120
) {
  // Initialize an array to hold the frequency of each age
  const frequency = new Array(maxAge).fill(0);

  // Count how often each age appears in the simulation results
  simulationResults.forEach((age) => {
    if (age <= maxAge) {
      frequency[age]++;
    }
  });

  // Normalize the frequency to get a probability distribution
  const totalSimulations = simulationResults.length;
  const probabilityDistribution = frequency.map(
    (count) => count / totalSimulations
  );

  // Calculate cumulative probability distribution
  const cumulativeProbabilityDistribution = probabilityDistribution.reduce(
    (acc, curr, index) => {
      // Add the current probability to the previous cumulative sum
      acc.push(curr + (acc[index - 1] || 0));
      return acc;
    },
    [] as number[] // Initialize as an empty array
  );

  // Now map to get the survival probability (1 - cumulative probability)
  const survivalProbabilityDistribution = cumulativeProbabilityDistribution.map(
    (item) => 1 - item
  );

  return survivalProbabilityDistribution;
}
