function visitSignedIn(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem(
        'greenbyte-plant-ux-session-v1',
        JSON.stringify({ username: 'greenbyte_user', signedInAt: '2026-10-02T12:00:00.000Z' }),
      );
    },
  });
}

describe('How it works', () => {
  it('opens Architecture and shows the API request and response', () => {
    visitSignedIn('/demo/how-it-works');
    cy.get('nav[aria-label="Main"]').should('contain', 'How it works').and('not.contain', 'UC1 UI');
    cy.get('nav[aria-label="How it works"]').within(() => {
      cy.contains('button', 'Architecture').should('have.attr', 'aria-current', 'page');
      cy.contains('button', 'UI and API').click();
    });
    cy.location('search').should('include', 'section=api');
    cy.contains('h1', 'UI and API').should('be.visible');
    cy.contains('h3', 'Request').should('be.visible');
    cy.contains('h3', 'Response').should('be.visible');
    cy.contains('GET /demo/plant/lines/line-1/queue?locale=en').should('be.visible');
    cy.contains('No request body').should('be.visible');
  });

  it('keeps a flow step when the old map URL redirects', () => {
    visitSignedIn('/demo/plant/flow?step=03');
    cy.location('pathname').should('eq', '/demo/how-it-works');
    cy.location('search').should('include', 'section=api').and('include', 'step=03');
    cy.contains('POST /demo/plant/ingest/sap-priority-change').should('be.visible');
    cy.contains('1002307551').should('be.visible');
  });

  it('opens Architecture from the old architecture URL', () => {
    visitSignedIn('/demo/architecture');
    cy.location('pathname').should('eq', '/demo/how-it-works');
    cy.location('search').should('eq', '');
    cy.contains('button', 'Architecture').should('have.attr', 'aria-current', 'page');
    cy.contains('Syngenta briefs').should('be.visible');
  });
});
