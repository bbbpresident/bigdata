interface SimulationYear {
  age: number;
  accountValue: number;
  annualGrowthNom: number;
  annualGrowthPerc: number;
  annualSaving: number;
  annualWithdrawal: number;
}

interface SimulationResult {
  trajectory: SimulationYear[]; // Array to store the trajectory of the simulation
  ageAtDepletion: number; // Age when the account depletes
  percentile: number;
}

import { generateNormalRandom } from "./calculateRandomNormal";

// Function to calculate decile based on account value at retirement age
function calculatePercentile(accountValues: number[], value: number): number {
  // Sort the account values to determine the percentile range
  const sortedValues = [...accountValues].sort((a, b) => a - b);

  // Find the index of the value in the sorted array
  const index = sortedValues.indexOf(value);

  // Calculate the percentile as the ratio of the index position
  const percentile = (index / (sortedValues.length - 1)) * 100;

  return percentile;
}

export function simulateRetirement(
  startAmount: number,
  annualSavings: number,
  annualWithdrawal: number,
  growthRate: number,
  currentAge: number,
  retirementAge: number,
  numberSimulations: number
): SimulationResult[] {
  const outcomes: SimulationResult[] = [];
  const accountValuesAtRetirement: number[] = []; // Store all account values at retirement age for decile calculation

  for (let i = 1; i <= numberSimulations; i++) {
    let age = currentAge;
    const baseInflation = 0.02;
    let currentNeeds = annualWithdrawal;
    let accountValueBOP = startAmount;
    let accountValueEOP = startAmount;

    // Array to store the trajectory for this simulation
    const trajectory: SimulationYear[] = [];

    // core assumptions:
    // 1. growth happens based on the beginning of year balance
    // 2. saving is made at the end of the year
    // 3. saving amount isn't changing YoY

    // Simulate the account balance over time
    do {
      if (age == currentAge) {
        trajectory.push({
          age,
          accountValue: accountValueEOP,
          annualGrowthNom: 0,
          annualGrowthPerc: 0,
          annualSaving: 0,
          annualWithdrawal: 0,
        });
      } else {
        accountValueBOP = accountValueEOP;
        const accountChange =
          age <= retirementAge ? annualSavings : -currentNeeds;
        let growth = generateNormalRandom(growthRate, 0.04);
        growth = Math.min(0.2, growth);
        // Example: Randomly vary growth
        // const growth = growthRate;
        accountValueEOP += accountValueBOP * growth + accountChange;

        // Store the current year data
        trajectory.push({
          age,
          accountValue: Math.max(0, accountValueEOP),
          annualGrowthNom: accountValueEOP - accountValueBOP - accountChange,
          annualGrowthPerc: growth,
          annualSaving: accountChange > 0 ? accountChange : 0,
          annualWithdrawal: accountChange < 0 ? accountChange : 0,
        });
      }

      // increment age. boost withdrawal needs by inflation
      age++;
      currentNeeds *= 1 + baseInflation;
    } while (accountValueEOP > 0 && age <= 120);

    const ageDepleted = age;

    // complete the entire trajectory with 0's
    while (age <= 120) {
      trajectory.push({
        age,
        accountValue: Math.max(0, accountValueEOP),
        annualGrowthNom: 0,
        annualGrowthPerc: 0,
        annualSaving: 0,
        annualWithdrawal: 0,
      });
      age++;
    }

    // Step 2: Store the account value at retirement age for decile calculation
    const accountValueAtRetirement =
      trajectory.find((item) => item.age === retirementAge)?.accountValue ?? 0;
    accountValuesAtRetirement.push(accountValueAtRetirement);

    // Store the results
    outcomes.push({
      trajectory,
      ageAtDepletion: ageDepleted,
      percentile: 0,
    });
  }

  // Step 3: Compute deciles for account values at retirement
  outcomes.forEach((result) => {
    const accountValueAtRetirement =
      result.trajectory.find((item) => item.age === retirementAge)
        ?.accountValue ?? 0;
    const percentile = calculatePercentile(
      accountValuesAtRetirement,
      accountValueAtRetirement
    );
    result.percentile = percentile;
  });

  return outcomes;
}

export {};
