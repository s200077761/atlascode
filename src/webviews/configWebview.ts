import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent } from 'vscode';
import { Commands } from '../commands';
import { isAuthAction, isSaveSettingsAction } from '../ipc/configActions';
import { AuthProvider, AuthInfo, emptyAuthInfo } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { ConfigData } from '../ipc/configMessaging';
import { AuthInfoEvent } from '../atlclients/authStore';
import { JiraSiteUpdateEvent } from '../jira/siteManager';

export class ConfigWebview extends AbstractReactWebview<ConfigData,Action> {
	
    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this),
            Container.jiraSiteManager.onDidSiteChange(this.onDidSiteChange, this),
        );
    }

    public get title(): string {
        return "AtlasCode Settings";
    }
    public get id(): string {
        return "configView";
    }

    public async invalidate() {
        const config:IConfig = await configuration.get<IConfig>();
        let authInfo:AuthInfo|undefined = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
        if(!authInfo) {
            authInfo = emptyAuthInfo;
        }

        Logger.debug('updating config for webview', config);
        this.updateConfig({type:'update',config:config,authInfo:authInfo,projects:Container.jiraSiteManager.projectsAvailable});
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        this.invalidate();
    }

    private onDidAuthChange(e:AuthInfoEvent) {
        this.invalidate();
    }

    private onDidSiteChange(e:JiraSiteUpdateEvent) {
        this.invalidate();
    }

    public async updateConfig(config: ConfigData) {
        this.postMessage(config);
    }

    async createOrShow(): Promise<void> {
        await super.createOrShow();
        await this.invalidate();
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'login': {
                    Logger.debug('got login request from webview',e);
                    handled = true;
                    if(isAuthAction(e)) {
                        switch (e.provider) {
                            case AuthProvider.JiraCloud: {
                                commands.executeCommand(Commands.AuthenticateJira);
                                break;
                            }
                            case AuthProvider.BitbucketCloud: {
                                commands.executeCommand(Commands.AuthenticateBitbucket);
                                break;
                            }
                        }
                    }
                    break;
                }
                case 'logout': {
                    handled = true;
                    Logger.debug('got logout request from webview', e);
                    if(isAuthAction(e)) {
                        switch (e.provider) {
                            case AuthProvider.JiraCloud: {
                                Logger.debug('logging out of jira');
                                commands.executeCommand(Commands.ClearJiraAuth);
                                break;
                            }
                            case AuthProvider.BitbucketCloud: {
                                Logger.debug('logging out of bitbucket');
                                commands.executeCommand(Commands.ClearBitbucketAuth);
                                break;
                            }
                        }
                    }
                    break;
                }
                case 'saveSettings': {
                    handled = true;
                    if(isSaveSettingsAction(e)){
                        for (const key in e.changes) {
                            const inspect = await configuration.inspect(key)!;

                            const value = e.changes[key];
                            await configuration.updateEffective(key, value === inspect.defaultValue ? undefined : value);
                        }

                        if(e.removes){
                            for (const key of e.removes) {
                                await configuration.updateEffective(key, undefined);
                            }
                        }
                    }
                    break;
                }
            }
        }

        return handled;
    }
}