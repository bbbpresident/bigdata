import React, { useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { simulateRetirement } from "../utils/simulateRetirement";
import { calculateSurvivalProbabilityDistribution } from "../utils/calculateCumProbDist";
import { expectedAV } from "../utils/expectedAccountValue";
import InputField from "./InputField";

// Register the chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SimulationYear {
  age: number;
  accountValue: number;
  annualGrowthNom: number;
  annualGrowthPerc: number;
  annualSaving: number;
  annualWithdrawal: number;
}

interface SimulationResult {
  trajectory: SimulationYear[];
  ageAtDepletion: number;
  percentile: number;
}

const RetirementSimulator: React.FC = () => {
  const NUMBER_SIMULATIONS = 1000;
  const [startAmount, setStartAmount] = useState<number>(100000);
  const [annualSavings, setAnnualSavings] = useState<number>(10000);
  const [annualWithdrawal, setAnnualWithdrawal] = useState<number>(50000);
  const [growthRate, setGrowthRate] = useState<number>(0.05);
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [retirementAge, setRetirementAge] = useState<number>(65);
  const [simulationResults, setSimulationResults] = useState<
    SimulationResult[]
  >([]);
  const [selectedSimulation, setSelectedSimulation] = useState<number | null>(
    null
  );
  const [selectedDecile, setSelectedDecile] = useState<number>(0);

  // individual graphs
  const selectedTrajectory =
    selectedSimulation !== null
      ? simulationResults[selectedSimulation].trajectory
      : [];

  const retirementAgeAtSimulation = selectedTrajectory.find(
    (year) => year.age >= retirementAge + 1
  );

  // Section A Data
  const startingAccountValue =
    selectedTrajectory.length > 0 ? selectedTrajectory[0].accountValue : 0;
  const totalGrowthNom = selectedTrajectory.reduce((sum, year) => {
    // Only continue summing until the target year
    if (year.age <= retirementAge) {
      return sum + year.annualGrowthNom;
    }
    return sum;
  }, 0);

  const totalSavings = selectedTrajectory.reduce(
    (sum, year) => sum + year.annualSaving,
    0
  );

  const accountValueAtRetirement = retirementAgeAtSimulation
    ? retirementAgeAtSimulation.accountValue
    : 0;

  let averageGrowthPerc = selectedTrajectory
    .filter((year) => year.age <= retirementAge)
    .reduce((product, year) => product * (1 + year.annualGrowthPerc), 1);

  averageGrowthPerc = Math.pow(
    averageGrowthPerc,
    1 / (retirementAge - currentAge)
  );

  averageGrowthPerc -= 1;

  // Section B Data
  const firstRetirementWithdrawal = retirementAgeAtSimulation
    ? retirementAgeAtSimulation.annualWithdrawal
    : 0;

  const remainingYears = selectedTrajectory.slice(
    selectedTrajectory.findIndex((year) => year.age > retirementAge)
  );

  const yearsBeforeDepletion = remainingYears.findIndex(
    (year) => year.accountValue <= 0
  );

  const yearsBeforeDepletionResult =
    yearsBeforeDepletion === -1 ? 120 - retirementAge : yearsBeforeDepletion;

  let averageGrowthPercPostRetire = selectedTrajectory
    .filter((year) => year.age > retirementAge)
    .reduce((product, year) => product * (1 + year.annualGrowthPerc), 1);

  averageGrowthPercPostRetire = Math.pow(
    averageGrowthPercPostRetire,
    1 / yearsBeforeDepletionResult
  );

  averageGrowthPercPostRetire -= 1;

  const handleDecileSelection = (index: number) => {
    setSelectedDecile(index);
  };

  const handleSubmit = () => {
    const results = simulateRetirement(
      startAmount,
      annualSavings,
      annualWithdrawal,
      growthRate,
      currentAge,
      retirementAge,
      NUMBER_SIMULATIONS
    );
    setSimulationResults(results); // Ensure results are set properly
  };

  const handleSelectSimulation = (index: number) => {
    setSelectedSimulation(index);
  };

  // format

  const formatCurrency = (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // chart data prep

  const getPercentiles = (results: number[], percentiles: number[]) => {
    const sortedResults = [...results].sort((a, b) => a - b);
    return percentiles.map((percentile) => {
      const index = Math.floor((percentile / 100) * sortedResults.length);
      return sortedResults[index];
    });
  };

  const calculatePercentile = (arr: number[], percentile: number) => {
    const sortedArr = arr.sort((a, b) => a - b);
    const index = (percentile / 100) * (sortedArr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
      return sortedArr[lower];
    }
    return (
      sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower)
    );
  };

  // Step 1: Collect all account values at retirement age from each simulation
  const accountValuesAtRetirement = simulationResults
    .map((simulation) => {
      const retirementYear = simulation.trajectory.find(
        (item) => item.age === retirementAge
      );
      return retirementYear ? retirementYear.accountValue : 0;
    })
    .filter((value) => value > 0); // Filter out any 0 values, just in case

  // percentiles
  const percentiles = getPercentiles(
    accountValuesAtRetirement,
    [0.1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99.9]
  );

  // Number of bins (bars) for the histogram
  const numBins = 30;
  const binWidth = Math.round(percentiles[5] / 4 / 100000) * 100000;

  // Create the histogram data
  const bins = new Array(numBins).fill(0); // Initialize bins with 0 values

  // Calculate how many values fall into each bin
  accountValuesAtRetirement.forEach((value) => {
    const binIndex =
      value < binWidth * (numBins - 1)
        ? Math.floor(value / binWidth)
        : numBins - 1;
    if (binIndex < numBins) bins[binIndex]++; // Make sure the value fits within the number of bins
  });

  // Normalize bins to create a probability distribution
  const totalValues = accountValuesAtRetirement.length;
  const accountDistribution = bins.map((bin) => bin / totalValues);

  const averageAccountValue =
    accountValuesAtRetirement.reduce((a, b) => a + b, 0) /
    accountValuesAtRetirement.length;

  // chart data

  const cumulativeProbData = {
    labels: Array.from(
      { length: 122 - retirementAge }, // Create labels from retirementAge to 120
      (_, i) => retirementAge + i // Start from retirementAge and increment
    ),
    datasets: [
      {
        label: "Probability of sufficient funds by this age",
        data: calculateSurvivalProbabilityDistribution(
          simulationResults.map((item) => item.ageAtDepletion), // Pass simulationResults here
          120 // End age, up to 120
        ).slice(retirementAge), // Use cumulative probabilities
        backgroundColor: "rgba(75, 192, 192, 0.2)", // Set background color for bars
        borderColor: "rgb(75, 192, 192)", // Set border color for bars
        borderWidth: 1,
      },
    ],
  };

  const accountTrajectorySoloData = {
    labels:
      selectedSimulation !== null
        ? simulationResults[selectedSimulation].trajectory.map(
            (item) => item.age
          )
        : [],
    datasets: [
      {
        label: "Account Value",
        data:
          selectedSimulation !== null
            ? simulationResults[selectedSimulation].trajectory.map(
                (item) => item.accountValue
              )
            : [],
        fill: false,
        borderColor: "white",
        tension: 0.1,
        borderWidth: 1,
      },
    ],
  };

  const accountChangesData = {
    labels:
      selectedSimulation !== null
        ? simulationResults[selectedSimulation].trajectory.map(
            (item) => item.age
          )
        : [],
    datasets: [
      {
        label: "Investment Return",
        data:
          selectedSimulation !== null
            ? simulationResults[selectedSimulation].trajectory.map(
                (item) => item.annualGrowthNom
              )
            : [],
        backgroundColor: "rgba(75, 192, 192, 0.6)", // Growth color
        stack: "stack1", // Stack name for growth
        barThickness: 5,
      },
      {
        label: "Savings",
        data:
          selectedSimulation !== null
            ? simulationResults[selectedSimulation].trajectory.map(
                (item) => item.annualSaving
              )
            : [],
        backgroundColor: "rgba(153, 102, 255, 0.6)", // Savings color
        stack: "stack1", // Stack name for savings
        barThickness: 5,
      },
      {
        label: "Withdrawals",
        data:
          selectedSimulation !== null
            ? simulationResults[selectedSimulation].trajectory.map(
                (item) => item.annualWithdrawal
              )
            : [],
        backgroundColor: "rgba(255, 99, 132, 0.6)", // Withdrawals color
        stack: "stack1", // Stack name for withdrawals
        barThickness: 5,
      },
    ],
  };

  const accountTrajectoryAlldata = {
    labels: Array.from(
      { length: retirementAge - currentAge + 1 }, // Create labels from retirementAge to 120
      (_, i) => currentAge + i // Start from retirementAge and increment
    ),
    datasets: [
      // Show all trajectories in light gray
      ...simulationResults.map((simulation, index) => {
        // Filter the trajectory to only include data from currentAge to retirementAge
        const filteredData = simulation.trajectory
          .filter((item) => item.age >= currentAge && item.age <= retirementAge)
          .map((item) => item.accountValue);

        return {
          label: `Simulation ${index + 1}`,
          data: filteredData,
          fill: false,
          borderColor:
            simulation.percentile >= selectedDecile * 10 &&
            simulation.percentile <= (selectedDecile + 1) * 10
              ? "rgba(255, 0, 0, 1)" // Red color for selected decile
              : "rgba(211, 211, 211, 0.3)", // Light gray color for other deciles
          tension: 0.1,
          borderWidth: 1,
        };
      }),
    ],
  };

  const investmentReturnData = {
    labels:
      selectedSimulation !== null
        ? simulationResults[selectedSimulation].trajectory.map(
            (item) => item.age
          )
        : [],
    datasets: [
      {
        label: "Investment Return",
        data:
          selectedSimulation !== null
            ? simulationResults[selectedSimulation].trajectory.map(
                (item) => item.annualGrowthPerc
              )
            : [],
        fill: true,
        backgroundColor: (context: any) => {
          const value = context.dataset.data[context.dataIndex];
          return value > 0 ? "green" : "red"; // Green for positive, red for negative
        },
        tension: 0.1,
        borderWidth: 1,
      },
    ],
  };

  const accountHistogramData = {
    labels: Array.from({ length: numBins }, (_, i) => {
      const binStart = i * binWidth;
      const binEnd = binStart + binWidth;
      return `${formatCurrency(binEnd)}`; // Create label ranges like "0 - 10", "10 - 20", etc.
    }),
    datasets: [
      {
        label: "Probability you end up in this bucket",
        data: accountDistribution,
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const cumulativeProbOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Age that Account gets Depleted",
        },
      },
      y: {
        title: {
          display: true,
          text: "Probability of Having Enough Funds",
        },
      },
    },
    plugins: {
      legend: {
        display: false, // This will hide the legend
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            // Format the value with a dollar sign and commas
            const value = tooltipItem.raw;
            return `${tooltipItem.dataset.label}: ${(value * 100).toFixed(1)}%`;
          },
        },
      },
      title: {
        display: true,
        text: `Probability that you can Fund Retirement up to a Certain Age`, // Title text
        padding: {
          top: 20,
          bottom: 10,
        },
        font: {
          size: "18px",
        },
      },
    },
  };

  const accountTrajectorySoloOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Age",
        },
      },
      y: {
        title: {
          display: true,
          text: "Account Value",
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            // Format the value with a dollar sign and commas
            const value = tooltipItem.raw;
            return `${tooltipItem.dataset.label}: ${formatCurrency(value)}`;
          },
        },
      },
      title: {
        display: true,
        text: `Account Value Trajectory for Selected Simulation`, // Title text
        padding: {
          top: 20,
          bottom: 10,
        },
        font: {
          size: "18px",
        },
      },
    },
  };

  const accountChangesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Age",
        },
      },
      y: {
        title: {
          display: true,
          text: "Change to Retirement Account",
        },
        stacked: true, // Enable stacking on y-axis
      },
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            // Format the value with a dollar sign and commas
            const value = tooltipItem.raw;
            return `${tooltipItem.dataset.label}: ${formatCurrency(value)}`;
          },
        },
      },
      title: {
        display: true,
        text: `Annual Impact of Savings, Withdrawals and Investment Returns`, // Title text
        padding: {
          top: 20,
          bottom: 10,
        },
        font: {
          size: "18px",
        },
      },
    },
  };

  const accountTrajectoryAllOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Age",
        },
      },
      y: {
        title: {
          display: true,
          text: "Account Value",
        },
        beginAtZero: true,
        max: calculatePercentile(accountValuesAtRetirement, 95),
        position: "right",
        ticks: {
          // Optional: Customize y-axis ticks if needed
          callback: (value: number) => formatCurrency(value), // Example of formatting
        },
      },
    },
    elements: {
      point: {
        radius: 0, // This will remove the dots at each point
      },
    },
    plugins: {
      legend: {
        display: false, // This will hide the legend
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            return `${tooltipItem.dataset.label}: ${formatCurrency(
              tooltipItem.raw
            )}`;
          },
        },
      },
      title: {
        display: true,
        text: `Simulation of ${NUMBER_SIMULATIONS} Account Trajectories from Age ${currentAge} to ${retirementAge}`, // Title text
        padding: {
          top: 20,
          bottom: 10,
        },
        font: {
          size: 18,
        },
      },
      // subtitle: {
      //   display: true,
      //   text: "Subtitle of the Chart", // Subtitle text
      //   // Optional: You can style the subtitle here
      //   font: {
      //     size: "14px",
      //     style: "italic",
      //   },
      // },
    },
  };

  const investmentReturnOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: "Age",
        },
      },
      y: {
        title: {
          display: true,
          text: "Investment Return",
        },
      },
    },
    plugins: {
      legend: {
        display: false, // This will hide the legend
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            // Assuming the data is in decimal form (e.g., 0.05 for 5%)
            const value = tooltipItem.raw;

            // Convert the value to a percentage and format it
            const percentage = (value * 100).toFixed(2); // Convert to percentage and format with 2 decimal places

            return `${tooltipItem.dataset.label}: ${percentage}%`;
          },
        },
      },
      title: {
        display: true,
        text: `Investment Returns over the Life of Your Account`, // Title text
        padding: {
          top: 20,
          bottom: 10,
        },
        font: {
          size: "18px",
        },
      },
    },
  };

  const accountHistogramOptions = {
    responsive: true,
    scales: {
      x: {
        title: {
          display: true,
          text: "Account Value Range",
        },
      },
      y: {
        title: {
          display: true,
          text: "Frequency",
        },
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false, // This will hide the legend
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            // Assuming the data is in decimal form (e.g., 0.05 for 5%)
            const value = tooltipItem.raw;

            // Convert the value to a percentage and format it
            const percentage = (value * 100).toFixed(2); // Convert to percentage and format with 2 decimal places

            return `${tooltipItem.dataset.label}: ${percentage}%`;
          },
        },
      },
      title: {
        display: true,
        text: "Histogram of Possible Account Values by Retirement", // Title text
        padding: {
          top: 20,
          bottom: 10,
        },
        font: {
          size: "18px",
        },
      },
      // subtitle: {
      //   display: true,
      //   text: "Subtitle of the Chart", // Subtitle text
      //   // Optional: You can style the subtitle here
      //   font: {
      //     size: "14px",
      //     style: "italic",
      //   },
      // },
    },
  };

  const chartDimensions = {
    height: 400,
    width: 800,
  };

  return (
    <div className="flex flex-col justify-center items-center">
      <div className="px-4 py-6 shadow-lg rounded-lg border">
        <h2 className="text-3xl text-center">Retirement Simulator</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <InputField
            label="Starting Amount"
            value={startAmount}
            onChange={(e) => setStartAmount(Number(e.target.value))}
          />
          <InputField
            label="Annual Savings"
            value={annualSavings}
            onChange={(e) => setAnnualSavings(Number(e.target.value))}
          />
          <InputField
            label="Annual Withdrawal"
            value={annualWithdrawal}
            onChange={(e) => setAnnualWithdrawal(Number(e.target.value))}
          />
          <InputField
            label="Growth Rate"
            value={growthRate}
            onChange={(e) => setGrowthRate(Number(e.target.value))}
            type="number"
          />
          <InputField
            label="Current Age"
            value={currentAge}
            onChange={(e) => setCurrentAge(Number(e.target.value))}
          />
          <InputField
            label="Retirement Age"
            value={retirementAge}
            onChange={(e) => setRetirementAge(Number(e.target.value))}
          />

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-3 rounded-lg mt-4"
          >
            Simulate
          </button>
        </form>
      </div>

      {simulationResults.length > 0 && (
        <div className="flex flex-col">
          <div className="flex">
            <div className="flex flex-col">
              <div
                style={{
                  width: chartDimensions.width,
                  height: chartDimensions.height,
                }}
              >
                <Line
                  data={accountTrajectoryAlldata}
                  options={accountTrajectoryAllOptions}
                />
              </div>

              <div
                style={{
                  width: chartDimensions.width,
                  height: chartDimensions.height,
                }}
              >
                <Bar
                  data={accountHistogramData}
                  options={accountHistogramOptions}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <div
                style={{
                  width: chartDimensions.width,
                  height: chartDimensions.height,
                }}
              >
                <div className="text-xl my-2 font-semibold">
                  Select a Decile to Spotlight
                </div>
                <div className="my-3">
                  {Array.from({ length: 10 }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => handleDecileSelection(index)}
                      className={`mx-1 bg-gray-400 ${
                        selectedDecile === index ? "selected" : ""
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div>
                  <div className="w-full">
                    <div className="flex mb-3 mx-2">
                      <div className="w-[50%]">
                        <h4 className="text-lg font-semibold mb-2">
                          Summary of {NUMBER_SIMULATIONS} Simulations by Age{" "}
                          {retirementAge}
                        </h4>
                        <table className="table-auto border border-white">
                          <thead>
                            <tr>
                              <th className="px-4 py-1 text-left">Metric</th>
                              <th className="px-4 py-1 text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Lowest Account Value
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(percentiles[0])}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Median Account Value
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(percentiles[5])}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Average Account
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(averageAccountValue)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Highest Account Value
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(percentiles[10])}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Account Value from{" "}
                                {(growthRate * 100).toFixed(0)}% Growth
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(
                                  expectedAV(
                                    startAmount,
                                    annualSavings,
                                    retirementAge - currentAge,
                                    growthRate
                                  )
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="w-[50%]">
                        <h4 className="text-lg font-semibold mb-2">
                          {selectedDecile == null
                            ? "select decile to unlock stats"
                            : `Summary of Decile ${selectedDecile + 1}`}
                        </h4>
                        <table className="table-auto">
                          <thead>
                            <tr>
                              <th className="px-4 py-1 text-left">Metric</th>
                              <th className="px-4 py-1 text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-1 text-left text-black bg-[#4bc0c0]">
                                {selectedDecile * 10}th Percentile Account Value
                              </td>
                              <td className="px-4 py-1 text-right text-black bg-[#4bc0c0]">
                                {formatCurrency(percentiles[selectedDecile])}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left text-black bg-[#4bc0c0]">
                                {(selectedDecile + 1) * 10}th Percentile Account
                                Value
                              </td>
                              <td className="px-4 py-1 text-right text-black bg-[#4bc0c0]">
                                {formatCurrency(
                                  percentiles[selectedDecile + 1]
                                )}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Inflation Impact over{" "}
                                {retirementAge - currentAge} Years
                              </td>
                              <td className="px-4 py-1 text-right">
                                {(
                                  (-firstRetirementWithdrawal /
                                    annualWithdrawal -
                                    1) *
                                  100
                                ).toFixed(0)}
                                %
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Years Before Account Depleted
                              </td>
                              <td className="px-4 py-1 text-right">
                                {yearsBeforeDepletionResult}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Avg Growth After Retirement
                              </td>
                              <td className="px-4 py-1 text-right">
                                {(averageGrowthPercPostRetire * 100).toFixed(2)}
                                %
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  width: chartDimensions.width,
                  height: chartDimensions.height,
                }}
              >
                <Bar
                  data={cumulativeProbData}
                  options={cumulativeProbOptions}
                />
              </div>
            </div>
          </div>

          <div>
            <h3>Select Simulation</h3>
            <select
              onChange={(e) => handleSelectSimulation(Number(e.target.value))}
              className="border p-2"
            >
              <option value="">Select Simulation</option>
              {simulationResults.map((_, index) => (
                <option key={index} value={index}>
                  Simulation {index + 1}
                </option>
              ))}
            </select>
          </div>

          {selectedSimulation !== null && (
            <div className="flex">
              <div className="flex flex-col">
                <div
                  style={{
                    width: chartDimensions.width,
                    height: chartDimensions.height,
                  }}
                >
                  <Line
                    data={accountTrajectorySoloData}
                    options={accountTrajectorySoloOptions}
                  />
                </div>
                <div
                  style={{
                    width: chartDimensions.width,
                    height: chartDimensions.height,
                  }}
                >
                  <Bar
                    data={accountChangesData}
                    options={accountChangesOptions}
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <div>
                  <div className="w-full" style={{ height: "400px" }}>
                    <div className="flex mb-3 my-2">
                      <div className="w-[50%]">
                        <h4 className="text-lg font-semibold mb-2">
                          Section A: Saving Phase
                        </h4>
                        <table className="table-auto">
                          <thead>
                            <tr>
                              <th className="px-4 py-1 text-left">Metric</th>
                              <th className="px-4 py-1 text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Starting Account Value
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(startingAccountValue)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Total Saved
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(totalSavings)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Total Investment Growth
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(totalGrowthNom)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Account at Retirement
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(accountValueAtRetirement)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Avg Growth Before Retirement
                              </td>
                              <td className="px-4 py-1 text-right">
                                {(averageGrowthPerc * 100).toFixed(2)}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="w-[50%]">
                        <h4 className="text-lg font-semibold mb-2">
                          Section B: Withdrawal Phase
                        </h4>
                        <table className="table-auto">
                          <thead>
                            <tr>
                              <th className="px-4 py-1 text-left">Metric</th>
                              <th className="px-4 py-1 text-right">Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Withdrawal at {currentAge}
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(annualWithdrawal)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                First Withdrawal {retirementAge + 1} (inflation)
                              </td>
                              <td className="px-4 py-1 text-right">
                                {formatCurrency(-firstRetirementWithdrawal)}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Inflation Impact over{" "}
                                {retirementAge - currentAge + 1} Years
                              </td>
                              <td className="px-4 py-1 text-right">
                                {(
                                  (-firstRetirementWithdrawal /
                                    annualWithdrawal -
                                    1) *
                                  100
                                ).toFixed(0)}
                                %
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Years Before Account Depleted
                              </td>
                              <td className="px-4 py-1 text-right">
                                {yearsBeforeDepletionResult}
                              </td>
                            </tr>
                            <tr>
                              <td className="px-4 py-1 text-left">
                                Avg Growth After Retirement
                              </td>
                              <td className="px-4 py-1 text-right">
                                {(averageGrowthPercPostRetire * 100).toFixed(2)}
                                %
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    width: chartDimensions.width,
                    height: chartDimensions.height,
                  }}
                >
                  <Bar
                    data={investmentReturnData}
                    options={investmentReturnOptions}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RetirementSimulator;
