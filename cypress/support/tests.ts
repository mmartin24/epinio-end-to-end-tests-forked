import cypress from 'cypress';
import { Epinio } from '~/cypress/support/epinio';
import './functions';

// First connexion test
Cypress.Commands.add('runFirstConnectionTest', () => {
  const epinio = new Epinio();

  cy.visit('/auth/login');
  cy.get("span").then($text => {
    if ($text.text().includes('your first time visiting Rancher')) {
      epinio.firstLogin();
    }
    else {
      cy.log('Rancher already initialized, no need to handle first login.');
    };
  });
});

// Applications tests
Cypress.Commands.add('runApplicationsTest', (testName: string) => {
  const appName = 'testapp';
  const archive = 'sample-app.tar.gz';
  const customRoute = 'custom-route-' + appName + '.' + Cypress.env('system_domain');
  const paketobuild = 'paketobuildpacks/builder:tiny';
  const applicationChart = ' standard (Epinio standard deployment)';
  const gitUrl = 'https://github.com/epinio/example-go';
  const gitUrlWordpress = 'https://github.com/epinio/example-wordpress';
  const configuration = 'configuration01';
  const manifest = 'manifest.yaml';
  const customService = 'mycustom-service';
  const customCatalog = 'mysql-dev';

  // Create an application on default namespace and check it
  switch (testName) {
    case 'multipleInstanceAndContainer':
      cy.createApp({appName: appName, archiveName: 'httpd:latest', instanceNum: 5, sourceType: 'Container Image'});
      cy.checkApp({appName: appName, dontCheckRouteAccess: true});
      cy.checkDashboardResources({ namespaceNumber: '1', appNumber: '1', runningApps: '1' });
      break;
    case 'customRoute':
      cy.createApp({appName: appName, archiveName: archive, route: customRoute, sourceType: 'Archive'});
      cy.checkApp({appName: appName, route: customRoute});
      cy.showAppLog({appName: appName});
      cy.showAppShell({appName: appName});
      break;
    case 'envVarsAndGitUrl':
      cy.createApp({appName: appName, archiveName: gitUrl, customPaketoImage: paketobuild, addVar: 'ui', sourceType: 'Git URL'});
      cy.checkApp({appName: appName, checkVar: 1});
      break;
    case 'restartAndRebuild':
      cy.createApp({appName: appName, archiveName: archive, sourceType: 'Archive'});
      cy.checkApp({appName: appName});
      cy.restartApp({appName: appName});
      cy.checkApp({appName: appName});
      cy.rebuildApp({appName: appName});
      cy.checkApp({appName: appName});
      break;
    case 'allTests':
      cy.createApp({appName: appName, archiveName: gitUrl, customPaketoImage: paketobuild, customApplicationChart:applicationChart, instanceNum: 5, addVar: 'ui', route: customRoute, sourceType: 'Git URL'});
      cy.checkApp({appName: appName, checkVar: 1, route: customRoute});
      break;
    case 'downloadManifestAndPushApp':
      cy.createConfiguration({configurationName: configuration});      
      cy.createApp({appName: appName, archiveName: archive, sourceType: 'Archive', route: customRoute,  instanceNum: 2, addVar: 'ui', configurationName: configuration });   
      cy.checkApp({appName: appName , checkConfiguration: true, route:customRoute, instanceNum: 2}); 
      // Downloading manifest      
      cy.downloadManifestChartsAndImages({ appName: appName, exportType: 'Manifest' })
      // Delete app prior uploading from manifest
      cy.deleteApp({ appName: appName });
      // Create app from manifest solely and check results
      cy.createApp({archiveName: archive, sourceType: 'Archive', manifestName: manifest }); 
      cy.checkApp({appName: appName , checkConfiguration: true, route: customRoute, checkVar: 1, instanceNum: 2});
      break;
    case 'serviceMysqlBindWordpressPushApp':
      cy.deleteAll('Services')
      cy.createService({ serviceName: customService, catalogType: customCatalog })
      cy.createApp( {appName: appName, archiveName: gitUrlWordpress, sourceType: 'Git URL', addVar: 'wordpress_env_file', serviceName: customService, catalogType: customCatalog });
      cy.checkApp({ appName: appName, dontCheckRouteAccess: true, serviceName: customService, checkCreatedApp: 'wordpress'});  
      cy.bindServiceFromSevicesPage({ appName: appName, serviceName: customService, bindingOption: 'unbind'});
      cy.deleteService({ serviceName: customService}); 
      break;
    case 'serviceBindUnbindFromServicePage':
      cy.deleteAll('Services')
      cy.createService({ serviceName: 'mycustom-service-2', catalogType: 'postgresql-dev' })
      cy.checkDashboardResources({ servicesNumber: '1' });
      cy.createApp({ appName: appName, archiveName: 'httpd:latest', instanceNum: 1, sourceType: 'Container Image' });
      cy.bindServiceFromSevicesPage({ appName: appName, serviceName: 'mycustom-service-2', bindingOption: 'bind'});
      cy.bindServiceFromSevicesPage({ appName: appName, serviceName: 'mycustom-service-2', bindingOption: 'unbind'});
      cy.deleteService({ serviceName: 'mycustom-service-2' }); 
      break;
    case 'gitHubAndEnvVar':
      cy.createApp({appName: 'githubapp', addVar: 'go_example', sourceType: 'GitHub', gitUsername: 'epinio', gitRepo: 'example-go', gitBranch: 'main', gitCommit: 'e84b2a7'});
      cy.checkApp({appName: appName, checkVar: 1});
      break;
    case 'pushGitlabAndUpdateSources':
      cy.createApp({appName: appName, sourceType: 'GitLab', gitUsername: 'richard-cox', gitRepo: 'epinio-sample-app', gitBranch: 'main', gitCommit: '07d2dd79'});
      cy.checkApp({appName: appName, checkCommit: '07d2dd7'});
      cy.redeployFromCommit({gitCommit: 'bb688311'});
      cy.checkApp({appName: appName, checkCommit: 'bb68831', checkIcon: 'gitlab'});
      cy.updateAppSource({name: appName, archiveName: archive, sourceType: 'Archive'});
      cy.checkApp({appName: appName, checkIcon: 'file'});
      break;
    case 'downloadChartsAndImages':
      cy.createApp({appName: appName, archiveName: gitUrl, customPaketoImage: paketobuild, addVar: 'go_example', sourceType: 'Git URL'});
      cy.checkApp({appName: appName, checkVar: 1, checkIcon: 'file'});
      cy.downloadManifestChartsAndImages({ appName: appName, exportType: 'Chart and Images' });
      cy.findExtractCheck({appName: appName, exportType: 'Chart and Images'});
      break;
    case 'serviceBindSingleStep':
      cy.deleteAll('Services')
      cy.createApp({ appName: appName, archiveName: archive, sourceType: 'Archive' });
  
      // Creates 3 services and bind app in 1 step
      cy.createServiceAndBindOneStep({ appName: appName, serviceName: `svc-redis-dev`, catalogType: 'redis-dev' });
      cy.createServiceAndBindOneStep({ appName: appName, serviceName: `svc-mysql-dev`, catalogType: 'mysql-dev' });
      cy.createServiceAndBindOneStep({ appName: appName, serviceName: 'svc-postgresql', catalogType: 'postgresql-dev' });

      // Verifies number of deployed services and check status and app bound name
      cy.countAndVerifyElements({ locator: 'tbody > tr.main-row', numberRowsOrColumns: 3, text1: 'Deployed', text2: 'testapp' });

      // Deletes 1 service to see if after it can be binded again
      // Goes to service page as after deletion user is not taken there
      cy.deleteService({ serviceName: 'svc-postgresql' });
      cy.get('.accordion.package.depth-0.has-children', { timeout: 20000 }).contains('Services').click();

      // Repeats binding in 1 step and check again
      cy.createServiceAndBindOneStep({ appName: appName, serviceName: `svc-rabbitmq-dev`, catalogType: 'rabbitmq-dev' });
      cy.createServiceAndBindOneStep({ appName: appName, serviceName: `svc-mongodb`, catalogType: 'mongodb-dev' });
      cy.countAndVerifyElements({ locator: 'tbody > tr.main-row', numberRowsOrColumns: 4, text1: 'Deployed', text2: 'testapp' });
      cy.deleteAll('Services')
      break;
  }

  // Delete the tested application
  cy.deleteApp({appName: appName});
});

// Configurations tests
Cypress.Commands.add('runConfigurationsTest', (testName: string) => {
  const appName = 'testapp';
  const archive = 'sample-app.tar.gz'
  const configuration = 'configuration01';

  switch (testName) {
    case 'newAppWithConfiguration':
      // Create a new configuration
      cy.createConfiguration({configurationName: configuration});

      // Create an application with the newly created configuration and check it
      cy.createApp({appName: appName, archiveName: archive, configurationName: configuration, sourceType: 'Archive'});
      cy.checkApp({appName: appName, checkConfiguration: true});

      // Unbind the created configuration
      cy.unbindConfiguration({appName: appName, configurationName: configuration});
      cy.checkApp({appName: appName});

      // Delete the tested application
      cy.deleteApp({appName: appName});
      
      // Delete the created configuration
      break;
    case 'bindConfigurationOnApp':
      // Create another new configuration
      cy.createConfiguration({configurationName: configuration, fromFile: true});

      // Create an application *WITHOUT* any configuration
      cy.createApp({appName: appName, archiveName: archive, addVar: 'file', sourceType: 'Archive'});
      cy.checkApp({appName: appName});

      // Bind the created configuration to the application and check it
      cy.bindConfiguration({appName: appName, configurationName: configuration});
      cy.checkApp({appName: appName, checkConfiguration: true, checkVar: 1});

      // Edit the created configuration
      cy.editConfiguration({configurationName: configuration});

      // Delete the tested application and the configuration
      cy.deleteApp({appName: appName});
      break;
    case 'createConfigfromFile':
      // Create another new configuration uploading a file
      cy.createConfiguration({configurationName: configuration, fromFileUpload: true});
      break;
    
  }
  cy.deleteConfiguration({configurationName: configuration});
});

// Namespaces tests
Cypress.Commands.add('runNamespacesTest', (testName: string) => {
  const appName = 'testapp';
  const archive = 'sample-app.tar.gz';
  const defaultNamespace = 'workspace';
  const namespace = 'mynamespace';
  const nsFromConfiguration = 'ns-from-configuration'
  const nsFromInstance = 'ns-from-instance'
  const nsFromApplication = 'ns-from-application'

  switch (testName) {
    case 'newNamespace':
      // Create a new namespace
      cy.createNamespace(namespace);

      // Create an application on the new namespace and check it
      cy.createApp({appName: appName, archiveName: archive, sourceType: 'Archive'});
      cy.checkApp({appName: appName, namespace: namespace});

      // Delete the namespace
      cy.deleteNamespace({namespace: namespace, appName: appName});
      break;

    case 'namespaceFilter':
      // Preparation
      cy.createNamespace('ns-1');
      cy.createNamespace('ns-2');
      cy.createConfiguration({configurationName: "config-1", namespace: "ns-1"});
      cy.createConfiguration({configurationName: "config-2", namespace: "ns-2"});    
      cy.createApp({appName: "testapp-1", namespace: "ns-1", archiveName: 'httpd:latest', instanceNum: 1, sourceType: 'Container Image'});
      cy.createApp({appName: "testapp-2", namespace: "ns-2", archiveName: 'httpd:latest', instanceNum: 1, sourceType: 'Container Image'});
      cy.checkDashboardResources({namespaceNumber: '3', newestNamespaces: ['ns-2', 'ns-1'], appNumber: '2', runningApps: '2' });

      // Go to Appplications and filter 2 namespaces in namespace filter
      cy.openNamespacesFilter({location: "Applications"})
      cy.filterNamespacesAndCheck({namespace: "ns-1", elemInNamespaceName: "testapp-1", filterOut: false})
      cy.filterNamespacesAndCheck({namespace: "ns-2", elemInNamespaceName: "testapp-2", filterOut: false})
 
      // Check 2 ns filters are acually selected
      cy.checkOutcomeFilteredNamespaces({expectedNumFilteredNamespaces: 2, expectedNumElemInNamespaces: 2})

      // Deselect ns-2 and check it is filtered out and not displayed
      cy.filterNamespacesAndCheck({namespace: "ns-2", elemInNamespaceName: "testapp-2", filterOut: true})
      cy.checkOutcomeFilteredNamespaces({expectedNumFilteredNamespaces: 1, expectedNumElemInNamespaces: 1, expectedNameElementInNamespaces: "testapp-1"})

      // With previous selection, go to config and check filter is still applied
      cy.clickEpinioMenu("Configurations")
      cy.checkOutcomeFilteredNamespaces({expectedNumFilteredNamespaces: 1, expectedNumElemInNamespaces: 1, expectedNameElementInNamespaces: "config-1"})
    
      // Deselect ns-1 and check 3 namespaces and 2 apps appear
      cy.filterNamespacesAndCheck({namespace: "ns-1", filterOut: true})
      cy.checkOutcomeFilteredNamespaces({expectedNumFilteredNamespaces: 0, expectedNumElemInNamespaces: 2, expectedNameElementInNamespaces: "config-1"})
      cy.checkOutcomeFilteredNamespaces({expectedNumFilteredNamespaces: 0, expectedNumElemInNamespaces: 2, expectedNameElementInNamespaces: "config-2"})
      break;
      
    case 'newNamespaceFromResource':
      // Create Namespace from configuration   
      cy.clickEpinioMenu('Configurations');
      cy.clickButton('Create');
      cy.createNamespaceFromResource(nsFromConfiguration);

      // Create Namespace from instances
      cy.get('div.header > i').eq(0).click();
      cy.contains('Instances').click(); 
      cy.clickButton('Create');
      cy.createNamespaceFromResource(nsFromInstance);

      // Create Namespace from application
      cy.clickEpinioMenu('Applications');
      cy.clickButton('Create');
      cy.createNamespaceFromResource(nsFromApplication);
      break;
  }
});
