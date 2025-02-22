import { Epinio } from '~/cypress/support/epinio';
import { TopLevelMenu } from '~/cypress/support/toplevelmenu';
import '~/cypress/support/functions';

Cypress.config();
describe('Menu testing', () => {
  const topLevelMenu = new TopLevelMenu();
  const epinio = new Epinio();

  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  it('Check Epinio menu', { tags: ['@menu-1', '@smoke'] }, () => {
    if (Cypress.env('ui') == "rancher") {
      topLevelMenu.openIfClosed();

      // Epinio's icon should appear in the side menu
      epinio.epinioIcon().should('exist');

      // Click on the Epinio's logo as well as your Epinio instance
      epinio.accessEpinioMenu(Cypress.env('cluster'));
    }

    // Check Epinio's side menu
    epinio.checkEpinioNav();
  });

  it('Verify Welcome Screen without Namespaces', { tags: '@menu-2' }, () => {
    cy.deleteAll('Namespaces');
    cy.clickEpinioMenu('Dashboard');
    cy.checkDashboardResources({ namespaceNumber: '0' });
    cy.get('.head-title > h1').contains('Welcome to Epinio', { timeout: 4000 }).should('be.visible');
    cy.createNamespace('workspace');
  });

  it('Check "About" page and main links', { tags: '@menu-3' }, () => {
    // Check link on main page to about page, then goes there and check more links
    cy.checkLink('v', '/epinio/c/default/about', 'about', false);
    cy.checkLink('Epinio', 'https://github.com/epinio/epinio');

    // Check version between main and about page
    cy.aboutPageFunction({ compareVersionVsMainPage: true });

    // TEMPORARY DISABLING REFRESH AND CHECK BACK DUE TO NS_ERROR_UNEXPECTED
    // IT LEAVES CYPRESS IN A HANGING STATE BREAKING OTHER TESTS

    // // Returns to about page, refresh and checks 'Back' turns into 'Home'
    // cy.checkLink('v', '/epinio/c/default/about', 'about', false)
    // // Adding wait because reloads may break severely rest of tests
    // // if executed before previous comand is completed
    // cy.wait(10000)
    
    // cy.log('Reloading Page')
    // cy.reload({ timeout: 20000} );
    // // Adding 'then' to execute only after previous command is completed
    // cy.then(() => {
    // cy.checkElementVisibility('.back-link', 'Home')
    // })
  });


  it('Check binaries, version related links and downloads from About menu', { tags: '@menu-4' }, () => {
    // Go to About page
    cy.get('.version.text-muted > a').click();
    // Check binaries number, download them and chek See All Package page
    // Turning to "false" options "downloadBinaries" and "checkSeeAllPackagePage" until version 1.11-rc is gone
    // TO DO: turn back to "true" when final no rc is present
    cy.aboutPageFunction({ checkBinariesNumberInAboutPage: true, downloadBinaries: false, checkSeeAllPackagePage: false })
  });


  it('Test buttons and links in dashboard page', { tags: ['@menu-5', '@smoke'] }, () => {
    // Click create / deploy buttons and check landing redirection and return
    cy.clickButton('Create Namespace');
    cy.checkElementVisibility('.btn.role-secondary.mr-10', 'Cancel');
    cy.go('back');
    cy.checkElementVisibility('body', 'Deploy Application');
    cy.clickButton('Deploy Application');
    cy.checkElementVisibility('[data-testid="epinio_app-source_type"]', 'Folder');
    cy.go('back');
    cy.checkElementVisibility('body', 'Create Instance');
    cy.clickButton('Create Instance');
    cy.checkElementVisibility('body', 'Catalog Service');
    cy.go('back');

    // Check namespaces, applications and services links
    cy.checkLink('namespaces', '/epinio/c/default/namespaces', 'workspace');
    cy.checkLink('applications', '/epinio/c/default/applications', 'Last Deployed By');
    cy.checkLink('services', '/epinio/c/default/services', 'Catalog Service');
    // Check rest of Dashboard links
    cy.checkLink('Get started', 'https://epinio.io/');
    cy.checkLink('Issues', 'https://github.com/epinio/epinio/issues');
    cy.checkLink('mysql-dev', '/services/create?service=mysql-dev', 'A MySQL service');
    cy.checkLink('redis-dev', '/services/create?service=redis-dev', 'A Redis service');
  });

  it('Verify stats in Dashboard page', { tags: ['@menu-6', '@smoke'] }, () => {
    cy.createApp({ appName: 'testapp', archiveName: 'sample-app.tar.gz', sourceType: 'Archive' });
    cy.createService({ serviceName: 'mycustom-service-1', catalogType: 'postgresql-dev' });
    cy.createNamespace('ns-1');
    cy.checkDashboardResources({ namespaceNumber: '2', newestNamespaces: ['ns-1', 'workspace'], appNumber: '1', runningApps: '1', servicesNumber: '1' });
    cy.deleteNamespace({ namespace: 'ns-1' });
    cy.deleteAll('Applications');
    cy.deleteAll('Services');
  });
});

// Note: this test needs to be adapted for Rancher Dashboard
// Currently we are good if the custom user is unable to login when chart installed over Rancher
// We'd need to apply values.yaml with the users first in Edit YAML
// For this reason we only test it in STD UI for the moment
if (Cypress.env('ui') == null) {
  describe('Login with special usernames / passwords', { tags: ['@menu-7', '@smoke'] }, () => {
    const userType = new Map([
      ['user1', ['Hell@World', 'special']],
      ['user2', ['Hell#@~%/=World', 'several special']],
      ['user@test', ['Hell@World', 'standard']],
      ['0123456789', ['password', 'standard']],
    ]);
  
    for (const [key, value] of userType.entries()) {
  
        it(`Username '${key}' & password with '${value[1]}' characters should log in`, () => {
          cy.login(key, value[0])
          cy.contains('Invalid username or password. Please try again.').should('not.exist')
          cy.contains('Applications').should('be.visible')
        })
    };
  });
}

describe('Login with wrong username / password is not allowed and correctly handled', { tags: ['@menu-8', '@smoke'] }, () => {
  const userType = new Map([
    ['admin', ['wrongpassword', 'standard']],
    ['baduser', ['password', 'standard']],
  ]);

  for (const [key, value] of userType.entries()) {

    // Login fails and it is correctly handled
    it(`Username '${key}' & password with '${value[1]}' characters should not log in`, () => {
      cy.login(key, value[0])
      cy.contains('Invalid username or password. Please try again.').should('exist')
      }
    )
  }
});

describe('Dex testing', () => {
  it('Check Dex login works with granted access', { tags: '@dex-1' }, () => {
    cy.dexLogin('admin@epinio.io', 'password');
  });

  it('Check Dex login works with non-admin granted access', { tags: '@dex-2' }, () => {
    cy.dexLogin('epinio@epinio.io', 'password');
  });

  it('Check users not allowed cannot connect to Dex', { tags: '@dex-3' }, () => {
    cy.dexLogin('invalid-mail@epinio.io', 'password', { checkLandingPage: false });
    cy.contains('Invalid Email Address and password').should('be.visible');
  });
}
);

