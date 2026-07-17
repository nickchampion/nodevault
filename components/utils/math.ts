export type PriceRange = {
  lowest: number
  highest: number
  close: number
  closeAtUtc: string
}

/**
 * Is the source within the percentage range of destination
 * @param source
 * @param destination
 * @param percentage
 */
export const withinRange = (source: number, destination: number, percentage: number) => {
  const diff = (destination / 100) * percentage

  return source >= destination - diff && source <= destination + diff
}

/**
 * Is the target between the min & max
 * @param target
 * @param min
 * @param max
 * @param inclusive
 */
export const between = (target: number, min: number, max: number, inclusive = true) => {
  return inclusive ? target >= min && target <= max : target > min && target < max
}

/**
 * Add the percentage specifed of destination to destination and see if source if less than the result
 * @param source
 * @param destination
 * @param percentage
 * @returns
 */
export const withinRangeCeiling = (source: number, destination: number, percentage: number) => {
  const diff = (destination / 100) * percentage

  return source <= destination + diff
}

/**
 * Subtract the percentage specified of destination from destination and see if source if greater than the result
 * @param source
 * @param destination
 * @param percentage
 * @returns
 */
export const withinRangeFloor = (source: number, destination: number, percentage: number) => {
  const diff = (destination / 100) * percentage

  return source >= destination - diff
}

/**
 * Round a number to the specified number of decimal places
 * @param source
 * @param percentage
 * @returns
 */
export const round = (source: number, decimalPlaces = 0) => {
  if (source == null) {
    return source
  }

  return Number.parseFloat(source.toFixed(decimalPlaces))
}

/**
 * Average numbers and round
 * @param items
 * @param decimalPlaces
 * @returns
 */
export const average = (items: number[], decimalPlaces = 2) => round(items.reduce((a, b) => a + b) / items.length, decimalPlaces)

/**
 * Returns the typical price for a set of prices
 * https://en.wikipedia.org/wiki/Typical_price
 * @param prices
 */
export const typicalPrice = (prices: PriceRange[]): number => {
  const highestInRange = prices.map(p => p.highest).sort((a, b) => b - a)[0]
  const lowestInRange = prices.map(p => p.lowest).sort((a, b) => a - b)[0]
  const lastCloseInRange = prices.sort((a, b) => (a.closeAtUtc > b.closeAtUtc ? -1 : 1))[0].close

  return round((highestInRange + lowestInRange + lastCloseInRange) / 3, 2)
}

/**
 * Find the smallest number in the array
 * @param items
 * @returns
 */
export const min = (items: number[]) => {
  return items.sort(sortNumAscending)[0]
}

/**
 * Find the largest number in the array
 * @param items
 * @returns
 */
export const max = (items: number[]) => {
  return items.sort(sortNumDescending)[0]
}

/**
 * Sum up the numbers and average by the count field
 * @param items
 * @param decimalPlaces
 * @returns
 */
export const averageBy = (items: number[], count: number, decimalPlaces = 2) => {
  const sum = items.reduce((sum, m) => sum + m, 0)

  return round(sum / count, decimalPlaces)
}

/**
 * Sum up and round
 * @param items
 * @param decimalPlaces
 * @returns
 */
export const sum = (items: number[], decimalPlaces = 2) => round(
  items.reduce((sum, m) => sum + m, 0),
  decimalPlaces,
)

/**
 * Sum up
 * @param items
 * @returns
 */
export const sumRaw = (items: number[]) => items.reduce((sum, m) => sum + m, 0)

/**
 * Calculate the percentage the part parameter is of the total parameter
 */
export const percentage = (part: number, total: number, decimalPlaces = 2) => {
  return round((part / Math.max(total, 1)) * 100, decimalPlaces)
}

/**
 * returns the percent of the total
 */
export const percentageOf = (percentage: number, total: number, decimalPlaces = 2) => {
  return round((Math.max(total, 1) / 100) * percentage, decimalPlaces)
}

/**
 * Returns the percentage difference between 2 numbers
 */
export const percentageDiff = (a: number, b: number, decimalPlaces = 2) => {
  return round((100 * (a - b)) / ((a + b) / 2), decimalPlaces)
}

export const percentageDiffYieldVariance = (a: number, b: number, decimalPlaces = 2) => {
  return round((a / b - 1) * 100, decimalPlaces)
}

export const percentageRaw = (part: number, total: number) => {
  return (part / Math.max(total, 1)) * 100
}

export const percentageOfRaw = (percentage: number, total: number) => {
  return (Math.max(total, 0) / 100) * percentage
}

export const positivePrice = (price: number) => {
  return { amount: price > 0 ? round(price, 0) : 0, currency: 'GBP' }
}

/**
 * Sort low to high
 * @param n1
 * @param n2
 * @returns
 */
export const sortNumAscending = (n1: number, n2: number): number => {
  return n1 - n2
}

/**
 * Sort high to low
 * @param n1
 * @param n2
 * @returns
 */
export const sortNumDescending = (n1: number, n2: number): number => {
  return n2 - n1
}
