export function calculateEma(values: number[], period: number): number[] {
  if (!values.length || !Number.isInteger(period) || period < 1) throw new Error("Invalid EMA input");
  const multiplier = 2 / (period + 1);
  const result = [values[0]!];
  for (let index = 1; index < values.length; index++) result.push(values[index]! * multiplier + result[index - 1]! * (1 - multiplier));
  return result;
}
