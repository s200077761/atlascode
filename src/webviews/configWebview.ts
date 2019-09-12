import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent, Uri } from 'vscode';
import { isAuthAction, isSaveSettingsAction, isSubmitFeedbackAction, isLoginAuthAction } from '../ipc/configActions';
import { ProductJira, ProductBitbucket, DetailedSiteInfo, isBasicAuthInfo } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { submitFeedback, getFeedbackUser } from './feedbackSubmitter';
import { authenticateButtonEvent, logoutButtonEvent, featureChangeEvent, customJQLCreatedEvent } from '../analytics';
import { isFetchQueryAndSite } from '../ipc/issueActions';
import { JiraDefaultSiteConfigurationKey, JiraDefaultProjectsConfigurationKey } from '../constants';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { authenticateCloud, authenticateServer, clearAuth } from '../commands/authenticate';
import { JiraSiteProjectMappingUpdateEvent } from '../jira/projectManager';

export class ConfigWebview extends AbstractReactWebview {

    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.siteManager.onDidSitesAvailableChange(this.onSitesAvailableChange, this),
            Container.jiraProjectManager.onDidSiteProjectMappingChange(this.onSiteProjectMappingChange, this),
        );
    }

    public get title(): string {
        return "Atlassian Settings";
    }
    public get id(): string {
        return "atlascodeSettings";
    }

    public async invalidate() {
        try {
            if (!this._panel || this.isRefeshing) {
                return;
            }

            this.isRefeshing = true;
            const config: IConfig = configuration.get<IConfig>();

            const [jiraSitesAvailable, bitbucketSitesAvailable] = this.getSitesAvailable();

            const feedbackUser = await getFeedbackUser();
            const siteProjectMapping = await Container.jiraProjectManager.getSiteProjectMapping();

            this.postMessage({
                type: 'init',
                config: config,
                jiraAccessToken: "FIXME!",
                jiraSites: jiraSitesAvailable,
                bitbucketSites: bitbucketSitesAvailable,
                feedbackUser: feedbackUser,
                siteProjectMapping: siteProjectMapping,
            });
        } catch (e) {
            let err = new Error(`error updating configuration: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating configuration: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {

        this.postMessage({ type: 'configUpdate', config: configuration.get<IConfig>() });
    }

    private onSitesAvailableChange(e: SitesAvailableUpdateEvent) {
        const [jiraSitesAvailable, bitbucketSitesAvailable] = this.getSitesAvailable();

        this.postMessage({
            type: 'sitesAvailableUpdate'
            , jiraSites: jiraSitesAvailable
            , bitbucketSites: bitbucketSitesAvailable
        });
    }

    private onSiteProjectMappingChange(e: JiraSiteProjectMappingUpdateEvent) {
        this.postMessage({ type: 'projectMappingUpdate', siteProjectMapping: e.projectSiteMapping });
    }

    private getSitesAvailable(): [DetailedSiteInfo[], DetailedSiteInfo[]] {
        const isJiraConfigured = Container.siteManager.productHasAtLeastOneSite(ProductJira);
        const isBBConfigured = Container.siteManager.productHasAtLeastOneSite(ProductBitbucket);
        let jiraSitesAvailable: DetailedSiteInfo[] = [];
        let bitbucketSitesAvailable: DetailedSiteInfo[] = [];

        if (isJiraConfigured) {
            jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        }

        if (isBBConfigured) {
            bitbucketSitesAvailable = Container.siteManager.getSitesAvailable(ProductBitbucket);
        }

        return [jiraSitesAvailable, bitbucketSitesAvailable];
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
                                const inspect = configuration.inspect(key)!;

                                const value = e.changes[key];

                                if (key === JiraDefaultSiteConfigurationKey) {
                                    await configuration.setDefaultSite(value === inspect.defaultValue ? undefined : value);
                                } else if (key === JiraDefaultProjectsConfigurationKey) {
                                    await configuration.setDefaultProjects(value === inspect.defaultValue ? undefined : value);
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
                    if (isFetchQueryAndSite(e)) {
                        const projects = await Container.jiraProjectManager.getProjects(e.site, 'name', e.query);
                        this.postMessage({ type: 'projectList', availableProjects: projects, nonce: e.nonce });
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
