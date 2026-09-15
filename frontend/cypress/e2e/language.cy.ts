describe('Site language (ES / EN)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/');
  });

  it('defaults to English', () => {
    cy.get('h1').should('contain', 'The technologies tackling heat and drought');
    cy.get('[data-testid="lang-en"]').should('have.attr', 'aria-pressed', 'true');
    cy.document().its('documentElement.lang').should('eq', 'en');
  });

  it('switches to Spanish', () => {
    cy.get('[data-testid="lang-es"]').click();
    cy.get('h1').should('contain', 'Las tecnologías que combaten el calor y la sequía');
    cy.get('nav[aria-label="Main"]').should('contain', 'Innovación');
    cy.get('[data-testid="lang-es"]').should('have.attr', 'aria-pressed', 'true');
    cy.document().its('documentElement.lang').should('eq', 'es');
  });

  it('persists Spanish after reload', () => {
    cy.get('[data-testid="lang-es"]').click();
    cy.reload();
    cy.get('h1').should('contain', 'Las tecnologías que combaten el calor y la sequía');
    cy.get('[data-testid="lang-es"]').should('have.attr', 'aria-pressed', 'true');
  });
});
