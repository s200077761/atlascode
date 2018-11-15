import {
  window,
  ConfigurationChangeEvent,
  ExtensionContext,
  Disposable,
  StatusBarItem,
  StatusBarAlignment
} from "vscode";
import * as BitbucketKit from "bitbucket";
import * as JiraKit from "@atlassian/jira";
import * as authinfo from "./authInfo";
import { Container } from "../container";
import { OAuthDancer } from "./oauthDancer";
import { CacheMap, Interval } from "../util/cachemap";
import { Logger } from "../logger";
var tunnel = require("tunnel");
import * as fs from "fs";
import { configuration, WorkingSite } from "../config/configuration";
import { Resources } from "../resources";
import { JiraWorkingSiteConfigurationKey } from "../constants";
import { Commands } from "../commands";

const SIGNIN_COMMAND = "Sign in";

interface EmptyClient {
  isEmpty: boolean;
}

function isEmptyClient(a: any): a is EmptyClient {
  return a && (<EmptyClient>a).isEmpty !== undefined;
}

const emptyClient: EmptyClient = { isEmpty: true };

// TODO: VSCODE-29 if user bails in oauth or an error happens, we need to return undefined
export class ClientManager implements Disposable {
  private _clients: CacheMap = new CacheMap();
  private _dancer: OAuthDancer = new OAuthDancer();
  private _authenticationStatusBarItems: Map<string, StatusBarItem> = new Map<
    string,
    StatusBarItem
  >();
  private _agent: any | undefined;
  private _optionsDirty: boolean = false;
  private _showingInfoBox: boolean = false;

  constructor(context: ExtensionContext) {
    context.subscriptions.push(
      configuration.onDidChange(this.onConfigurationChanged, this)
    );
    this.onConfigurationChanged(configuration.initializingChangeEvent);
  }

  dispose() {
    this._clients.clear();
    this._authenticationStatusBarItems.forEach(item => {
      item.dispose();
    });
    this._authenticationStatusBarItems.clear();
  }

  public async bbrequest(): Promise<BitbucketKit | undefined> {
    return this.getClient<BitbucketKit>(
      authinfo.AuthProvider.BitbucketCloud,
      info => {
        let extraOptions = {};
        if (this._agent) {
          extraOptions = { agent: this._agent };
        }

        let bbclient = new BitbucketKit({ options: extraOptions });
        bbclient.authenticate({ type: "token", token: info.access });

        return bbclient;
      }
    );
  }

  public async jirarequest(): Promise<JiraKit | undefined> {
    return this.getClient<JiraKit>(authinfo.AuthProvider.JiraCloud, info => {
      let cloudId: string = "";

      const workingSite = configuration.get<WorkingSite>(
        JiraWorkingSiteConfigurationKey,
        null
      );
      if (info.accessibleResources) {
        if (workingSite) {
          const foundSite = info.accessibleResources.find(
            site => site.id === workingSite.id
          );
          if (foundSite) {
            cloudId = foundSite.id;
          }
        } else {
          cloudId = info.accessibleResources[0].id;
        }
      }

      let extraOptions = {};
      if (this._agent) {
        extraOptions = { agent: this._agent };
      }

      let jraclient = new JiraKit({
        baseUrl: `https://api.atlassian.com/ex/jira/${cloudId}/rest/`,
        options: extraOptions
      });
      jraclient.authenticate({ type: "token", token: info.access });

      return jraclient;
    });
  }

  public async removeClient(provider: string) {
    this._clients.deleteItem(provider);
  }

  private async getClient<T>(
    provider: string,
    factory: (info: authinfo.AuthInfo) => any
  ): Promise<T | undefined> {
    type TorEmpty = T | EmptyClient;

    let clientOrEmpty = await this._clients.getItem<TorEmpty>(provider);

    if (isEmptyClient(clientOrEmpty)) {
      await this.updateAuthenticationStatusBar(provider, undefined);
      return undefined;
    }

    let client: T | undefined = clientOrEmpty;

    if (!client) {
      let info = await Container.authManager.getAuthInfo(provider);

      if (!info) {
        info = await this.askUserToDance(provider);

        if (info) {
          await Container.authManager.saveAuthInfo(provider, info);
          await this.updateAuthenticationStatusBar(provider, info);
        } else {
          await this.updateAuthenticationStatusBar(provider, undefined);
          return undefined;
        }
      } else {
        await this._dancer
          .refresh(info)
          .then(async newInfo => {
            info = newInfo;
            await Container.authManager.saveAuthInfo(provider, info);
            await this.updateAuthenticationStatusBar(provider, info);
          })
          .catch(async () => {
            await Container.authManager.removeAuthInfo(provider);
            info = await this.askUserToDance(provider);

            if (info) {
              await Container.authManager.saveAuthInfo(provider, info);
              await this.updateAuthenticationStatusBar(provider, info);
              return info;
            } else {
              await this.updateAuthenticationStatusBar(provider, undefined);
              return undefined;
            }
          });
      }

      client = factory(info);

      await this._clients.setItem(provider, client, 45 * Interval.MINUTE);
    }

    if (this._optionsDirty) {
      let info = await Container.authManager.getAuthInfo(provider);

      if (info) {
        client = factory(info);
        await this._clients.updateItem(provider, client);
        await this.updateAuthenticationStatusBar(provider, info);
      }

      this._optionsDirty = false;
    }
    return client;
  }

  private async askUserToDance(
    provider: string
  ): Promise<authinfo.AuthInfo | undefined> {
    const product =
      provider === authinfo.AuthProvider.JiraCloud ? "Jira" : "Bitbucket";

    if (!this._showingInfoBox) {
      this._showingInfoBox = true;
    } else {
      return await this.getInLine(provider);
    }

    const result = await window.showInformationMessage(
      `In order to use some Atlascode functionality, you need to sign in to ${product}`,
      SIGNIN_COMMAND
    );

    Logger.debug("showInforMessage returned", result);
    if (result === SIGNIN_COMMAND) {
      let info = await this._dancer.doDance(provider).catch(reason => {
        window.showErrorMessage(`Error logging into ${product}`, reason);
        this._showingInfoBox = false;
        return undefined;
      });
      this._showingInfoBox = false;
      window.showInformationMessage(
        `You are now authenticated with ${product}`
      );
      return info;
    } else {
      // user cancelled sign in, remember that and don't ask again until it expires
      await this._clients.setItem(provider, emptyClient, 45 * Interval.MINUTE);
      this._showingInfoBox = false;
      return undefined;
    }
  }

  private async getInLine(
    provider: string
  ): Promise<authinfo.AuthInfo | undefined> {
    while (this._showingInfoBox) {
      await this.delay(1000);
    }

    return await Container.authManager.getAuthInfo(provider);
  }

  private async updateAuthenticationStatusBar(
    provider: string,
    info: authinfo.AuthInfo | undefined
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
    info: authinfo.AuthInfo | undefined
  ): Promise<void> {
    let text: string;
    let command: string | undefined;

    if (info) {
      const product =
        provider === authinfo.AuthProvider.JiraCloud ? "Jira" : "Bitbucket";
      text = `$(person) ${product}: ${info.user.displayName}`;
      command = undefined;
    } else {
      switch (provider) {
        case authinfo.AuthProvider.JiraCloud.toString(): {
          text = `$(person) Sign in to Jira`;
          command = Commands.AuthenticateJira;
          break;
        }
        case authinfo.AuthProvider.BitbucketCloud.toString(): {
          text = `$(person) Sign in to Bitbucket`;
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

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private onConfigurationChanged(e: ConfigurationChangeEvent) {
    const section = "enableCharles";
    this._optionsDirty = true;
    Logger.debug(
      "client manager got config change, charles? " +
        configuration.get<boolean>(section)
    );
    if (configuration.isDebugging && configuration.get<boolean>(section)) {
      this._agent = tunnel.httpsOverHttp({
        ca: [fs.readFileSync(Resources.charlesCert)],
        proxy: {
          host: "127.0.0.1",
          port: 8888
        }
      });
    } else {
      this._agent = undefined;
    }
  }
}
