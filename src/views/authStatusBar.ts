import { AuthInfo, AuthProvider } from "../atlclients/authInfo";
import { Logger } from "../logger";
import { window, StatusBarItem, StatusBarAlignment, Disposable, ConfigurationChangeEvent } from "vscode";
import { Commands } from "../commands";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";
import { Resources } from "../resources";

export class AuthStatusBar extends Disposable {
    private _authenticationStatusBarItems: Map<string, StatusBarItem> = new Map<
      string,
      StatusBarItem
    >();

    private _disposable:Disposable;
    
    constructor() {
        super(() => this.dispose());
        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this)
            ,configuration.onDidChange(this.onConfigurationChanged, this)
            );

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    async onDidAuthChange(e:AuthInfoEvent) {
        this.updateAuthenticationStatusBar(e.provider,e.authInfo);
    }

    protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if(initializing || configuration.changed(e,'jira.statusbar')) {
          const jiraItem = this.ensureStatusItem(AuthProvider.JiraCloud);
          const jiraInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
          this.updateAuthenticationStatusBar(AuthProvider.JiraCloud,jiraInfo);

          if(configuration.changed(e, 'jira.statusbar.enabled')) {
            if(!Container.config.jira.statusbar.enabled) {
              jiraItem.hide();
            }
          }
        }

        if(initializing || configuration.changed(e,'bitbucket.statusbar')) {
          const bitbucketItem = this.ensureStatusItem(AuthProvider.BitbucketCloud);
          const bitbucketInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);
          this.updateAuthenticationStatusBar(AuthProvider.BitbucketCloud,bitbucketInfo);

          if(configuration.changed(e, 'bitbucket.statusbar.enabled')) {
            if(!Container.config.bitbucket.statusbar.enabled) {
              bitbucketItem.hide();
            }
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

    private ensureStatusItem(provider:string):StatusBarItem {
      let statusBarItem = this._authenticationStatusBarItems.get(provider);
      if(!statusBarItem) {
        statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._authenticationStatusBarItems.set(provider, statusBarItem);
      }
      return statusBarItem;
    }

    private async updateAuthenticationStatusBar(
        provider: string,
        info: AuthInfo | undefined
      ): Promise<void> {
        Logger.debug("updating auth status item", provider);
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
        let product:string = provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";
        let showIt:boolean = true;
        const tmpl = Resources.html.get('statusBarText');

        switch (provider) {
          case AuthProvider.JiraCloud.toString(): {
            if(info) {
              text = `$(person) ${product}: ${info.user.displayName}`;

              if(tmpl) {
                let site = Container.config.jira.workingSite.name;
                if(site === '') {
                  site = Container.jiraSiteManager.sitesAvailable[0].name;
                }

                let project = Container.config.jira.workingProject.name;
                if(project === '') {
                  project = Container.jiraSiteManager.projectsAvailable[0].name;
                }

                let data = {product:product, user:info.user.displayName, site:site, project:project};
                let ctx = {...Container.config.jira.statusbar, ...data};
                Logger.debug('jira status context',ctx);
                text = tmpl(ctx);
              }
              
            } else {
              if(Container.config.jira.statusbar.showLogin) {
                text = `$(sign-in) Sign in to Jira`;
                command = Commands.AuthenticateJira;
                product = "Jira";
              } else {
                statusBarItem.hide();
                showIt = false;
              }
            }
            
            break;
          }
          case AuthProvider.BitbucketCloud.toString(): {
            if(info) {
              text = `$(person) ${product}: ${info.user.displayName}`;

              if(tmpl) {
                let data = {product:product, user:info.user.displayName};
                let ctx = {...Container.config.bitbucket.statusbar, ...data};
                text = tmpl(ctx);
              }
            } else {
              if(Container.config.bitbucket.statusbar.showLogin) {
                text = `$(sign-in) Sign in to Bitbucket`;
                command = Commands.AuthenticateBitbucket;
                product = "Bitbucket";
              } else {
                statusBarItem.hide();
                showIt = false;
              }
            }
            
            break;
          }
          default: {
            text = `$(person) Unknown Atlascode auth provider ${provider}`;
            command = undefined;
          }
        }
        
        Logger.debug(`${product} status tect is`, text);
        statusBarItem.text = text;
        statusBarItem.command = command;
        statusBarItem.tooltip = `${product}`;

        if(showIt) {
          statusBarItem.show();
        }
      }
}