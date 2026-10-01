import { detailedTopicNotesFor } from './topic-notes'

export interface ContentTopic {
  id: string
  name: string
  description: string
  component: string | null
  subject_id: string
}

export interface ContentGuidance {
  commonMistakes: string[]
  examUse: string[]
  coreNotes: string[]
}

const subjectGuidance: Record<string, { mistakes: string[]; examUse: string[] }> = {
  'subject-mathematics': {
    mistakes: [
      'Choosing a familiar-looking method before identifying exactly what the question gives and asks for.',
      'Rounding during the working instead of keeping exact values until the final answer.',
      'Giving an answer without enough working, units, accuracy or a check that it is reasonable.',
    ],
    examUse: [
      'Write the rule or formula before substituting values so method marks remain visible.',
      'For a multi-step problem, label intermediate values and keep them at full calculator accuracy.',
      'Finish by checking sign, size, units and whether the answer fits the original context.',
    ],
  },
  'subject-english-language': {
    mistakes: [
      'Retelling what happens instead of analysing how the writer creates meaning.',
      'Naming a technique without exploring the connotations of the exact word or structural choice.',
      'Using long quotations or drifting away from the lines and focus named in the question.',
    ],
    examUse: [
      'Start with a direct answer to the question, then embed a short, precise quotation.',
      'Zoom in on one or two details and explain more than one reasonable effect where possible.',
      'Match the response to the paper, question number, marks and source lines before writing.',
    ],
  },
  'subject-english-literature': {
    mistakes: [
      'Retelling the plot instead of building an interpretation that answers the question.',
      'Adding context as a separate fact rather than using it to deepen the interpretation.',
      'Memorising long quotations that are difficult to adapt to different themes and characters.',
    ],
    examUse: [
      'Build a clear argument and use short quotations that can support more than one interpretation.',
      'Connect language, form or structure to the writer\'s ideas and the shape of the whole text.',
      'For extract questions, move from the printed passage to relevant moments elsewhere in the text.',
    ],
  },
  'subject-combined-science': {
    mistakes: [
      'Using a related scientific word without explaining the mechanism that links cause and outcome.',
      'Substituting into an equation before converting units or identifying the required quantity.',
      'Describing a practical without naming variables, measurements, controls or a specific improvement.',
    ],
    examUse: [
      'For explanations, write a complete cause → scientific mechanism → outcome chain.',
      'For calculations, state the equation, convert units, substitute, calculate and give the unit.',
      'For practical questions, connect each method decision to validity, accuracy, precision or safety.',
    ],
  },
  'subject-history': {
    mistakes: [
      'Using a general statement when the mark scheme needs precise people, dates, events or policies.',
      'Narrating events in order without explaining causation, consequence, change or significance.',
      'Judging a source only by whether it is biased instead of using content, provenance and context.',
    ],
    examUse: [
      'Identify the Edexcel command word and build each paragraph around the relationship it requires.',
      'Support every main point with precise knowledge from the correct option and period.',
      'For a judgement, compare factors using a stated criterion rather than simply choosing one.',
    ],
  },
  'subject-geography': {
    mistakes: [
      'Giving a generic example when the question requires the learner\'s named case study or fieldwork.',
      'Listing causes and effects without developing the geographical process that connects them.',
      'Ignoring figures, units, scale or evidence supplied in a map, graph, photograph or resource.',
    ],
    examUse: [
      'Use a because → therefore chain to make the geographical process explicit.',
      'Attach place-specific evidence only where it proves the point being made.',
      'For evaluate or assess questions, compare impacts, stakeholders, timescales and uncertainty.',
    ],
  },
  'subject-business': {
    mistakes: [
      'Writing a correct definition without applying it to the business in the question.',
      'Stopping after the first effect instead of developing a chain to revenue, cost, profit or objectives.',
      'Giving an absolute judgement without considering the firm\'s size, market, finance and priorities.',
    ],
    examUse: [
      'Use details from the case in every developed paragraph, not only in the opening sentence.',
      'Develop the chain with because, which means and therefore until it reaches a business objective.',
      'Make the final judgement conditional: explain what it depends on and why that condition matters most.',
    ],
  },
  'subject-design-technology': {
    mistakes: [
      'Naming a material property or process without linking it to a user need and product requirement.',
      'Using vague evaluation such as strong, sustainable or works well without measurable evidence.',
      'Treating the NEA as a polished final idea instead of showing evidence-led iteration and testing.',
    ],
    examUse: [
      'Link each choice through property or process → product function → user or specification need.',
      'Use measurable criteria, tolerances and realistic testing when evaluating a design decision.',
      'Include trade-offs: performance, manufacture, cost, safety, sustainability and end of life.',
    ],
  },
}

const topicMistakes: Array<{ subject: string; match: RegExp; text: string }> = [
  { subject: 'subject-mathematics', match: /accuracy|bound/i, text: 'For bounds, using the rounded value rather than the correct half-unit interval.' },
  { subject: 'subject-mathematics', match: /percentage/i, text: 'Adding or subtracting a percentage when a multiplier or reverse-percentage division is required.' },
  { subject: 'subject-mathematics', match: /probability/i, text: 'Adding probabilities for successive independent events instead of multiplying along a branch.' },
  { subject: 'subject-mathematics', match: /trig|similarity/i, text: 'Selecting a formula before labelling the sides, angle or scale-factor direction.' },
  { subject: 'subject-combined-science', match: /electricity|energy/i, text: 'Mixing up power and energy, or using minutes instead of seconds in a calculation.' },
  { subject: 'subject-combined-science', match: /quantitative|particles|magnification|cell/i, text: 'Using values with inconsistent units before calculating.' },
  { subject: 'subject-combined-science', match: /rates|bioenergetics/i, text: 'Saying a factor increases the rate without explaining particles, collisions or the limiting factor.' },
  { subject: 'subject-english-language', match: /language|structure|evaluation/i, text: 'Using a memorised paragraph that does not address the exact source, lines or statement.' },
  { subject: 'subject-english-literature', match: /poem|macbeth|carol|inspector|unseen/i, text: 'Forcing a memorised quotation or context point into an argument where it does not answer the question.' },
  { subject: 'subject-history', match: /source|interpretation|western-front|germany/i, text: 'Evaluating evidence without connecting the source or interpretation to secure contextual knowledge.' },
  { subject: 'subject-geography', match: /fieldwork|skills|issue-evaluation/i, text: 'Describing a method or resource without evaluating its reliability, limitation or effect on the conclusion.' },
  { subject: 'subject-business', match: /finance|break-even|profit/i, text: 'Completing the calculation but not interpreting what the result means for the business.' },
  { subject: 'subject-design-technology', match: /materials|process|making|production/i, text: 'Choosing a material or process from habit without comparing it against the specification and production scale.' },
]

function sentences(value: string): string[] {
  return value
    .split(/;|\.(?:\s|$)/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2)
    .map((item) => item.endsWith('.') ? item : `${item}.`)
}

export function contentGuidanceFor(topic: ContentTopic): ContentGuidance {
  const guidance = subjectGuidance[topic.subject_id] ?? {
    mistakes: ['Writing generally instead of using exact knowledge from this topic.'],
    examUse: ['Answer the command word directly and support each point with accurate evidence.'],
  }
  const specificMistake = topicMistakes.find((item) => item.subject === topic.subject_id && item.match.test(`${topic.id} ${topic.name}`))?.text
  const detailedNotes = detailedTopicNotesFor(topic.id)
  const coreNotes = (detailedNotes.length ? detailedNotes : sentences(topic.description)).slice(0, 8)
  return {
    coreNotes,
    commonMistakes: [...new Set([...(specificMistake ? [specificMistake] : []), ...guidance.mistakes])].slice(0, 4),
    examUse: guidance.examUse,
  }
}
