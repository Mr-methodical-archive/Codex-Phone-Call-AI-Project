export type MockSpeaker = 'ivr' | 'human';

export interface MockStep {
  speaker: MockSpeaker;
  text: string;
  delayMs: number;
  expectDigits?: string;
}

export const telecomScenario: MockStep[] = [
  {
    speaker: 'ivr',
    text: 'Thank you for calling Northwind Telecom. For account questions press 1. For technical support press 2.',
    delayMs: 1000,
    expectDigits: '1'
  },
  {
    speaker: 'ivr',
    text: 'Great. For internet issues press 1. For mobile service press 2.',
    delayMs: 1200,
    expectDigits: '1'
  },
  {
    speaker: 'ivr',
    text: 'To speak with a specialist about outages press 0, otherwise stay on the line.',
    delayMs: 1200,
    expectDigits: '0'
  },
  {
    speaker: 'human',
    text: 'Hi, this is Jamie with Northwind Telecom support. How can I help you today?',
    delayMs: 1500
  },
  {
    speaker: 'human',
    text: 'I see the outage flag on your neighborhood node. I will re-sync your modem; please hold for a moment.',
    delayMs: 2500
  },
  {
    speaker: 'human',
    text: 'The modem shows online now. Can you confirm if your connection is back?',
    delayMs: 1800
  },
  {
    speaker: 'human',
    text: 'Happy to help! We will monitor the node for the next 24 hours. Have a great day.',
    delayMs: 1800
  }
];
