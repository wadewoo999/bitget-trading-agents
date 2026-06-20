export function calculateRsi(closes: number[], period = 14): number[] {
  if (!closes.length || period < 1 || closes.length <= period) throw new Error("Invalid RSI input");
  const result = Array(closes.length).fill(50) as number[];
  let gain = 0; let loss = 0;
  for (let index = 1; index <= period; index++) {
    const change = closes[index]! - closes[index - 1]!;
    gain += Math.max(change, 0); loss += Math.max(-change, 0);
  }
  let averageGain = gain / period; let averageLoss = loss / period;
  const value = () => averageGain === 0 && averageLoss === 0 ? 50 : averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  result[period] = value();
  for (let index = period + 1; index < closes.length; index++) {
    const change = closes[index]! - closes[index - 1]!;
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index] = value();
  }
  return result;
}
