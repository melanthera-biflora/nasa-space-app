// Presenter for the household form on `/` (round 6): the choices, and the one-line summary a folded person shows
// ("Adults (18–64) · Asthma, Allergies"). The answers stay in this tab (lib/household.js); nothing here is stored.

export const AGE_GROUPS = ['Children (0–12)', 'Teens (13–17)', 'Adults (18–64)', '65 and older']

export const CONDITIONS = [
  { id: 'asthma', label: 'Asthma or lung disease', short: 'Asthma or lungs' },
  { id: 'heart', label: 'Heart disease or high blood pressure', short: 'Heart or blood pressure' },
  { id: 'allergy', label: 'Pollen, dust, or mold allergies', short: 'Allergies' },
  { id: 'diabetes', label: 'Diabetes', short: 'Diabetes' },
  { id: 'kidney', label: 'Kidney disease', short: 'Kidney disease' },
]

// choosing one of these clears the conditions above
export const OTHER_ANSWERS = [
  { id: 'none', label: 'None', short: 'No conditions' },
  { id: 'not-sure', label: 'Not sure', short: 'Not sure' },
  { id: 'no-answer', label: 'Prefer not to say', short: 'Prefer not to say' },
]

/** A person counts as answered with at least one condition or one of the other answers. */
export const isAnswered = (p) => p.conditions.length > 0 || Boolean(p.special)

/** What a folded person shows after their age group. */
export function personSummary(p) {
  if (p.special) return OTHER_ANSWERS.find((a) => a.id === p.special)?.short || ''
  const names = p.conditions.map((id) => (id === 'other' ? p.otherText.trim() || 'Other' : CONDITIONS.find((c) => c.id === id)?.short)).filter(Boolean)
  return names.length ? names.join(', ') : 'No answer yet'
}

/** Which face a person gets: the age group's picture, the same one in the list and the panel (never a guess at
 *  who they are, so the two pictures per age group alternate by order). */
export function faceFor(age, index) {
  const group = age.startsWith('65') ? 'senior' : age.startsWith('Teens') ? 'teen' : age.startsWith('Children') ? 'child' : 'adult'
  const pair = { senior: ['senior-woman', 'senior-man'], adult: ['adult-woman', 'adult-man'], teen: ['teen-girl', 'teen-boy'], child: ['child-girl', 'child-boy'] }[group]
  return `/images/people/small/${pair[index % 2]}.webp`
}
