export function calcPressTime(totalScreens, qty, complexity = {}) {
  const { underbase = false, flashCure = false, specialtyInk = false, halftones = false, oversized = false } = complexity;
  const setupMinutes = 15 * totalScreens + (underbase ? 10 : 0) + (halftones ? 5 : 0);
  const complexityMult = 1 + (flashCure ? 0.2 : 0) + (specialtyInk ? 0.15 : 0) + (oversized ? 0.1 : 0);
  const minutesPerUnit = 0.15 * totalScreens * complexityMult;
  const totalMinutes = setupMinutes + minutesPerUnit * qty;
  return { setupMinutes, complexityMult, minutesPerUnit, totalMinutes, totalHours: totalMinutes / 60 };
}

export function calcComplexityCostAdder(complexity = {}) {
  const { underbase = false, flashCure = false, specialtyInk = false, oversized = false } = complexity;
  return (underbase ? 0.35 : 0) + (flashCure ? 0.20 : 0) + (specialtyInk ? 0.40 : 0) + (oversized ? 0.25 : 0);
}

export function calcJobScore(marginPct, dollarsPerHour, totalProfit, complexityMult, targetHourlyRate) {
  // Margin component (35%): 0% margin = 0, 50%+ = 100
  const marginScore = Math.min(100, Math.max(0, (marginPct / 50) * 100));

  // $/hr component (30%): 0 = 0, 2x target = 100
  const hrScore = Math.min(100, Math.max(0, (dollarsPerHour / (targetHourlyRate * 2)) * 100));

  // Total profit component (20%): $0 = 0, $1000+ = 100
  const profitScore = Math.min(100, Math.max(0, (totalProfit / 1000) * 100));

  // Complexity penalty (15%): 1.0x = 0 penalty, 1.5x+ = full penalty
  const complexityPenalty = Math.min(100, Math.max(0, ((complexityMult - 1) / 0.5) * 100));

  const score = marginScore * 0.35 + hrScore * 0.30 + profitScore * 0.20 - complexityPenalty * 0.15;
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Determine dominant factor
  let dominantFactor = "balanced";
  const factors = [
    { name: "low margin", value: marginScore, weight: 0.35 },
    { name: "slow press", value: hrScore, weight: 0.30 },
    { name: "low profit", value: profitScore, weight: 0.20 },
  ];
  const weakest = factors.reduce((a, b) => (a.value * a.weight < b.value * b.weight ? a : b));
  if (weakest.value < 50) dominantFactor = weakest.name;
  if (complexityPenalty > 60) dominantFactor = "high complexity";

  return { score: clampedScore, dominantFactor };
}

export function findMinProfitableQty(params, locations, increase, perUnitAddOns, complexityCostAdder, complexity, targetHourlyRate) {
  const calcCostAtQty = (q) => {
    let printCost = 0;
    let printSell = 0;
    let totalScreens = 0;
    for (const loc of locations) {
      const p = params[loc.screens - 1];
      if (!p) return null;
      printCost += p.setup / q + p.variable;
      printSell += (1 + increase / 100) * (p.setup / q + p.variable);
      totalScreens += loc.screens;
    }
    const sellPerUnit = printSell + perUnitAddOns + complexityCostAdder;
    const costPerUnit = printCost + perUnitAddOns + complexityCostAdder;
    const totalProfit = (sellPerUnit - costPerUnit) * q;
    const pressTime = calcPressTime(totalScreens, q, complexity);
    const dollarsPerHour = pressTime.totalHours > 0 ? totalProfit / pressTime.totalHours : 0;
    return dollarsPerHour;
  };

  for (let q = 1; q <= 2500; q++) {
    const dph = calcCostAtQty(q);
    if (dph !== null && dph >= targetHourlyRate) return q;
  }
  return null;
}

export function findBreakEvenQty(params, locations, increase, perUnitAddOns, complexityCostAdder) {
  for (let q = 1; q <= 2500; q++) {
    let printCost = 0;
    let printSell = 0;
    let valid = true;
    for (const loc of locations) {
      const p = params[loc.screens - 1];
      if (!p) { valid = false; break; }
      printCost += p.setup / q + p.variable;
      printSell += (1 + increase / 100) * (p.setup / q + p.variable);
    }
    if (!valid) continue;
    const sellPerUnit = printSell + perUnitAddOns + complexityCostAdder;
    const costPerUnit = printCost + perUnitAddOns + complexityCostAdder;
    const screenFees = locations.reduce((s, l) => s + l.screens, 0) * 27;
    const totalRevenue = sellPerUnit * q;
    const totalCost = costPerUnit * q + screenFees;
    if (totalRevenue >= totalCost) return q;
  }
  return null;
}

export function calcEmbroideryTime(stitchCount, qty, threadColors = 1, numHeads = 1) {
  const stitchesPerMin = 700; // realistic commercial SPM (was 800)
  const sewTimePerUnit = stitchCount / stitchesPerMin; // minutes
  const hoopTimePerUnit = 2.0; // realistic hoop/align time (was 0.75)
  const hoopCycles = Math.ceil(qty / Math.max(1, numHeads));
  const setupMinutes = 10 + threadColors * 3;
  const totalMinutes = setupMinutes + sewTimePerUnit * hoopCycles + hoopTimePerUnit * qty;
  return { setupMinutes, totalMinutes, totalHours: totalMinutes / 60 };
}

export function calcDTFTime(qty, pressTimeSec = 15, setupMinutes = 5, numPlacements = 1) {
  const pressMinutes = (pressTimeSec * qty * numPlacements) / 60;
  const totalMinutes = setupMinutes + pressMinutes;
  return { setupMinutes, pressMinutes, totalMinutes, totalHours: totalMinutes / 60 };
}

export function calcShopRates(shopEconomics) {
  if (!shopEconomics) return null;
  const { costItems, utilization, hoursPerDay, numPresses, daysPerWeek, targetMargin } = shopEconomics;
  const monthlyCosts = costItems.reduce((s, c) => s + c.amount, 0);
  const util = utilization / 100;
  const margin = targetMargin / 100;
  const productiveHrsPerMonth = hoursPerDay * util * numPresses * daysPerWeek * 4.33;
  const minShopRate = productiveHrsPerMonth > 0 ? monthlyCosts / productiveHrsPerMonth : 0;
  const monthlyRevenue = margin < 1 ? monthlyCosts / (1 - margin) : monthlyCosts * 10;
  const idealShopRate = productiveHrsPerMonth > 0 ? monthlyRevenue / productiveHrsPerMonth : 0;
  return { minShopRate, idealShopRate, monthlyCosts, productiveHrsPerMonth };
}

export function buildProfitabilityTable(params, locations, increase, perUnitAddOns, complexityCostAdder, complexity, garmentCost, garmentMarkup, pantoneColors, qtyTiers) {
  const totalScreens = locations.reduce((s, l) => s + l.screens, 0);
  const screenFees = totalScreens * 27;
  const pantoneFees = pantoneColors * 15;
  const garmentSell = garmentCost * (1 + garmentMarkup / 100);

  return qtyTiers.map((tier) => {
    const q = tier.rep;
    let printCost = 0;
    let printSell = 0;
    let valid = true;
    for (const loc of locations) {
      const p = params[loc.screens - 1];
      if (!p) { valid = false; break; }
      if (q < p.minQty) { valid = false; break; }
      printCost += p.setup / q + p.variable;
      printSell += (1 + increase / 100) * (p.setup / q + p.variable);
    }
    if (!valid) return { qty: q, label: tier.label, valid: false };

    const sellPerUnit = printSell + perUnitAddOns + complexityCostAdder + garmentSell;
    const costPerUnit = printCost + perUnitAddOns + complexityCostAdder + garmentCost;
    const totalRevenue = sellPerUnit * q + screenFees + pantoneFees;
    const totalCost = costPerUnit * q + screenFees + pantoneFees;
    const profit = totalRevenue - totalCost;
    const pressTime = calcPressTime(totalScreens, q, complexity);
    const dollarsPerHour = pressTime.totalHours > 0 ? profit / pressTime.totalHours : 0;

    return {
      qty: q, label: tier.label, valid: true,
      pricePerUnit: sellPerUnit, totalRevenue, totalCost,
      profit, dollarsPerHour, pressHours: pressTime.totalHours,
    };
  });
}
