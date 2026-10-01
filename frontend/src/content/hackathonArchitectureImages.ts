/** Static architecture diagram assets (user-provided PNGs in public/demo/architecture/) */

export const hackathonArchitectureImages = {
  container: {
    src: '/demo/architecture/container.png',
    alt: 'GreenByte container diagram — React, BFF, Data API, Agent API, PostgreSQL',
  },
  teamStack: {
    src: '/demo/architecture/team-stack.png',
    alt: 'Team stack — Mauricio BFF, Camilo Data API, David Agent API',
  },
  uc1Flow: {
    src: '/demo/architecture/uc1-flow.png',
    alt: 'UC1 plant capacity data flow',
  },
  sequenceUc1: {
    src: '/demo/architecture/uc1-sequence.png',
    alt: 'UC1 sequence — queue, rush event, explain',
  },
} as const;

export type HackathonArchitectureImageKey = keyof typeof hackathonArchitectureImages;
