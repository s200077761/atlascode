import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent, Uri } from 'vscode';
import { Commands } from '../commands';
import { isAuthAction, isSaveSettingsAction, isSubmitFeedbackAction } from '../ipc/configActions';
import { AuthProvider } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { ConfigData } from '../ipc/configMessaging';
import { AuthInfoEvent } from '../atlclients/authStore';
import { JiraSiteUpdateEvent } from '../jira/siteManager';
import { submitFeedback } from './feedbackSubmitter';
import { authenticateButtonEvent, logoutButtonEvent, featureChangeEvent } from '../analytics';

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
        return "atlascodeSettings";
    }

    public async invalidate() {
        const config:IConfig = await configuration.get<IConfig>();

        Logger.debug('updating config for webview', config);
        this.updateConfig({
            type:'update',
            config:config,
            sites:Container.jiraSiteManager.sitesAvailable,
            projects:Container.jiraSiteManager.projectsAvailable,
            isJiraAuthenticated: await Container.authManager.isAuthenticated(AuthProvider.JiraCloud),
            isBitbucketAuthenticated: await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)
        });
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
                        authenticateButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); } );
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
                        logoutButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); } );
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

                            if (typeof value === "boolean"){
                                featureChangeEvent(key,value).then(e => { Container.analyticsClient.sendTrackEvent(e).catch(r => Logger.debug('error sending analytics')); });
                            }
                        }

                        if(e.removes){
                            for (const key of e.removes) {
                                await configuration.updateEffective(key, undefined);
                            }
                        }
                    }
                    break;
                }
                case 'sourceLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode`));
                    break;
                }
                case 'helpLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://applink.atlassian.com/stride/a436116f-02ce-4520-8fbb-7301462a1674/chat/20317f63-2ed0-40d2-86b2-7611fa9b0035`));
                    break;
                }
                case 'submitFeedback': {
                    handled = true;
                    if(isSubmitFeedbackAction(e)){
                        submitFeedback(e.feedback, 'atlascodeSettings');
                    }
                    break;
                }
            }
        }

        return handled;
    }
}
