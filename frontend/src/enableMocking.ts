// MSW starts when VITE_USE_MSW=true (local dev default in .env.development, Cypress e2e).
export async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MSW !== 'true') {
    return;
  }

  try {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
        options: { scope: '/' },
      },
    });
  } catch (error) {
    console.error('[MSW] Failed to start:', error);
  }
}
