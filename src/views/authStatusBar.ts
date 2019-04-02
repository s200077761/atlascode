import { AuthInfo, AuthProvider, productForProvider, ProductJira, ProductBitbucket, ProductJiraStaging } from "../atlclients/authInfo";
import { window, StatusBarItem, StatusBarAlignment, Disposable, ConfigurationChangeEvent } from "vscode";
import { Commands } from "../commands";
import { Container } from "../container";
import { configuration, isStagingSite } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";
import { Resources } from "../resources";

export class AuthStatusBar extends Disposable {
  private _authenticationStatusBarItems: Map<string, StatusBarItem> = new Map<
    string,
    StatusBarItem
  >();

  private _disposable: Disposable;

  constructor() {
    super(() => this.dispose());
    this._disposable = Disposable.from(
      Container.authManager.onDidAuthChange(this.onDidAuthChange, this)
      , configuration.onDidChange(this.onConfigurationChanged, this)
    );

    void this.onConfigurationChanged(configuration.initializingChangeEvent);
  }

  async onDidAuthChange(e: AuthInfoEvent) {
    this.updateAuthenticationStatusBar(e.provider, e.authInfo);
  }

  protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
    const initializing = configuration.initializing(e);
    if (initializing || configuration.changed(e, 'jira.statusbar') || configuration.changed(e, 'jira.workingSite') || configuration.changed(e, 'jira.workingProject')) {
      const jiraItem = this.ensureStatusItem(AuthProvider.JiraCloud);
      const jiraInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
      this.updateAuthenticationStatusBar(AuthProvider.JiraCloud, jiraInfo);

      if (!Container.config.jira.statusbar.enabled) {
        jiraItem.hide();
      }

      const isJiraStagingAuthenticated = await Container.authManager.isAuthenticated(AuthProvider.JiraCloudStaging, false);
      const sitesAvailable = await Container.jiraSiteManager.getSitesAvailable();
      const stagingEnabled = (sitesAvailable.find(site => site.name === 'hello') !== undefined || isJiraStagingAuthenticated);

      if (stagingEnabled) {
        const jiraStagingItem = this.ensureStatusItem(AuthProvider.JiraCloudStaging);
        const jiraStagingInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloudStaging);
        this.updateAuthenticationStatusBar(AuthProvider.JiraCloudStaging, jiraStagingInfo);

        if (!Container.config.jira.statusbar.enabled) {
          jiraStagingItem.hide();
        }
      }


    }

    if (initializing || configuration.changed(e, 'bitbucket.statusbar')) {
      const bitbucketItem = this.ensureStatusItem(AuthProvider.BitbucketCloud);
      const bitbucketInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);
      this.updateAuthenticationStatusBar(AuthProvider.BitbucketCloud, bitbucketInfo);

      if (!Container.config.bitbucket.statusbar.enabled) {
        bitbucketItem.hide();
      }
    }
  }
  dispose() {
    this._authenticationStatusBarItems.forEach(item => {
      item.dispose();
    });
    this._authenticationStatusBarItems.clear();

    this._disposable.dispose();
  }

  private ensureStatusItem(provider: string): StatusBarItem {
    let statusBarItem = this._authenticationStatusBarItems.get(provider);
    if (!statusBarItem) {
      statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
      this._authenticationStatusBarItems.set(provider, statusBarItem);
    }
    return statusBarItem;
  }

  private async updateAuthenticationStatusBar(
    provider: string,
    info: AuthInfo | undefined
  ): Promise<void> {
    const statusBarItem = this.ensureStatusItem(provider);
    await this.updateStatusBarItem(statusBarItem, provider, info);
  }

  private async updateStatusBarItem(
    statusBarItem: StatusBarItem,
    provider: string,
    info: AuthInfo | undefined
  ): Promise<void> {
    let text: string = "$(sign-in)";
    let command: string | undefined;
    let product: string = productForProvider(provider);
    let showIt: boolean = true;
    const tmpl = Resources.html.get('statusBarText');

    switch (provider) {
      case AuthProvider.JiraCloud.toString(): {
        if (info) {
          text = `$(person) ${product}: ${info.user.displayName}`;

          if (tmpl) {
            const site = Container.jiraSiteManager.effectiveSite.name;
            const project = Container.jiraSiteManager.workingProjectOrEmpty.name;

            let data = { product: product, user: info.user.displayName, site: site, project: project };
            let ctx = { ...Container.config.jira.statusbar, ...data };
            command = Commands.ShowConfigPage;
            text = tmpl(ctx);
          }

        } else {
          if (Container.config.jira.statusbar.showLogin) {
            text = `$(sign-in) Sign in to  ${product}`;
            command = Commands.AuthenticateJira;
            product = ProductJira;
          } else {
            statusBarItem.hide();
            showIt = false;
          }
        }

        break;
      }
      case AuthProvider.JiraCloudStaging.toString(): {
        if (info) {
          text = `$(person) ${product}: ${info.user.displayName}`;

          if (tmpl) {
            const effSite = Container.jiraSiteManager.effectiveSite;
            let site = '';
            let project = '';

            if (isStagingSite(effSite)) {
              site = Container.jiraSiteManager.effectiveSite.name;
              project = Container.jiraSiteManager.workingProjectOrEmpty.name;
            }


            let data = { product: product, user: info.user.displayName, site: site, project: project };
            let ctx = { ...Container.config.jira.statusbar, ...data };
            command = Commands.ShowConfigPage;
            text = tmpl(ctx);
          }

        } else {
          if (Container.config.jira.statusbar.showLogin) {
            text = `$(sign-in) Sign in to ${product}`;
            command = Commands.AuthenticateJiraStaging;
            product = ProductJiraStaging;
          } else {
            statusBarItem.hide();
            showIt = false;
          }
        }

        break;
      }
      case AuthProvider.BitbucketCloud.toString(): {
        if (info) {
          text = `$(person) ${product}: ${info.user.displayName}`;

          if (tmpl) {
            let data = { product: product, user: info.user.displayName };
            let ctx = { ...Container.config.bitbucket.statusbar, ...data };
            command = Commands.ShowConfigPage;
            text = tmpl(ctx);
          }
        } else {
          if (Container.config.bitbucket.statusbar.showLogin) {
            text = `$(sign-in) Sign in to ${product}`;
            command = Commands.AuthenticateBitbucket;
            product = ProductBitbucket;
          } else {
            statusBarItem.hide();
            showIt = false;
          }
        }

        break;
      }
      default: {
        text = `$(person) Unknown Atlassian auth provider ${provider}`;
        command = undefined;
      }
    }

    statusBarItem.text = text;
    statusBarItem.command = command;
    statusBarItem.tooltip = `${product}`;

    if (showIt) {
      statusBarItem.show();
    }
  }
}
