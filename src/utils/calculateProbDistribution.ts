export function calculateProbabilityDistribution(
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

  return probabilityDistribution;
}
