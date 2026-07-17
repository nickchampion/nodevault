export default class Timer {
  start: number

  constructor() {
    this.start = Date.now()
  }

  elasped() {
    return `${Date.now() - +this.start}ms since start`
  }

  stop() {
    return Date.now() - +this.start
  }
}

/**
 * Pause execution for the given number of milliseconds.
 */
export const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
