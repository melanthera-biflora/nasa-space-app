import { describe, expect, it } from 'vitest'
import { faceFor, isAnswered, personSummary } from './householdForm'

const person = (over = {}) => ({ age: 'Adults (18–64)', conditions: [], otherText: '', special: null, ...over })

describe('the household form', () => {
  it('sums up a folded person in a few words', () => {
    expect(personSummary(person({ conditions: ['asthma', 'allergy'] }))).toBe('Asthma or lungs, Allergies')
    expect(personSummary(person({ conditions: ['other'], otherText: ' Lupus ' }))).toBe('Lupus')
    expect(personSummary(person({ conditions: ['other'] }))).toBe('Other')
    expect(personSummary(person({ special: 'none' }))).toBe('No conditions')
    expect(personSummary(person())).toBe('No answer yet')
  })

  it('counts a person as answered with a condition or another answer', () => {
    expect(isAnswered(person())).toBe(false)
    expect(isAnswered(person({ special: 'not-sure' }))).toBe(true)
    expect(isAnswered(person({ conditions: ['heart'] }))).toBe(true)
  })

  it('gives each person the small picture for their age group, alternating by order', () => {
    expect(faceFor('65 and older', 0)).toBe('/images/people/small/senior-woman.webp')
    expect(faceFor('65 and older', 1)).toBe('/images/people/small/senior-man.webp')
    expect(faceFor('Children (0–12)', 2)).toBe('/images/people/small/child-girl.webp')
    expect(faceFor('Teens (13–17)', 1)).toBe('/images/people/small/teen-boy.webp')
  })
})
