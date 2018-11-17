import { AuthInfo, AuthProvider } from "../atlclients/authInfo";
import { Logger } from "../logger";
import { window, StatusBarItem, StatusBarAlignment, Disposable, ConfigurationChangeEvent } from "vscode";
import { Commands } from "../commands";
import { Container } from "../container";
import { configuration } from "../config/configuration";
import { AuthInfoEvent } from "../atlclients/authStore";

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

        this.initialize();
    }

    async onDidAuthChange(e:AuthInfoEvent) {
        this.updateAuthenticationStatusBar(e.provider,e.authInfo);
    }

    protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
        //const initializing = configuration.initializing(e);
        // TODO: check for status bar enabled and do stuff
    }

    async initialize() {
        const jiraInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
        const bbInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);

        this.updateAuthenticationStatusBar(AuthProvider.JiraCloud,jiraInfo);
        this.updateAuthenticationStatusBar(AuthProvider.BitbucketCloud,bbInfo);
    }

    dispose() {
        this._authenticationStatusBarItems.forEach(item => {
            item.dispose();
          });
        this._authenticationStatusBarItems.clear();

        this._disposable.dispose();
    }

    private async updateAuthenticationStatusBar(
        provider: string,
        info: AuthInfo | undefined
      ): Promise<void> {
        Logger.debug("updating auth status item", provider);
        const statusBarItem = this._authenticationStatusBarItems.get(provider);
        if (statusBarItem) {
          Logger.debug("status item", statusBarItem);
          await this.updateStatusBarItem(statusBarItem, provider, info);
        } else {
          Logger.debug("creating new auth status item", provider);
          const newStatusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left
          );
          this._authenticationStatusBarItems.set(provider, newStatusBarItem);
    
          await this.updateStatusBarItem(newStatusBarItem, provider, info);
          newStatusBarItem.show();
        }
      }
    
      private async updateStatusBarItem(
        statusBarItem: StatusBarItem,
        provider: string,
        info: AuthInfo | undefined
      ): Promise<void> {
        let text: string;
        let command: string | undefined;
    
        if (info) {
          const product =
            provider === AuthProvider.JiraCloud ? "Jira" : "Bitbucket";
          text = `$(person) ${product}: ${info.user.displayName}`;
          command = undefined;
        } else {
          switch (provider) {
            case AuthProvider.JiraCloud.toString(): {
              text = `$(sign-in) Sign in to Jira`;
              command = Commands.AuthenticateJira;
              break;
            }
            case AuthProvider.BitbucketCloud.toString(): {
              text = `$(sign-in) Sign in to Bitbucket`;
              command = Commands.AuthenticateBitbucket;
              break;
            }
            default: {
              text = `$(person) Unknown Atlascode auth provider ${provider}`;
              command = undefined;
            }
          }
        }
    
        statusBarItem.text = text;
        statusBarItem.command = command;
      }
}