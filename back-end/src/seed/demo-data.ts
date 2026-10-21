import type { LabelColor } from '../labels/label-colors';

// Demo account written by the seed CLI. Public on purpose: anyone trying the
// project logs in with it, and every seed run resets its data.
export const DEMO_USER = {
  name: 'Demo',
  email: 'demo@example.com',
  password: 'demo1234',
} as const;

export interface DemoChecklistItem {
  text: string;
  done?: boolean;
}

export interface DemoCard {
  // Unique across the demo data, so tests can find a card by title.
  title: string;
  description?: string;
  // Days after the seed day; negative is overdue.
  dueInDays?: number;
  done?: boolean;
  archived?: boolean;
  // Names of labels of the same board.
  labels?: string[];
  checklist?: DemoChecklistItem[];
}

export interface DemoList {
  title: string;
  cards: DemoCard[];
}

export interface DemoBoard {
  title: string;
  description?: string;
  archived?: boolean;
  labels: { name: string; color: LabelColor }[];
  lists: DemoList[];
}

export const DEMO_BOARDS: DemoBoard[] = [
  {
    title: 'Product launch',
    description: 'Everything left before the public release.',
    labels: [
      { name: 'Bug', color: 'red' },
      { name: 'Feature', color: 'green' },
      { name: 'Design', color: 'purple' },
      { name: 'Urgent', color: 'orange' },
    ],
    lists: [
      {
        title: 'To do',
        cards: [
          {
            title: 'Write release notes',
            description: 'Summarize every feature shipped since the beta.',
            dueInDays: 3,
            labels: ['Feature'],
          },
          {
            title: 'Fix login on Safari',
            description: 'The session is lost after a page reload.',
            dueInDays: -1,
            labels: ['Bug', 'Urgent'],
          },
          {
            title: 'Pick the landing page hero image',
            labels: ['Design'],
          },
          {
            title: 'Translate the onboarding emails',
            archived: true,
          },
        ],
      },
      {
        title: 'Doing',
        cards: [
          {
            title: 'Polish the board screen',
            description: 'Spacing, empty states and keyboard focus.',
            dueInDays: 0,
            labels: ['Design', 'Feature'],
            checklist: [
              { text: 'Empty state for a board with no lists', done: true },
              { text: 'Visible focus ring on cards', done: true },
              { text: 'Consistent spacing between lists' },
            ],
          },
          {
            title: 'Set up error monitoring',
            checklist: [
              { text: 'Create the project', done: true },
              { text: 'Add the source maps upload' },
            ],
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Register and login',
            done: true,
            labels: ['Feature'],
          },
          {
            title: 'Archive boards',
            done: true,
            labels: ['Feature'],
          },
        ],
      },
    ],
  },
  {
    title: 'Personal',
    labels: [
      { name: 'Home', color: 'blue' },
      { name: 'Health', color: 'lime' },
    ],
    lists: [
      {
        title: 'This week',
        cards: [
          {
            title: 'Book a dentist appointment',
            labels: ['Health'],
          },
          {
            title: 'Buy groceries',
            labels: ['Home'],
            checklist: [
              { text: 'Coffee' },
              { text: 'Bread', done: true },
              { text: 'Fruit' },
            ],
          },
        ],
      },
      {
        title: 'Someday',
        cards: [{ title: 'Learn to play the guitar' }],
      },
    ],
  },
  {
    title: 'Old side project',
    description: 'Archived to show how an archived board looks.',
    archived: true,
    labels: [],
    lists: [
      {
        title: 'Ideas',
        cards: [{ title: 'Rewrite it in a weekend' }],
      },
    ],
  },
];
