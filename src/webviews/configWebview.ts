import { getProxyHostAndPort } from 'jira-pi-client';
import * as vscode from 'vscode';
import { commands, ConfigurationChangeEvent, ConfigurationTarget, env, Uri } from 'vscode';
import { authenticateButtonEvent, customJQLCreatedEvent, featureChangeEvent, logoutButtonEvent } from '../analytics';
import { DetailedSiteInfo, isBasicAuthInfo, isEmptySiteInfo, Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { authenticateCloud, authenticateServer, clearAuth } from '../commands/authenticate';
import { openWorkspaceSettingsJson } from '../commands/openWorkspaceSettingsJson';
import { configuration } from '../config/configuration';
import { JQLEntry, SettingSource } from '../config/model';
import { Container } from '../container';
import { ConfigTarget, isAuthAction, isFetchJqlDataAction, isLoginAuthAction, isOpenJsonAction, isSaveSettingsAction, isSubmitFeedbackAction } from '../ipc/configActions';
import { ConfigInspect, ConfigWorkspaceFolder } from '../ipc/configMessaging';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { AbstractReactWebview, InitializingWebview } from './abstractWebview';
import { getFeedbackUser, submitFeedback } from './feedbackSubmitter';

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

    public get productOrUndefined(): Product | undefined {
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

            const [jiraSitesAvailable, bitbucketSitesAvailable] = this.getSitesAvailable();

            const feedbackUser = await getFeedbackUser();

            const isRemote = env.remoteName !== undefined;

            let workspaceFolders: ConfigWorkspaceFolder[] = [];

            if (vscode.workspace.workspaceFolders) {
                workspaceFolders = vscode.workspace.workspaceFolders.map(folder => { return { name: folder.name, uri: folder.uri.toString() }; });
            }

            const target = configuration.get<string>('configurationTarget');

            this.postMessage({
                type: 'init',
                inspect: this.getInspect(),
                jiraSites: jiraSitesAvailable,
                bitbucketSites: bitbucketSitesAvailable,
                workspaceFolders: workspaceFolders,
                target: target,
                feedbackUser: feedbackUser,
                isRemote: isRemote,
                showTunnelOption: this.getShowTunnelOption(),
            });
        } catch (e) {
            let err = new Error(`error updating configuration: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
        } finally {
            this.isRefeshing = false;
        }
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {

        this.postMessage({ type: 'configUpdate', inspect: this.getInspect() });
    }

    private getShowTunnelOption(): boolean {
        const [pHost] = getProxyHostAndPort();
        if (pHost.trim() !== '') {
            return true;
        }

        return false;
    }

    private getInspect(): ConfigInspect {
        const inspect = configuration.inspect();

        return {
            "default": (inspect.defaultValue) ? inspect.defaultValue : {},
            "user": (inspect.globalValue) ? inspect.globalValue : {},
            "workspace": (inspect.workspaceValue) ? inspect.workspaceValue : {},
            "workspacefolder": (inspect.workspaceFolderValue) ? inspect.workspaceFolderValue : {},
        };
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
                case 'refresh': {
                    handled = true;
                    try {
                        await this.invalidate();
                    } catch (e) {
                        Logger.error(new Error(`error refreshing config: ${e}`));
                        this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error refeshing config') });
                    }
                    break;
                }
                case 'login': {
                    handled = true;
                    if (isLoginAuthAction(msg)) {
                        if (isBasicAuthInfo(msg.authInfo)) {
                            try {
                                await authenticateServer(msg.siteInfo, msg.authInfo);
                            } catch (e) {
                                let err = new Error(`Authentication error: ${e}`);
                                Logger.error(err);
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Authentication error') });
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
                case 'openJson': {
                    handled = true;
                    if (isOpenJsonAction(msg)) {
                        switch (msg.target) {
                            case ConfigTarget.User: {
                                commands.executeCommand('workbench.action.openSettingsJson');
                                break;
                            }
                            case ConfigTarget.Workspace: {
                                if (Array.isArray(vscode.workspace.workspaceFolders) && vscode.workspace.workspaceFolders.length > 0) {
                                    vscode.workspace.workspaceFile
                                        ? await commands.executeCommand('workbench.action.openWorkspaceConfigFile')
                                        : openWorkspaceSettingsJson(vscode.workspace.workspaceFolders[0].uri.fsPath);
                                }
                                break;
                            }
                        }
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
                            let target = ConfigurationTarget.Global;
                            const targetUri: Uri | null = (msg.targetUri !== "") ? Uri.parse(msg.targetUri) : null;

                            switch (msg.target) {
                                case ConfigTarget.User: {
                                    target = ConfigurationTarget.Global;
                                    break;
                                }
                                case ConfigTarget.Workspace: {
                                    target = ConfigurationTarget.Workspace;
                                    break;
                                }
                                case ConfigTarget.WorkspaceFolder: {
                                    target = ConfigurationTarget.WorkspaceFolder;
                                    break;
                                }
                            }

                            for (const key in msg.changes) {

                                const value = msg.changes[key];

                                // if this is a jql edit, we need to figure out which one changed
                                let jqlSiteId: string | undefined = undefined;

                                if (key === 'jira.jqlList') {
                                    if (Array.isArray(value)) {
                                        const currentJQLs = configuration.get<JQLEntry[]>('jira.jqlList');
                                        const newJqls = value.filter((entry: JQLEntry) => currentJQLs.find(cur => cur.id === entry.id) === undefined);
                                        if (newJqls.length > 0) {
                                            jqlSiteId = newJqls[0].siteId;
                                        }
                                    }
                                }

                                await configuration.update(key, value, target, targetUri);

                                if (typeof value === "boolean") {
                                    featureChangeEvent(key, value).then(e => { Container.analyticsClient.sendTrackEvent(e).catch(r => Logger.debug('error sending analytics')); });
                                }

                                if (key === 'jira.jqlList' && jqlSiteId) {
                                    const site = Container.siteManager.getSiteForId(ProductJira, jqlSiteId);
                                    if (site) {
                                        customJQLCreatedEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                    }
                                }
                            }

                            if (msg.removes) {
                                for (const key of msg.removes) {
                                    await configuration.update(key, undefined, target, targetUri);
                                }
                            }
                        } catch (e) {
                            let err = new Error(`error updating configuration: ${e}`);
                            Logger.error(err);
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e) });
                        }
                    }

                    break;
                }
                case 'sourceLink': {
                    handled = true;
                    env.openExternal(Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode`));
                    break;
                }
                case 'issueLink': {
                    handled = true;
                    env.openExternal(Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode/issues`));
                    break;
                }
                case 'docsLink': {
                    handled = true;
                    env.openExternal(Uri.parse(`https://confluence.atlassian.com/display/BITBUCKET/Atlassian+for+VS+Code`));
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
