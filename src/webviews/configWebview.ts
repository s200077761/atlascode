import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { IConfig, SettingSource } from '../config/model';
import { Action } from '../ipc/messaging';
import { commands, ConfigurationChangeEvent, Uri } from 'vscode';
import { isAuthAction, isSaveSettingsAction, isSubmitFeedbackAction, isLoginAuthAction, isFetchJqlDataAction } from '../ipc/configActions';
import { ProductJira, ProductBitbucket, DetailedSiteInfo, isBasicAuthInfo, isEmptySiteInfo } from '../atlclients/authInfo';
import { Logger } from '../logger';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { submitFeedback, getFeedbackUser } from './feedbackSubmitter';
import { authenticateButtonEvent, logoutButtonEvent, featureChangeEvent, customJQLCreatedEvent } from '../analytics';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { authenticateCloud, authenticateServer, clearAuth } from '../commands/authenticate';

export class ConfigWebview extends AbstractReactWebview implements InitializingWebview<SettingSource>{

    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this),
            Container.siteManager.onDidSitesAvailableChange(this.onSitesAvailableChange, this),
        );
    }

    initialize(settingSource: SettingSource) {
        this.postMessage({ type: 'setOpenedSettings', openedSettings: settingSource });
    }

    public get title(): string {
        return "Atlassian Settings";
    }
    public get id(): string {
        return "atlascodeSettings";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {

        return undefined;
    }

    async createOrShowConfig(data: SettingSource) {

        await super.createOrShow();

        this.initialize(data);

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

            this.postMessage({
                type: 'init',
                config: config,
                jiraSites: jiraSitesAvailable,
                bitbucketSites: bitbucketSitesAvailable,
                feedbackUser: feedbackUser,
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

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            switch (msg.action) {
                case 'login': {
                    handled = true;
                    if (isLoginAuthAction(msg)) {
                        if (isBasicAuthInfo(msg.authInfo)) {
                            try {
                                await authenticateServer(msg.siteInfo, msg.authInfo);
                            } catch (e) {
                                let err = new Error(`Authentication error: ${e}`);
                                Logger.error(err);
                                this.postMessage({ type: 'error', reason: `Authentication error: ${e}` });
                            }
                        } else {
                            authenticateCloud(msg.siteInfo);
                        }
                        authenticateButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'logout': {
                    handled = true;
                    if (isAuthAction(msg)) {
                        clearAuth(msg.siteInfo);
                        logoutButtonEvent(this.id).then(e => { Container.analyticsClient.sendUIEvent(e); });
                    }
                    break;
                }
                case 'fetchJqlOptions': {
                    handled = true;
                    if (isFetchJqlDataAction(msg) && !isEmptySiteInfo(msg.site)) {
                        try {
                            const client = await Container.clientManager.jiraClient(msg.site);
                            const data = await client.getJqlDataFromPath(msg.path);
                            this.postMessage({ type: 'jqlData', data: data, nonce: msg.nonce });
                        } catch (e) {
                            let errData = { errorMessages: [`${e}`] };
                            if (e.response && e.response.data) {
                                errData = e.response.data;
                            }
                            let err = new Error(`JQL fetch error: ${e}`);
                            Logger.error(err);
                            this.postMessage({ type: 'jqlData', data: errData, nonce: msg.nonce });
                        }
                    }
                    break;
                }
                case 'saveSettings': {
                    handled = true;
                    if (isSaveSettingsAction(msg)) {
                        try {

                            for (const key in msg.changes) {
                                const inspect = configuration.inspect(key)!;

                                const value = msg.changes[key];


                                await configuration.updateEffective(key, value === inspect.defaultValue ? undefined : value);

                                if (typeof value === "boolean") {
                                    featureChangeEvent(key, value).then(e => { Container.analyticsClient.sendTrackEvent(e).catch(r => Logger.debug('error sending analytics')); });
                                }

                                if (key === 'jira.jqlList') {
                                    if (Array.isArray(value) && value.length > 0) {
                                        // TODO: figure out which one changed
                                        const site = Container.siteManager.getSiteForId(ProductJira, value[0].siteId);
                                        if (site) {
                                            customJQLCreatedEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                        }
                                    }
                                }
                            }

                            if (msg.removes) {
                                for (const key of msg.removes) {
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
                    if (isSubmitFeedbackAction(msg)) {
                        submitFeedback(msg.feedback, 'atlascodeSettings');
                    }
                    break;
                }
            }
        }

        return handled;
    }
}
