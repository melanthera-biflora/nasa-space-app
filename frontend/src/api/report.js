import { postJson } from './http'

// Health page ids -> keys in data_pipeline/config/conditions.json ('other' has no card mapping)
const CONDITION_KEYS = {
  asthma: 'asthma_copd',
  heart: 'heart_disease',
  allergy: 'allergies',
  diabetes: 'diabetes',
  kidney: 'kidney_disease',
}

// Health page age labels -> conditions.json age groups ("Children (0–12)" uses the youngest, most sensitive group)
function ageKey(label) {
  if (label.startsWith('Children')) return 'under_5'
  if (label.startsWith('Teens')) return '5_17'
  if (label.startsWith('65')) return '65_plus'
  return '18_64'
}

// Everyone in the household counts: all their conditions and all their age groups.
export function householdToQuery(household = []) {
  const conditions = [...new Set(household.flatMap((p) => p.conditions.map((c) => CONDITION_KEYS[c]).filter(Boolean)))]
  const ages = [...new Set(household.map((p) => ageKey(p.age)))]
  return {
    conditions: conditions.length ? conditions : ['none'],
    ages: ages.length ? ages : ['18_64'],
  }
}

/** @returns {Promise<import('./types').Report>} */
export async function fetchReport({ household, location, period = 25, range = null }, signal) {
  const { conditions, ages } = householdToQuery(household)
  const body = { lat: location.lat, lon: location.lon, conditions, age_groups: ages, period }
  if (range) Object.assign(body, { start: range.from, end: range.to })   // a custom From-To (A3)
  return postJson('/reports', body, signal)   // the household rides in the body, never in a URL (D38)
}
