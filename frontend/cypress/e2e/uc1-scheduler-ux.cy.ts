const SESSION_KEY = 'greenbyte-plant-ux-session-v1';

function blockLiveBff() {
  cy.intercept({ hostname: /execute-api/ }, (req) => {
    req.destroy();
    expect(req.url, 'scheduler spec must not call the live BFF').to.eq('');
  });
}

function visitSignedIn(path: string) {
  cy.viewport(1280, 800);
  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ username: 'greenbyte_user', signedInAt: '2026-10-02T12:00:00.000Z' }),
      );
      win.sessionStorage.removeItem('greenbyte-schedule-copilot-chat-open-v1');
    },
  });
}

describe('UC1 scheduler UX', () => {
  beforeEach(() => {
    blockLiveBff();
  });

  it('sends an unsigned UX visitor to the sign-in gate', () => {
    cy.viewport(1280, 800);
    cy.visit('/demo/plant/ux', {
      onBeforeLoad(win) {
        win.sessionStorage.removeItem(SESSION_KEY);
      },
    });
    cy.location('pathname').should('eq', '/demo/sign-in');
    cy.location('search').should('include', 'returnTo=');
    cy.contains('h1', 'Sign in to Pasco line scheduler').should('be.visible');
  });

  it('sends an unsigned plant visitor to the sign-in gate', () => {
    cy.viewport(1280, 800);
    cy.visit('/demo/plant', {
      onBeforeLoad(win) {
        win.sessionStorage.removeItem(SESSION_KEY);
      },
    });
    cy.location('pathname').should('eq', '/demo/sign-in');
    cy.contains('h1', 'Sign in to Pasco line scheduler').should('be.visible');
  });

  it('shows the calm queue, switches lines, and opens Scheduling', () => {
    visitSignedIn('/demo/plant/ux');
    cy.contains('Calm and stable', { timeout: 20000 }).should('be.visible');
    cy.contains('Running smoothly').should('be.visible');

    cy.get('button[aria-label="Conditioning line"]').filter(':visible').click();
    cy.get('[role="listbox"]:visible').contains('button', 'Line 2').click();
    cy.location('search').should('include', 'line=line-2');

    cy.get('button[aria-label="Conditioning line"]').filter(':visible').click();
    cy.get('[role="listbox"]:visible').contains('button', 'Line 1').click();
    cy.location('search').should('include', 'line=line-1');
    cy.contains('Calm and stable', { timeout: 20000 }).should('be.visible');

    cy.contains('nav[aria-label="Conditioning line"] button', 'Scheduling').click();
    cy.location('search').should('include', 'section=scheduling');
    cy.contains('h3', 'Program timeline').should('be.visible');
    cy.get('[data-copilot-chat="open"]').should('not.exist');
    cy.get('aside[data-copilot-open="true"]').should('contain', 'No schedule change is waiting.');

    cy.get('[data-queue-index="0"]')
      .first()
      .within(() => {
        cy.contains('Running').should('be.visible');
        cy.get('button[aria-label="Move up"]').should('not.exist');
      });

    cy.get('button[aria-label^="Notifications,"]').filter(':visible').click();
    cy.contains('No new notifications').should('be.visible');
    cy.get('[data-bell-root]')
      .filter(':visible')
      .invoke('text')
      .should('not.match', /Moved PO\s*[\u2014\u2013-]/)
      .and('not.match', /PO\s*[\u2014\u2013-]/);

    cy.get('button[aria-label="Ask about this batch\u2026"]').click();
    cy.get('[data-copilot-chat="open"]')
      .should('be.visible')
      .and('contain', 'Copilot')
      .and('contain', 'Ask about this order. The answer uses the current queue and does not change the plan.');
    cy.contains('button', 'Ask').should('be.visible');
  });

  it('shows the data-feed note on the Pasco conditioning hub', () => {
    visitSignedIn('/demo/plant');
    cy.contains('Events come from data \u2014 not from this screen', { timeout: 20000 }).should('be.visible');
    cy.contains('How it works \u2014 UI and API').should('be.visible');
    cy.contains('POST /demo/plant/ingest/sap-priority-change').should('be.visible');
    cy.get('aside nav[aria-label="Panel"]').should('not.exist');
    cy.contains('nav[aria-label="Conditioning line"] button', 'Scheduling').should('be.visible');
  });

  it('opens the guided tour', () => {
    visitSignedIn('/demo/plant/tour');
    cy.contains('h1', 'Pasco conditioning \u2014 guided demo').should('be.visible');
    cy.contains('1. The normal queue').should('be.visible');
  });
});
