// Deterministic eligibility engine. Advisory only: never an official decision.
export type Level = 'highschool' | 'diploma' | 'bachelor' | 'master' | 'phd';
const LEVEL_RANK: Level[] = ['highschool', 'diploma', 'bachelor', 'master', 'phd'];

export interface Profile {
  nationalities?: string[];
  ageYears?: number;
  gradeNormalized?: number; // 0-4, see normalizeGrade
  highestCompleted?: Level;
  experienceYears?: number;
  languages?: string[];
}
export type Kind = 'nationality' | 'min_grade' | 'age' | 'experience' | 'language' | 'degree_required';
export interface Criterion {
  id: string; kind: Kind;
  operator: 'in' | 'not_in' | 'gte' | 'lte' | 'between' | 'eq';
  value: unknown; confidence: number; // extraction confidence 0-1
}
export type Result = 'pass' | 'fail' | 'unknown';
export interface CriterionResult { criterionId: string; kind: Kind; result: Result; reason: string; confidence: number }
export type Status = 'eligible' | 'potentially_eligible' | 'not_eligible' | 'insufficient_information';

const norm = (s: string) => s.trim().toLowerCase();

/** Linear approximation to a 0-4 scale. Real conversions vary by institution: display as approximate. */
export function normalizeGrade(value: number, scale: '4' | '5' | '10' | '100'): number | undefined {
  const max = Number(scale);
  if (!(value >= 0 && value <= max)) return undefined;
  return Math.round((value / max) * 4 * 100) / 100;
}

export function evaluateCriterion(c: Criterion, p: Profile): CriterionResult {
  const out = (result: Result, reason: string): CriterionResult =>
    ({ criterionId: c.id, kind: c.kind, result, reason, confidence: c.confidence });
  const list = Array.isArray(c.value) ? (c.value as string[]).map(norm) : [];
  const num = typeof c.value === 'number' ? c.value : undefined;

  switch (c.kind) {
    case 'nationality': {
      if (!p.nationalities?.length) return out('unknown', 'Your nationality is not in your profile.');
      const mine = p.nationalities.map(norm);
      const hit = mine.some(n => list.includes(n));
      if (c.operator === 'in') return out(hit ? 'pass' : 'fail', hit ? 'Your nationality is eligible.' : 'Your nationality is not in the eligible list.');
      if (c.operator === 'not_in') return out(hit ? 'fail' : 'pass', hit ? 'Your nationality is excluded.' : 'Your nationality is not excluded.');
      return out('unknown', 'Unsupported nationality rule.');
    }
    case 'min_grade': {
      if (num === undefined) return out('unknown', 'Minimum grade could not be read.');
      if (p.gradeNormalized === undefined) return out('unknown', 'Your grade is not in your profile.');
      const ok = p.gradeNormalized >= num;
      return out(ok ? 'pass' : 'fail', `Your approx. grade ${p.gradeNormalized}/4 vs required ${num}/4.`);
    }
    case 'age': {
      if (p.ageYears === undefined) return out('unknown', 'Your age is not in your profile.');
      const [lo, hi] = c.operator === 'between' && Array.isArray(c.value) ? (c.value as number[]) : [undefined, undefined];
      const ok = c.operator === 'lte' ? num !== undefined && p.ageYears <= num
        : c.operator === 'gte' ? num !== undefined && p.ageYears >= num
        : lo !== undefined && hi !== undefined && p.ageYears >= lo && p.ageYears <= hi;
      return out(ok ? 'pass' : 'fail', ok ? 'Within the age limit.' : 'Outside the age limit.');
    }
    case 'experience': {
      if (num === undefined) return out('unknown', 'Required experience could not be read.');
      if (p.experienceYears === undefined) return out('unknown', 'Your work experience is not in your profile.');
      const ok = p.experienceYears >= num;
      return out(ok ? 'pass' : 'fail', `You have ${p.experienceYears}y, ${num}y required.`);
    }
    case 'language': {
      if (!list.length) return out('unknown', 'Language requirement could not be read.');
      if (!p.languages?.length) return out('unknown', 'No languages in your profile. Certificates may still be required.');
      const ok = list.every(l => p.languages!.map(norm).includes(l));
      return out(ok ? 'pass' : 'fail', ok ? 'Required language listed (certificate may still be required).' : 'Required language not in your profile.');
    }
    case 'degree_required': {
      const need = LEVEL_RANK.indexOf(String(c.value) as Level);
      if (need < 0) return out('unknown', 'Required degree could not be read.');
      if (!p.highestCompleted) return out('unknown', 'Your highest qualification is not in your profile.');
      const ok = LEVEL_RANK.indexOf(p.highestCompleted) >= need;
      return out(ok ? 'pass' : 'fail', ok ? 'Qualification level met.' : `Requires ${c.value}.`);
    }
  }
}

const CONFIDENT = 0.8;
export function assess(criteria: Criterion[], p: Profile): { status: Status; results: CriterionResult[] } {
  const results = criteria.map(c => evaluateCriterion(c, p));
  if (!results.length) return { status: 'insufficient_information', results };
  const fails = results.filter(r => r.result === 'fail');
  const unknowns = results.filter(r => r.result === 'unknown');
  let status: Status;
  if (fails.some(f => f.confidence >= CONFIDENT)) status = 'not_eligible';
  else if (fails.length) status = 'potentially_eligible'; // failed only on low-confidence extraction: needs human check
  else if (unknowns.length === results.length) status = 'insufficient_information';
  else if (unknowns.length) status = 'potentially_eligible';
  else status = 'eligible';
  return { status, results };
}
