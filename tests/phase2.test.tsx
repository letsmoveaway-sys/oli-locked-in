import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SubjectPreview } from '../src/components/SubjectPreview'
import type { CourseSubject } from '../src/types'
import { validateCourseConfiguration } from '../worker/services/curriculum'

const history: CourseSubject = {
  id: 'subject-history',
  name: 'History',
  examBoard: 'Edexcel',
  specificationCode: '1HI0',
  active: true,
  tier: 'not_applicable',
  currentGrade: null,
  targetGrade: '7',
  options: { configuration: 'confirmed' },
  configurationComplete: true,
  components: [
    { id: 'p1', name: 'Paper 1: Medicine in Britain and the Western Front', code: '1HI0/11', calculatorAllowed: false, durationMinutes: 80, maximumMarks: 52, weightingPercent: 30 },
    { id: 'p2', name: 'Paper 2: The American West and Early Elizabethan England', code: '1HI0/2M', calculatorAllowed: false, durationMinutes: 110, maximumMarks: 64, weightingPercent: 40 },
    { id: 'p3', name: 'Paper 3: Weimar and Nazi Germany', code: '1HI0/31', calculatorAllowed: false, durationMinutes: 90, maximumMarks: 52, weightingPercent: 30 },
  ],
  topics: [{
    id: 'medicine',
    name: 'Medicine in Britain',
    description: 'Medicine across time.',
    tier: 'both',
    estimatedEffort: 12,
    weightingPercent: null,
    sourceReference: null,
    applicability: 'common',
    children: [{
      id: 'medieval',
      name: 'Medieval medicine',
      description: 'Medieval ideas and care.',
      tier: 'both',
      estimatedEffort: 2,
      weightingPercent: null,
      sourceReference: null,
      applicability: 'common',
      children: [],
    }],
  }],
}

describe('Phase 2 course setup', () => {
  it('validates a supported course configuration', () => {
    expect(validateCourseConfiguration({
      subjectId: 'subject-history',
      active: true,
      tier: 'not_applicable',
      currentGrade: '6',
      targetGrade: '8',
      options: { configuration: 'confirmed' },
    })).toMatchObject({ tier: 'not_applicable', targetGrade: '8' })
  })

  it('rejects malformed configuration input', () => {
    expect(validateCourseConfiguration({ subjectId: '../maths', active: 'yes', tier: 'upper' })).toBeNull()
  })

  it('renders the confirmed Edexcel History papers and topics', () => {
    render(<SubjectPreview subject={history} />)
    expect(screen.getByText('Paper 1: Medicine in Britain and the Western Front')).toBeInTheDocument()
    expect(screen.getByText('Paper 2: The American West and Early Elizabethan England')).toBeInTheDocument()
    expect(screen.getByText('Paper 3: Weimar and Nazi Germany')).toBeInTheDocument()
    expect(screen.getByText('Medieval medicine')).toBeInTheDocument()
  })

  it('shows unconfirmed courses without an invented paper map', () => {
    render(<SubjectPreview subject={{ ...history, examBoard: 'TBC', specificationCode: null, configurationComplete: false, components: [], topics: [] }} />)
    expect(screen.getByText('Exam board TBC')).toBeInTheDocument()
    expect(screen.getByText(/course map will be added/)).toBeInTheDocument()
  })
})
