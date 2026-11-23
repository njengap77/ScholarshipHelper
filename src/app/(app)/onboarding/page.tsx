'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  saveStep1Action,
  saveStep2Action,
  saveStep3Action,
  saveStep4Action,
  saveStep5Action,
  completeOnboardingAction,
  getFullUserProfile,
} from '@/lib/onboarding/actions'
import { normalizeGrade } from '@/lib/eligibility/engine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const COMMON_COUNTRIES = [
  'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Nigeria', 'Ghana', 'South Africa',
  'Egypt', 'Ethiopia', 'India', 'United States', 'United Kingdom', 'Canada',
  'Germany', 'France', 'Australia', 'Japan', 'China', 'Brazil'
]

const STUDY_FIELDS = [
  'Computer Science', 'Data Science & AI', 'Software Engineering', 'Information Technology',
  'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering',
  'Medicine & Health Sciences', 'Public Health', 'Biomedical Science',
  'Business Administration', 'Economics', 'Finance', 'Marketing',
  'Law & Human Rights', 'International Relations', 'Political Science',
  'Environmental Science & Climate', 'Agriculture', 'Education', 'Mathematics & Physics'
]

const OPPORTUNITY_TYPES = ['Scholarship', 'Fellowship', 'Grant', 'Internship', 'Research Program']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Personal
  const [fullName, setFullName] = useState('')
  const [countryResidence, setCountryResidence] = useState('')
  const [nationalities, setNationalities] = useState<string[]>([])
  const [dob, setDob] = useState('')

  // Step 2: Academic
  const [currentLevel, setCurrentLevel] = useState<string>('bachelor')
  const [highestCompleted, setHighestCompleted] = useState<string>('highschool')
  const [institution, setInstitution] = useState('')
  const [field, setField] = useState('Computer Science')
  const [specialization, setSpecialization] = useState('')
  const [gradeValue, setGradeValue] = useState<number | ''>('')
  const [gradeScale, setGradeScale] = useState<'4' | '5' | '10' | '100'>('4')
  const [expectedGraduation, setExpectedGraduation] = useState('')

  // Step 3: Preferences
  const [studyLevels, setStudyLevels] = useState<string[]>(['master'])
  const [preferredFields, setPreferredFields] = useState<string[]>(['Computer Science'])
  const [preferredCountries, setPreferredCountries] = useState<string[]>([])
  const [oppTypes, setOppTypes] = useState<string[]>(['Scholarship'])
  const [fundingNeed, setFundingNeed] = useState<string>('full')
  const [relocate, setRelocate] = useState(true)
  const [formats, setFormats] = useState<string[]>(['physical'])

  // Step 4: Skills & Interests
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [researchInterests, setResearchInterests] = useState<string[]>([])
  const [researchInput, setResearchInput] = useState('')
  const [certifications, setCertifications] = useState<string[]>([])
  const [certInput, setCertInput] = useState('')
  const [extracurriculars, setExtracurriculars] = useState<string[]>([])
  const [extraInput, setExtraInput] = useState('')

  // Step 5: Finances
  const [canPayFees, setCanPayFees] = useState(false)
  const [canPayTravel, setCanPayTravel] = useState(false)
  const [canPayLiving, setCanPayLiving] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getFullUserProfile()
        if (data?.profile) {
          if (data.profile.full_name) setFullName(data.profile.full_name)
          if (data.profile.country_residence) setCountryResidence(data.profile.country_residence)
          if (data.profile.nationalities?.length) setNationalities(data.profile.nationalities)
          if (data.profile.dob) setDob(data.profile.dob)
          if (data.profile.highest_completed_level) setHighestCompleted(data.profile.highest_completed_level)
          if (data.profile.skills?.length) setSkills(data.profile.skills)
          if (data.profile.research_interests?.length) setResearchInterests(data.profile.research_interests)
          if (data.profile.certifications?.length) setCertifications(data.profile.certifications)
          if (data.profile.extracurriculars?.length) setExtracurriculars(data.profile.extracurriculars)
        }
        if (data?.preferences) {
          if (data.preferences.study_levels?.length) setStudyLevels(data.preferences.study_levels)
          if (data.preferences.fields?.length) setPreferredFields(data.preferences.fields)
          if (data.preferences.countries?.length) setPreferredCountries(data.preferences.countries)
          if (data.preferences.opp_types?.length) setOppTypes(data.preferences.opp_types)
          if (data.preferences.funding_needs) setFundingNeed(data.preferences.funding_needs)
          if (data.preferences.relocate !== undefined) setRelocate(data.preferences.relocate)
          if (data.preferences.formats?.length) setFormats(data.preferences.formats)
          if (data.preferences.can_pay_fees !== undefined) setCanPayFees(data.preferences.can_pay_fees)
          if (data.preferences.can_pay_travel !== undefined) setCanPayTravel(data.preferences.can_pay_travel)
        }
        if (data?.academic?.length) {
          const latest = data.academic[0]
          if (latest.level) setHighestCompleted(latest.level)
          if (latest.institution) setInstitution(latest.institution)
          if (latest.field) setField(latest.field)
          if (latest.specialization) setSpecialization(latest.specialization)
          if (latest.grade_value !== null) setGradeValue(Number(latest.grade_value))
          if (latest.grade_scale) setGradeScale(latest.grade_scale as '4' | '5' | '10' | '100')
          if (latest.expected_graduation) setExpectedGraduation(latest.expected_graduation)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Calculate normalized grade preview
  const normalizedPreview =
    gradeValue !== '' && !isNaN(Number(gradeValue))
      ? normalizeGrade(Number(gradeValue), gradeScale)
      : undefined

  async function handleNext() {
    setError(null)
    setSaving(true)

    try {
      if (step === 1) {
        if (!nationalities.length) {
          setError('Please select at least one nationality.')
          setSaving(false)
          return
        }
        const res = await saveStep1Action({
          fullName,
          countryResidence,
          nationalities,
          dob,
        })
        if (res.error) {
          setError(res.error)
          setSaving(false)
          return
        }
      } else if (step === 2) {
        if (!highestCompleted) {
          setError('Highest completed level is required for eligibility assessment.')
          setSaving(false)
          return
        }
        if (!field) {
          setError('Field of study is required.')
          setSaving(false)
          return
        }
        const res = await saveStep2Action({
          currentLevel,
          highestCompleted,
          institution,
          field,
          specialization,
          gradeValue: gradeValue === '' ? undefined : Number(gradeValue),
          gradeScale,
          expectedGraduation,
        })
        if (res.error) {
          setError(res.error)
          setSaving(false)
          return
        }
      } else if (step === 3) {
        if (!fundingNeed) {
          setError('Please select your funding requirement.')
          setSaving(false)
          return
        }
        if (!preferredFields.length) {
          setError('Please select at least one field of study.')
          setSaving(false)
          return
        }
        const res = await saveStep3Action({
          studyLevels,
          fields: preferredFields,
          countries: preferredCountries,
          oppTypes,
          fundingNeed,
          relocate,
          formats,
        })
        if (res.error) {
          setError(res.error)
          setSaving(false)
          return
        }
      } else if (step === 4) {
        const res = await saveStep4Action({
          skills,
          researchInterests,
          certifications,
          extracurriculars,
        })
        if (res.error) {
          setError(res.error)
          setSaving(false)
          return
        }
      } else if (step === 5) {
        const res5 = await saveStep5Action({
          canPayFees,
          canPayTravel,
          canPayLiving,
        })
        if (res5.error) {
          setError(res5.error)
          setSaving(false)
          return
        }
        const comp = await completeOnboardingAction()
        if (comp.error) {
          setError(comp.error)
          setSaving(false)
          return
        }
        router.push('/dashboard')
        return
      }

      setStep((s) => Math.min(s + 1, 5))
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  function toggleItem<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
  }

  function addTag(item: string, list: string[], setList: (l: string[]) => void, clearInput: () => void) {
    const val = item.trim()
    if (val && !list.includes(val)) {
      setList([...list, val])
      clearInput()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-sm text-zinc-500">Loading your profile...</p>
      </div>
    )
  }

  const progressPercent = (step / 5) * 100

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header and Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">Profile Onboarding</h1>
            <span className="text-xs font-medium text-zinc-500">
              Step {step} of 5
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {step === 1 && '1. Personal Information'}
              {step === 2 && '2. Academic Background'}
              {step === 3 && '3. Opportunity Preferences'}
              {step === 4 && '4. Skills & Interests'}
              {step === 5 && '5. Financial Profile'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Basic details for determining nationality and eligibility.'}
              {step === 2 && 'Your qualifications and normalized GPA approximate.'}
              {step === 3 && 'Types of funding, degree levels, and destination preferences.'}
              {step === 4 && 'Add tags to help match research and specialized criteria.'}
              {step === 5 && 'Indicate which costs you can cover (advisory only).'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            {/* STEP 1: PERSONAL */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="countryResidence">Country of Residence</Label>
                  <Input
                    id="countryResidence"
                    value={countryResidence}
                    onChange={(e) => setCountryResidence(e.target.value)}
                    placeholder="e.g. Kenya"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nationalities (select all that apply) *</Label>
                  <div className="flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 p-2 rounded-md">
                    {COMMON_COUNTRIES.map((c) => {
                      const selected = nationalities.includes(c)
                      return (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setNationalities(toggleItem(nationalities, c))}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            selected
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {c} {selected && '✓'}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Required for assessing eligibility criteria like nationality restrictions.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth (optional)</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">
                    Used strictly to check upper/lower age requirements on opportunities.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: ACADEMIC */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="highestCompleted">Highest Completed Level *</Label>
                    <select
                      id="highestCompleted"
                      value={highestCompleted}
                      onChange={(e) => setHighestCompleted(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <option value="highschool">High School</option>
                      <option value="diploma">Diploma / Associate</option>
                      <option value="bachelor">Bachelor&apos;s Degree</option>
                      <option value="master">Master&apos;s Degree</option>
                      <option value="phd">PhD / Doctorate</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentLevel">Current Study Level</Label>
                    <select
                      id="currentLevel"
                      value={currentLevel}
                      onChange={(e) => setCurrentLevel(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <option value="highschool">High School</option>
                      <option value="diploma">Diploma</option>
                      <option value="bachelor">Bachelor&apos;s Student</option>
                      <option value="master">Master&apos;s Student</option>
                      <option value="phd">PhD Candidate</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution">Institution / University</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. University of Nairobi"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="field">Primary Field of Study *</Label>
                    <Input
                      id="field"
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      placeholder="e.g. Computer Science"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization / Focus</Label>
                    <Input
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Machine Learning"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-3">
                  <Label className="text-sm font-semibold">Grades & GPA Approximation</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="gradeValue" className="text-xs">Your Grade / GPA</Label>
                      <Input
                        id="gradeValue"
                        type="number"
                        step="0.01"
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="e.g. 3.5 or 85"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="gradeScale" className="text-xs">Scale</Label>
                      <select
                        id="gradeScale"
                        value={gradeScale}
                        onChange={(e) => setGradeScale(e.target.value as '4' | '5' | '10' | '100')}
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      >
                        <option value="4">4.0 Scale</option>
                        <option value="5">5.0 Scale</option>
                        <option value="10">10.0 Scale</option>
                        <option value="100">100% Scale</option>
                      </select>
                    </div>
                  </div>
                  {normalizedPreview !== undefined && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs text-zinc-500">Normalized standard grade:</span>
                      <Badge variant="secondary">
                        approx. {normalizedPreview} / 4.0
                      </Badge>
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-400">
                    Linear approximation for filtering. Actual conversion rules vary by institution.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: PREFERENCES */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Funding Need *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'full', label: 'Full Funding', desc: 'Tuition + Living + Travel' },
                      { id: 'partial', label: 'Partial Funding', desc: 'Tuition + Stipend' },
                      { id: 'tuition_only', label: 'Tuition Only', desc: 'Fees covered' },
                      { id: 'self', label: 'Self-Funded', desc: 'Seeking programs only' },
                    ].map((f) => {
                      const sel = fundingNeed === f.id
                      return (
                        <div
                          key={f.id}
                          onClick={() => setFundingNeed(f.id)}
                          className={`cursor-pointer border rounded-md p-3 transition-colors ${
                            sel
                              ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                          }`}
                        >
                          <div className="font-medium text-sm">{f.label}</div>
                          <div className="text-xs text-zinc-500">{f.desc}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Preferred Study Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['bachelor', 'master', 'phd', 'diploma'].map((lvl) => {
                      const sel = studyLevels.includes(lvl)
                      return (
                        <button
                          type="button"
                          key={lvl}
                          onClick={() => setStudyLevels(toggleItem(studyLevels, lvl))}
                          className={`text-xs px-3 py-1.5 rounded-md border capitalize ${
                            sel
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {lvl} {sel && '✓'}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fields of Interest *</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto border border-zinc-200 dark:border-zinc-800 p-2 rounded-md">
                    {STUDY_FIELDS.map((fld) => {
                      const sel = preferredFields.includes(fld)
                      return (
                        <button
                          type="button"
                          key={fld}
                          onClick={() => setPreferredFields(toggleItem(preferredFields, fld))}
                          className={`text-xs px-2.5 py-1 rounded-full border ${
                            sel
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {fld}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Opportunity Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {OPPORTUNITY_TYPES.map((ot) => {
                      const sel = oppTypes.includes(ot)
                      return (
                        <button
                          type="button"
                          key={ot}
                          onClick={() => setOppTypes(toggleItem(oppTypes, ot))}
                          className={`text-xs px-3 py-1 rounded-md border ${
                            sel
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {ot}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: SKILLS & TAGS */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="skillAdd">Technical & Professional Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      id="skillAdd"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="e.g. Python, GIS, Statistical Analysis"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(skillInput, skills, setSkills, () => setSkillInput(''))
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(skillInput, skills, setSkills, () => setSkillInput(''))}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1">
                        {s}
                        <button
                          type="button"
                          onClick={() => setSkills(skills.filter((k) => k !== s))}
                          className="hover:text-red-500 font-bold ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resAdd">Research Interests</Label>
                  <div className="flex gap-2">
                    <Input
                      id="resAdd"
                      value={researchInput}
                      onChange={(e) => setResearchInput(e.target.value)}
                      placeholder="e.g. Renewable Energy, Deep Learning"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(researchInput, researchInterests, setResearchInterests, () => setResearchInput(''))
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(researchInput, researchInterests, setResearchInterests, () => setResearchInput(''))}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {researchInterests.map((r) => (
                      <Badge key={r} variant="secondary" className="gap-1">
                        {r}
                        <button
                          type="button"
                          onClick={() => setResearchInterests(researchInterests.filter((k) => k !== r))}
                          className="hover:text-red-500 font-bold ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certAdd">Certifications</Label>
                  <div className="flex gap-2">
                    <Input
                      id="certAdd"
                      value={certInput}
                      onChange={(e) => setCertInput(e.target.value)}
                      placeholder="e.g. AWS Certified, IELTS 8.0"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(certInput, certifications, setCertifications, () => setCertInput(''))
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(certInput, certifications, setCertifications, () => setCertInput(''))}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {certifications.map((c) => (
                      <Badge key={c} variant="secondary" className="gap-1">
                        {c}
                        <button
                          type="button"
                          onClick={() => setCertifications(certifications.filter((k) => k !== c))}
                          className="hover:text-red-500 font-bold ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extraAdd">Volunteer & Extracurriculars</Label>
                  <div className="flex gap-2">
                    <Input
                      id="extraAdd"
                      value={extraInput}
                      onChange={(e) => setExtraInput(e.target.value)}
                      placeholder="e.g. Youth Climate Council, Red Cross Volunteer"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(extraInput, extracurriculars, setExtracurriculars, () => setExtraInput(''))
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => addTag(extraInput, extracurriculars, setExtracurriculars, () => setExtraInput(''))}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {extracurriculars.map((x) => (
                      <Badge key={x} variant="secondary" className="gap-1">
                        {x}
                        <button
                          type="button"
                          onClick={() => setExtracurriculars(extracurriculars.filter((k) => k !== x))}
                          className="hover:text-red-500 font-bold ml-1"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: FINANCES */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <p className="text-sm font-semibold">Self-Cover Capability Toggles</p>
                  <p className="text-xs text-zinc-500">
                    These toggles only affect search filtering and opportunity recommendations.
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-sm font-medium">Can pay application / university fees</div>
                      <div className="text-xs text-zinc-400">Can self-fund application fees ($50-$150)</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={canPayFees}
                      onChange={(e) => setCanPayFees(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-sm font-medium">Can pay international travel</div>
                      <div className="text-xs text-zinc-400">Can cover flight tickets and visa fees</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={canPayTravel}
                      onChange={(e) => setCanPayTravel(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-sm font-medium">Can contribute to living costs</div>
                      <div className="text-xs text-zinc-400">Open to partial stipends or self-covered room/board</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={canPayLiving}
                      onChange={(e) => setCanPayLiving(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 p-6">
            <div>
              {step > 1 ? (
                <Button variant="outline" onClick={handleBack} disabled={saving}>
                  Back
                </Button>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                >
                  Finish later
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step > 1 && (
                <Link
                  href="/dashboard"
                  className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                >
                  Finish later
                </Link>
              )}
              <Button onClick={handleNext} disabled={saving}>
                {saving
                  ? 'Saving...'
                  : step === 5
                  ? 'Complete Onboarding'
                  : 'Next Step'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
