import { generateNormalRandom } from "./calculateRandomNormal";

export const generateLognormalRandom = (
  mean: number,
  variance: number
): number => {
  const sigmaY = Math.sqrt(Math.log(1 + variance / Math.pow(mean, 2)));
  const muY = Math.log(mean) - 0.5 * sigmaY * sigmaY;

  // Generate a random value from a normal distribution with mean 'muY' and variance 'sigmaY'
  const normalSample = muY + sigmaY * generateNormalRandom(mean, variance);
  // Exponentiate the normal sample to get a lognormal sample
  const lognormalSample = Math.exp(normalSample);

  return lognormalSample;
};
