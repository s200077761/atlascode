import { ProductJira, ProductBitbucket, Product, AuthInfo, isEmptySiteInfo, DetailedSiteInfo } from "../atlclients/authInfo";
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
    let site:DetailedSiteInfo | undefined = Container.siteManager.getFirstSite(product.key);
    let authInfo:AuthInfo|undefined = undefined;

    if(!isEmptySiteInfo(site)) {
      authInfo = await Container.credentialManager.getAuthInfo(site);
    } else {
      site = undefined;
    }
    await this.updateAuthenticationStatusBar(product, site, authInfo);
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
    siteInfo?:DetailedSiteInfo,
    authInfo?: AuthInfo,
    
  ): Promise<void> {
    const statusBarItem = this.ensureStatusItem(product);
    if ((product.name === 'Jira' && Container.config.jira.enabled && Container.config.jira.statusbar.enabled) ||
      (product.name === 'Bitbucket' && Container.config.bitbucket.enabled && Container.config.bitbucket.statusbar.enabled)) {
      const statusBarItem = this.ensureStatusItem(product);
      await this.updateStatusBarItem(statusBarItem, product, siteInfo, authInfo);
    } else {
      statusBarItem.hide();
    }
  }

  private async updateStatusBarItem(
    statusBarItem: StatusBarItem,
    product: Product,
    siteInfo?: DetailedSiteInfo,
    authInfo?: AuthInfo,
    
  ): Promise<void> {
    let text: string = "$(sign-in)";
    let command: string | undefined;
    let showIt: boolean = true;
    const tmpl = Resources.html.get('statusBarText');

    switch (product.key) {
      case ProductJira.key: {
        if (authInfo) {
          text = `$(person) ${product.name}: ${authInfo.user.displayName}`;
          let siteName = undefined;
          if (tmpl) {

            if(siteInfo) {
              siteName = siteInfo.name;
            }
            

            const data = { product: product.name, user: authInfo.user.displayName, site: siteName };
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
        if (authInfo) {
          text = `$(person) ${product.name}: ${authInfo.user.displayName}`;

          if (tmpl) {
            let data = { product: product.name, user: authInfo.user.displayName };
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
