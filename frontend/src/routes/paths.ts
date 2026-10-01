export const paths = {
  home: '/',
  dashboard: '/dashboard',
  demoSignIn: '/demo/sign-in',
  demoPlant: '/demo/plant',
  demoPlantUx: '/demo/plant/ux',
  demoPlantTour: '/demo/plant/tour',
  demoPlantFlow: '/demo/plant/flow',
  demoArchitecture: '/demo/architecture',
} as const;

/** Post-login landing when sign-in has no valid `returnTo` query. */
export const demoDefaultAfterSignIn = paths.demoPlantUx;
