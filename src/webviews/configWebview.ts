import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent, Uri } from 'vscode';
import { isAuthAction, isSaveSettingsAction, isSubmitFeedbackAction, isLoginAuthAction } from '../ipc/configActions';
import { ProductJira, ProductBitbucket, DetailedSiteInfo, isBasicAuthInfo } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { ConfigData } from '../ipc/configMessaging';
import { submitFeedback } from './feedbackSubmitter';
import { authenticateButtonEvent, logoutButtonEvent, featureChangeEvent, customJQLCreatedEvent } from '../analytics';
import { isFetchQuery } from '../ipc/issueActions';
import { JiraWorkingProjectConfigurationKey, JiraDefaultSiteConfigurationKey } from '../constants';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { JiraAvailableProjectsUpdateEvent } from '../jira/projectManager';
import { authenticateCloud, authenticateServer, clearAuth } from '../commands/authenticate';
import { Project } from '../jira/jira-client/model/entities';

export class ConfigWebview extends AbstractReactWebview {

    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.siteManager.onDidSitesAvailableChange(this.onSitesAvailableChange, this),
            Container.jiraProjectManager.onDidProjectsAvailableChange(this.onProjectsAvailableChange, this),
        );
    }

    public get title(): string {
        return "Atlassian Settings";
    }
    public get id(): string {
        return "atlascodeSettings";
    }

    public async invalidate() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {
            const config: IConfig = await configuration.get<IConfig>();

            const isJiraConfigured = await Container.siteManager.productHasAtLeastOneSite(ProductJira);
            const isBBConfigured = await Container.siteManager.productHasAtLeastOneSite(ProductBitbucket);

            let jiraSitesAvailable: DetailedSiteInfo[] = [];
            let bitbucketSitesAvailable: DetailedSiteInfo[] = [];
            let stagingEnabled = false;
            let projects: Project[] = [];

            if (isJiraConfigured) {
                jiraSitesAvailable = await Container.siteManager.getSitesAvailable(ProductJira);
                stagingEnabled = false;
                projects = await Container.jiraProjectManager.getProjects();
            }

            if (isBBConfigured) {
                bitbucketSitesAvailable = await Container.siteManager.getSitesAvailable(ProductBitbucket);
            }

            this.updateConfig({
                type: 'update',
                config: config,
                jiraSites: jiraSitesAvailable,
                bitbucketSites: bitbucketSitesAvailable,
                projects: projects,
                isJiraAuthenticated: isJiraConfigured,
                isJiraStagingAuthenticated: false,
                isBitbucketAuthenticated: isBBConfigured,
                jiraAccessToken: "FIXME!",
                jiraStagingAccessToken: "REMOVEME!",
                isStagingEnabled: stagingEnabled
            });
        } catch (e) {
            let err = new Error(`error updating configuration: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating configuration: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        this.invalidate();
    }

    private onProjectsAvailableChange(e: JiraAvailableProjectsUpdateEvent) {
        this.invalidate();
    }

    private onSitesAvailableChange(e: SitesAvailableUpdateEvent) {
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
                    handled = true;
                    if (isLoginAuthAction(e)) {
                        if (isBasicAuthInfo(e.authInfo)) {
                            try {
                                await authenticateServer(e.siteInfo, e.authInfo);
                            } catch (e) {
                                let err = new Error(`Authentication error: ${e}`);
                                Logger.error(err);
                                this.postMessage({ type: 'error', reason: `Authentication error: ${e}` });
                            }
                        } else {
                            authenticateCloud(e.siteInfo);
                        }
                        authenticateButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'logout': {
                    handled = true;
                    if (isAuthAction(e)) {
                        clearAuth(e.siteInfo);
                        logoutButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'saveSettings': {
                    handled = true;
                    if (isSaveSettingsAction(e)) {
                        try {

                            for (const key in e.changes) {
                                const inspect = await configuration.inspect(key)!;

                                const value = e.changes[key];

                                if (key === JiraDefaultSiteConfigurationKey) {
                                    await configuration.setDefaultSite(value === inspect.defaultValue ? undefined : value);
                                } else if (key === JiraWorkingProjectConfigurationKey) {
                                    await configuration.setWorkingProject(value === inspect.defaultValue ? undefined : value);
                                } else {
                                    await configuration.updateEffective(key, value === inspect.defaultValue ? undefined : value);
                                }

                                if (typeof value === "boolean") {
                                    featureChangeEvent(key, value).then(e => { Container.analyticsClient.sendTrackEvent(e).catch(r => Logger.debug('error sending analytics')); });
                                }

                                if (key === 'jira.customJql') {
                                    customJQLCreatedEvent(Container.siteManager.effectiveSite(ProductJira).id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                }
                            }

                            if (e.removes) {
                                for (const key of e.removes) {
                                    await configuration.updateEffective(key, undefined);
                                }
                            }
                        } catch (e) {
                            let err = new Error(`error updating configuration: ${e}`);
                            Logger.error(err);
                            this.postMessage({ type: 'error', reason: `error updating configuration: ${e}` });
                        }
                    }

                    break;
                }
                case 'fetchProjects': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        Container.jiraProjectManager.getProjects('name', e.query).then(projects => {
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
                case 'issueLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode/issues`));
                    break;
                }
                case 'docsLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://confluence.atlassian.com/display/BITBUCKET/Atlassian+For+VSCode`));
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
