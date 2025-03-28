export const generateNormalRandom = (
  mean: number,
  variance: number
): number => {
  const standardDeviation = Math.sqrt(variance);

  // Using Box-Muller transform to generate a standard normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  // Scale and shift to match the desired mean and standard deviation
  return mean + z0 * standardDeviation;
};
