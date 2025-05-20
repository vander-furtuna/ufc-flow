import type { LucideIcon } from 'lucide-react'
import { Atom, ClipboardList, Cog, Cpu, Laptop, Sigma } from 'lucide-react'

export type AreaOfStudy =
  | 'Mathematics'
  | 'Computing'
  | 'Physics'
  | 'Hardware'
  | 'Engineering'
  | 'Project'

export interface Subject {
  id: string
  name: string
  semester: number
  area: AreaOfStudy
  credits: number
  description: string
  prerequisites: string[] // Array of subject IDs
  customUrl?: string
  customText?: string
}

export const areaDetails: Record<
  AreaOfStudy,
  { colorVariable: string; icon: LucideIcon; colorFgVariable: string }
> = {
  Mathematics: {
    colorVariable: '--area-mathematics-bg',
    colorFgVariable: '--area-mathematics-fg',
    icon: Sigma,
  },
  Computing: {
    colorVariable: '--area-computing-bg',
    colorFgVariable: '--area-computing-fg',
    icon: Laptop,
  },
  Physics: {
    colorVariable: '--area-physics-bg',
    colorFgVariable: '--area-physics-fg',
    icon: Atom,
  },
  Hardware: {
    colorVariable: '--area-hardware-bg',
    colorFgVariable: '--area-hardware-fg',
    icon: Cpu,
  },
  Engineering: {
    colorVariable: '--area-engineering-bg',
    colorFgVariable: '--area-engineering-fg',
    icon: Cog,
  },
  Project: {
    colorVariable: '--area-project-bg',
    colorFgVariable: '--area-project-fg',
    icon: ClipboardList,
  },
}

export const curriculum: Subject[] = [
  // Semester 1
  {
    id: 'MA101',
    name: 'Calculus I',
    semester: 1,
    area: 'Mathematics',
    credits: 4,
    description:
      'Introduction to differential calculus, limits, continuity, and derivatives.',
    prerequisites: [],
    customUrl: 'https://example.com/ma101',
    customText: "Textbook: Thomas' Calculus",
  },
  {
    id: 'CS101',
    name: 'Intro to Programming',
    semester: 1,
    area: 'Computing',
    credits: 3,
    description:
      'Fundamentals of programming using Python. Control structures, data types, functions.',
    prerequisites: [],
  },
  {
    id: 'PH101',
    name: 'Physics I',
    semester: 1,
    area: 'Physics',
    credits: 4,
    description: "Mechanics, Newton's laws, work, energy, and momentum.",
    prerequisites: [],
  },
  // Semester 2
  {
    id: 'MA102',
    name: 'Calculus II',
    semester: 2,
    area: 'Mathematics',
    credits: 4,
    description:
      'Integral calculus, techniques of integration, applications of integration.',
    prerequisites: ['MA101'],
  },
  {
    id: 'CS102',
    name: 'Data Structures',
    semester: 2,
    area: 'Computing',
    credits: 3,
    description:
      'Introduction to fundamental data structures: arrays, lists, stacks, queues, trees.',
    prerequisites: ['CS101'],
  },
  {
    id: 'PH102',
    name: 'Physics II',
    semester: 2,
    area: 'Physics',
    credits: 4,
    description: 'Electricity, magnetism, and optics.',
    prerequisites: ['PH101'],
  },
  // Semester 3
  {
    id: 'MA201',
    name: 'Linear Algebra',
    semester: 3,
    area: 'Mathematics',
    credits: 3,
    description:
      'Vectors, matrices, determinants, linear transformations, eigenvalues.',
    prerequisites: ['MA101'],
  },
  {
    id: 'CS201',
    name: 'Algorithms',
    semester: 3,
    area: 'Computing',
    credits: 3,
    description:
      'Algorithm design and analysis. Sorting, searching, graph algorithms.',
    prerequisites: ['CS102', 'MA102'], // MA102 for discrete math concepts often covered
  },
  {
    id: 'EE201',
    name: 'Digital Logic Design',
    semester: 3,
    area: 'Hardware',
    credits: 4,
    description:
      'Boolean algebra, logic gates, combinational and sequential circuits.',
    prerequisites: ['PH102'], // Basic understanding of electricity
  },
  // Semester 4
  {
    id: 'CS202',
    name: 'Operating Systems',
    semester: 4,
    area: 'Computing',
    credits: 3,
    description:
      'Principles of operating systems: processes, memory management, file systems.',
    prerequisites: ['CS201'],
  },
  {
    id: 'EE202',
    name: 'Microprocessors',
    semester: 4,
    area: 'Hardware',
    credits: 4,
    description: 'Microprocessor architecture, assembly language, interfacing.',
    prerequisites: ['EE201', 'CS102'],
  },
  {
    id: 'EN201',
    name: 'Thermodynamics',
    semester: 4,
    area: 'Engineering',
    credits: 3,
    description: 'Fundamental principles of thermodynamics.',
    prerequisites: ['PH101', 'MA102'],
  },
  // Semester 5
  {
    id: 'CS301',
    name: 'Computer Networks',
    semester: 5,
    area: 'Computing',
    credits: 3,
    description: 'Network protocols, TCP/IP, LANs, WANs.',
    prerequisites: ['CS202'],
    customUrl: 'https://example.com/cs301-resources',
  },
  {
    id: 'EE301',
    name: 'Embedded Systems',
    semester: 5,
    area: 'Hardware',
    credits: 4,
    description: 'Design and implementation of embedded systems.',
    prerequisites: ['EE202'],
  },
  // Semester 6
  {
    id: 'CS305',
    name: 'Software Engineering',
    semester: 6,
    area: 'Engineering',
    credits: 3,
    description: 'Software development lifecycle, methodologies, testing.',
    prerequisites: ['CS201'],
  },
  // Semester 7
  {
    id: 'PR401',
    name: 'Capstone Project I',
    semester: 7,
    area: 'Project',
    credits: 3,
    description:
      'First part of the senior capstone project. Proposal and initial design.',
    prerequisites: ['CS305', 'EE301'], // Example broad prerequisites
  },
  // Semester 8
  {
    id: 'PR402',
    name: 'Capstone Project II',
    semester: 8,
    area: 'Project',
    credits: 3,
    description:
      'Implementation and presentation of the senior capstone project.',
    prerequisites: ['PR401'],
  },
]
