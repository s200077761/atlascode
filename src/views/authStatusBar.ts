import { ProductJira, ProductBitbucket, Product, AuthInfo } from "../atlclients/authInfo";
import { window, StatusBarItem, StatusBarAlignment, Disposable, ConfigurationChangeEvent } from "vscode";
import { Commands } from "../commands";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { Resources } from "../resources";
import { JiraV1WorkingProjectConfigurationKey, JiraDefaultSiteConfigurationKey, BitbucketEnabledKey, JiraEnabledKey } from "../constants";
import { SitesAvailableUpdateEvent } from "src/siteManager";

export class AuthStatusBar extends Disposable {
  private _authenticationStatusBarItems: Map<string, StatusBarItem> = new Map<
    string,
    StatusBarItem
  >();

  private _disposable: Disposable;

  constructor() {
    super(() => this.dispose());
    this._disposable = Disposable.from(
      Container.siteManager.onDidSitesAvailableChange(this.onDidSitesChange, this),
      configuration.onDidChange(this.onConfigurationChanged, this)
    );

    void this.onConfigurationChanged(configuration.initializingChangeEvent);
  }

  onDidSitesChange(e: SitesAvailableUpdateEvent) {
    this.updateAuthenticationStatusBar(e.product);
  }

  async generateStatusbarItem(product: Product): Promise<void> {
    const itemInfo = await Container.credentialManager.getAuthInfo(Container.siteManager.effectiveSite(product));
    await this.updateAuthenticationStatusBar(product, itemInfo);
  }

  protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
    const initializing = configuration.initializing(e);
    if (initializing ||
      configuration.changed(e, 'jira.statusbar') ||
      configuration.changed(e, JiraDefaultSiteConfigurationKey) ||
      configuration.changed(e, JiraV1WorkingProjectConfigurationKey) ||
      configuration.changed(e, JiraEnabledKey)) {
      await this.generateStatusbarItem(ProductJira);
    }

    if (initializing ||
      configuration.changed(e, 'bitbucket.statusbar') ||
      configuration.changed(e, BitbucketEnabledKey)) {
      await this.generateStatusbarItem(ProductBitbucket);
    }
  }
  dispose() {
    this._authenticationStatusBarItems.forEach(item => {
      item.dispose();
    });
    this._authenticationStatusBarItems.clear();

    this._disposable.dispose();
  }

  private ensureStatusItem(product: Product): StatusBarItem {
    let statusBarItem = this._authenticationStatusBarItems.get(product.key);
    if (!statusBarItem) {
      statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
      this._authenticationStatusBarItems.set(product.key, statusBarItem);
    }
    return statusBarItem;
  }

  private async updateAuthenticationStatusBar(
    product: Product,
    info?: AuthInfo
  ): Promise<void> {
    const statusBarItem = this.ensureStatusItem(product);
    if ((product.name === 'Jira' && Container.config.jira.enabled && Container.config.jira.statusbar.enabled) ||
      (product.name === 'Bitbucket' && Container.config.bitbucket.enabled && Container.config.bitbucket.statusbar.enabled)) {
      const statusBarItem = this.ensureStatusItem(product);
      await this.updateStatusBarItem(statusBarItem, product, info);
    } else {
      statusBarItem.hide();
    }
  }

  private async updateStatusBarItem(
    statusBarItem: StatusBarItem,
    product: Product,
    info: AuthInfo | undefined
  ): Promise<void> {
    let text: string = "$(sign-in)";
    let command: string | undefined;
    let showIt: boolean = true;
    const tmpl = Resources.html.get('statusBarText');

    switch (product.key) {
      case ProductJira.key: {
        if (info) {
          text = `$(person) ${product.name}: ${info.user.displayName}`;

          if (tmpl) {
            const effSite = Container.siteManager.effectiveSite(product);
            const effProject = await Container.jiraProjectManager.getEffectiveProject(effSite);
            const site = effSite.name;
            const project = effProject.name;

            const data = { product: product.name, user: info.user.displayName, site: site, project: project };
            const ctx = { ...Container.config.jira.statusbar, ...data };
            command = Commands.ShowConfigPage;
            text = tmpl(ctx);
          }

        } else {
          if (Container.config.jira.statusbar.showLogin) {
            text = `$(sign-in) Sign in to  ${product.name}`;
            command = Commands.ShowConfigPage;
            product = ProductJira;
          } else {
            statusBarItem.hide();
            showIt = false;
          }
        }

        break;
      }

      case ProductBitbucket.key: {
        if (info) {
          text = `$(person) ${product.name}: ${info.user.displayName}`;

          if (tmpl) {
            let data = { product: product.name, user: info.user.displayName };
            let ctx = { ...Container.config.bitbucket.statusbar, ...data };
            command = Commands.ShowConfigPage;
            text = tmpl(ctx);
          }
        } else {
          if (Container.config.bitbucket.statusbar.showLogin) {
            text = `$(sign-in) Sign in to ${product.name}`;
            command = Commands.ShowConfigPage;
            product = ProductBitbucket;
          } else {
            statusBarItem.hide();
            showIt = false;
          }
        }

        break;
      }
      default: {
        text = `$(person) Unknown Atlassian product ${product.name}`;
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
