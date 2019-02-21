import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent, Uri } from 'vscode';
import { Commands } from '../commands';
import { isAuthAction, isSaveSettingsAction, isSubmitFeedbackAction } from '../ipc/configActions';
import { AuthProvider, emptyAuthInfo } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { ConfigData } from '../ipc/configMessaging';
import { AuthInfoEvent } from '../atlclients/authStore';
import { JiraSiteUpdateEvent } from '../jira/siteManager';
import { submitFeedback } from './feedbackSubmitter';
import { authenticateButtonEvent, logoutButtonEvent, featureChangeEvent } from '../analytics';
import { isFetchQuery } from '../ipc/issueActions';
import { ProjectList } from '../ipc/issueMessaging';

type Emit = ConfigData | ProjectList;

export class ConfigWebview extends AbstractReactWebview<Emit, Action> {

    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this),
            Container.jiraSiteManager.onDidSiteChange(this.onDidSiteChange, this),
        );
    }

    public get title(): string {
        return "Atlassian Settings";
    }
    public get id(): string {
        return "atlascodeSettings";
    }

    public async invalidate() {
        const config: IConfig = await configuration.get<IConfig>();
        var authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
        if (!authInfo) {
            authInfo = emptyAuthInfo;
        }
        Logger.debug('updating config for webview', config);
        this.updateConfig({
            type: 'update',
            config: config,
            sites: await Container.jiraSiteManager.getSitesAvailable(),
            projects: await Container.jiraSiteManager.getProjects(),
            isJiraAuthenticated: await Container.authManager.isAuthenticated(AuthProvider.JiraCloud),
            isBitbucketAuthenticated: await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud),
            jiraAccessToken: authInfo!.access
        });
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        Logger.debug('configWebview got config', e);
        this.invalidate();
    }

    private onDidAuthChange(e: AuthInfoEvent) {
        Logger.debug('configWebview got auth change', e.authInfo);
        this.invalidate();
    }

    private onDidSiteChange(e: JiraSiteUpdateEvent) {
        Logger.debug('configWebview got site change', e);
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

        if (!handled) {
            switch (e.action) {
                case 'login': {
                    Logger.debug('got login request from webview', e);
                    handled = true;
                    if (isAuthAction(e)) {
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
                        authenticateButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'logout': {
                    handled = true;
                    Logger.debug('got logout request from webview', e);
                    if (isAuthAction(e)) {
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
                        logoutButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'saveSettings': {
                    handled = true;
                    if (isSaveSettingsAction(e)) {
                        for (const key in e.changes) {
                            const inspect = await configuration.inspect(key)!;

                            const value = e.changes[key];

                            await configuration.updateEffective(key, value === inspect.defaultValue ? undefined : value);

                            if (typeof value === "boolean") {
                                featureChangeEvent(key, value).then(e => { Container.analyticsClient.sendTrackEvent(e).catch(r => Logger.debug('error sending analytics')); });
                            }
                        }

                        if (e.removes) {
                            for (const key of e.removes) {
                                await configuration.updateEffective(key, undefined);
                            }
                        }
                    }
                    break;
                }
                case 'fetchProjects': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        Container.jiraSiteManager.getProjects('name', e.query).then(projects => {
                            this.postMessage({ type: 'projectList', availableProjects: projects });
                        });
                    }
                    break;
                }
                case 'sourceLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode`));
                    break;
                }
                case 'submitFeedback': {
                    handled = true;
                    if (isSubmitFeedbackAction(e)) {
                        submitFeedback(e.feedback, 'atlascodeSettings');
                    }
                    break;
                }
            }
        }

        return handled;
    }
}
