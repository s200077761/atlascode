import { AuthInfoV1, OAuthProvider, productForProvider, ProductJira, ProductBitbucket, ProductJiraStaging } from "../atlclients/authInfo";
import { window, StatusBarItem, StatusBarAlignment, Disposable, ConfigurationChangeEvent } from "vscode";
import { Commands } from "../commands";
import { Container } from "../container";
import { configuration, isStagingSite } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";
import { Resources } from "../resources";
import { JiraWorkingSiteConfigurationKey, JiraWorkingProjectConfigurationKey } from "../constants";

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
    if (initializing || configuration.changed(e, 'jira.statusbar') || configuration.changed(e, JiraWorkingSiteConfigurationKey) || configuration.changed(e, JiraWorkingProjectConfigurationKey)) {
      const jiraItem = this.ensureStatusItem(OAuthProvider.JiraCloud);
      const jiraInfo = await Container.authManager.getAuthInfo(OAuthProvider.JiraCloud);
      this.updateAuthenticationStatusBar(OAuthProvider.JiraCloud, jiraInfo);

      if (!Container.config.jira.statusbar.enabled) {
        jiraItem.hide();
      }

      const isJiraStagingAuthenticated = await Container.authManager.isProductAuthenticatedticated(OAuthProvider.JiraCloudStaging, false);
      const sitesAvailable = await Container.jiraSiteManager.getSitesAvailable();
      const stagingEnabled = (sitesAvailable.find(site => site.name === 'hello') !== undefined || isJiraStagingAuthenticated);

      if (stagingEnabled) {
        const jiraStagingItem = this.ensureStatusItem(OAuthProvider.JiraCloudStaging);
        const jiraStagingInfo = await Container.authManager.getAuthInfo(OAuthProvider.JiraCloudStaging);
        this.updateAuthenticationStatusBar(OAuthProvider.JiraCloudStaging, jiraStagingInfo);

        if (!Container.config.jira.statusbar.enabled) {
          jiraStagingItem.hide();
        }
      }


    }

    if (initializing || configuration.changed(e, 'bitbucket.statusbar')) {
      const bitbucketItem = this.ensureStatusItem(OAuthProvider.BitbucketCloud);
      const bitbucketInfo = await Container.authManager.getAuthInfo(OAuthProvider.BitbucketCloud);
      this.updateAuthenticationStatusBar(OAuthProvider.BitbucketCloud, bitbucketInfo);

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
    info: AuthInfoV1 | undefined
  ): Promise<void> {
    const statusBarItem = this.ensureStatusItem(provider);
    await this.updateStatusBarItem(statusBarItem, provider, info);
  }

  private async updateStatusBarItem(
    statusBarItem: StatusBarItem,
    provider: string,
    info: AuthInfoV1 | undefined
  ): Promise<void> {
    let text: string = "$(sign-in)";
    let command: string | undefined;
    let product: string = productForProvider(provider);
    let showIt: boolean = true;
    const tmpl = Resources.html.get('statusBarText');

    switch (provider) {
      case OAuthProvider.JiraCloud.toString(): {
        if (info) {
          text = `$(person) ${product}: ${info.user.displayName}`;

          if (tmpl) {
            const effSite = Container.jiraSiteManager.effectiveSite;
            let site = '';
            let project = '';

            if (!isStagingSite(effSite)) {
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
      case OAuthProvider.JiraCloudStaging.toString(): {
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
      case OAuthProvider.BitbucketCloud.toString(): {
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
