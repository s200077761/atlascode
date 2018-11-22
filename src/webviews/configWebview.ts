import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent } from 'vscode';
import { Commands } from '../commands';
import { isAuthAction, isSaveSettingsAction } from '../ipc/configActions';
import { AuthProvider } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';

export class ConfigWebview extends AbstractReactWebview<IConfig,Action> {
	
    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
    }

    public get title(): string {
        return "AtlasCode Settings";
    }
    public get id(): string {
        return "configView";
    }

    public invalidate() {
        const config:IConfig = configuration.get<IConfig>();
        Logger.debug('updating config for webview', config);
        this.updateConfig(config);
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        this.invalidate();
    }

    public async updateConfig(config: IConfig) {
        this.postMessage(config);
    }

    async createOrShow(): Promise<void> {
        await super.createOrShow();
        this.invalidate();
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
                    }
                    break;
                }
            }
        }

        return handled;
    }
}