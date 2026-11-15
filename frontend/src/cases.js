// Guided demo cases and places to compare, chosen from the US scan (docs/TREND_DETECTIVE_PLAN.md).
// No numbers here: every number on screen comes from the live report.

export const CASES = [
  {
    id: 'phoenix',
    label: 'Phoenix nights',
    question: 'Are Phoenix nights getting hotter?',
    place: { name: 'Phoenix, Maricopa County, Arizona', lat: 33.45, lon: -112.07 },
    household: [{ age: '65 and older', conditions: ['heart'] }],
    focus: 'warm_nights',
  },
  {
    id: 'houston',
    label: 'Houston heat',
    question: 'Has Houston gained very hot days? The airport weather station tells the same story as NASA here.',
    place: { name: 'Houston, Harris County, Texas', lat: 29.76, lon: -95.37 },
    household: [{ age: 'Adults (18–64)', conditions: [] }],
    focus: 'hot_days',
  },
  {
    id: 'spokane',
    label: 'Spokane smoke',
    question: 'Is wildfire smoke changing the air in Spokane?',
    place: { name: 'Spokane, Spokane County, Washington', lat: 47.66, lon: -117.43 },
    household: [{ age: 'Children (0–12)', conditions: ['asthma'] }],
    focus: 'smoke_days',      // the smoke question is answered by smoke days (round 3)
  },
]

// Good pairs: Phoenix vs Seattle (warm nights), Spokane vs Washington DC (PM2.5),
// Los Angeles vs Midland (NO2), Atlanta vs Boise (fire detections).
export const COMPARE_PLACES = [
  { name: 'Seattle, WA', lat: 47.61, lon: -122.33 },
  { name: 'Washington, DC', lat: 38.91, lon: -77.04 },
  { name: 'Midland, TX', lat: 31.99, lon: -102.08 },
  { name: 'Los Angeles, CA', lat: 34.05, lon: -118.24 },
  { name: 'Spokane, WA', lat: 47.66, lon: -117.43 },
  { name: 'Atlanta, GA', lat: 33.75, lon: -84.39 },
  { name: 'Boise, ID', lat: 43.62, lon: -116.2 },
  { name: 'Phoenix, AZ', lat: 33.45, lon: -112.07 },
  { name: 'Houston, TX', lat: 29.76, lon: -95.37 },
  { name: 'Miami, FL', lat: 25.76, lon: -80.19 },
  { name: 'New York, NY', lat: 40.76, lon: -73.99 },
]
