import { getJson } from './http'

/** One year at a point as 52 weeks with each week's usual range (no trend test). */
export const fetchWeekly = ({ lat, lon, variable, year, period = 25 }, signal) =>
  getJson(`/weekly?${new URLSearchParams({ lat, lon, variable, year, period })}`, signal)
