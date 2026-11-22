import { describe, it, expect } from 'vitest';
import { assess, normalizeGrade, Criterion } from './engine';
const c = (o: Partial<Criterion> & Pick<Criterion, 'kind' | 'operator' | 'value'>): Criterion => ({ id: Math.random().toString(), confidence: 1, ...o });

describe('assess', () => {
  it('eligible when all pass', () => {
    const r = assess([c({ kind: 'nationality', operator: 'in', value: ['Kenya'] }), c({ kind: 'min_grade', operator: 'gte', value: 3 })],
      { nationalities: ['kenya'], gradeNormalized: 3.4 });
    expect(r.status).toBe('eligible');
  });
  it('not eligible on a confident fail', () => {
    expect(assess([c({ kind: 'age', operator: 'lte', value: 30 })], { ageYears: 35 }).status).toBe('not_eligible');
  });
  it('low-confidence fail is only potentially eligible', () => {
    expect(assess([c({ kind: 'age', operator: 'lte', value: 30, confidence: 0.5 })], { ageYears: 35 }).status).toBe('potentially_eligible');
  });
  it('insufficient information with empty profile or no criteria', () => {
    expect(assess([c({ kind: 'min_grade', operator: 'gte', value: 3 })], {}).status).toBe('insufficient_information');
    expect(assess([], {}).status).toBe('insufficient_information');
  });
  it('excluded nationality fails', () => {
    expect(assess([c({ kind: 'nationality', operator: 'not_in', value: ['Kenya'] })], { nationalities: ['Kenya'] }).status).toBe('not_eligible');
  });
});
describe('normalizeGrade', () => {
  it('scales and rejects out-of-range', () => {
    expect(normalizeGrade(80, '100')).toBe(3.2);
    expect(normalizeGrade(11, '10')).toBeUndefined();
  });
});
