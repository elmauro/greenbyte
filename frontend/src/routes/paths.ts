export const paths = {
  home: '/',
  dashboard: '/dashboard',
  demoSignIn: '/demo/sign-in',
  demoPlant: '/demo/plant',
  demoPlantUx: '/demo/plant/ux',
  demoPlantTour: '/demo/plant/tour',
  demoPlantFlow: '/demo/plant/flow',
  demoArchitecture: '/demo/architecture',
  demoHowItWorks: '/demo/how-it-works',
} as const;

/** Post-login landing when sign-in has no valid `returnTo` query. */
export const demoDefaultAfterSignIn = paths.demoPlantUx;

/** Signed-in demo workspace. Wider column than the public home page. */
export function isWideDemoPath(pathname: string): boolean {
  return pathname.startsWith('/demo/') && pathname !== paths.demoSignIn;
}
