export function expectedAV(
  startingAccount: number,
  annualSavings: number,
  yearsGrowth: number,
  growthRate: number
) {
  let accountValue = startingAccount * Math.pow(1 + growthRate, yearsGrowth);

  for (let i = 0; i < yearsGrowth; i++) {
    accountValue += annualSavings * Math.pow(1 + growthRate, i);
  }

  return accountValue;
}
