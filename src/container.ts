import { Disposable, env, ExtensionContext, Uri, UriHandler, window } from 'vscode';
import { AnalyticsClient } from './analytics-node-client/src/index';
import { CredentialManager as CredentialManager } from './atlclients/authStore';
import { ClientManager } from './atlclients/clientManager';
import { LoginManager } from './atlclients/loginManager';
import { BitbucketContext } from './bitbucket/bbContext';
import { configuration, IConfig } from './config/configuration';
import { JQLManager } from './jira/jqlManager';
import { JiraProjectManager } from './jira/projectManager';
import { JiraSettingsManager } from './jira/settingsManager';
import { PmfStats } from './pmf/stats';
import { SiteManager } from './siteManager';
import { OnlineDetector } from './util/online';
import { AuthStatusBar } from './views/authStatusBar';
import { IssueHoverProviderManager } from './views/jira/issueHoverProviderManager';
import { JiraContext } from './views/jira/jiraContext';
import { PipelinesExplorer } from './views/pipelines/PipelinesExplorer';
import { BitbucketIssueViewManager } from './webviews/bitbucketIssueViewManager';
import { ConfigWebview } from './webviews/configWebview';
import { CreateBitbucketIssueWebview } from './webviews/createBitbucketIssueWebview';
import { CreateIssueWebview } from './webviews/createIssueWebview';
import { JiraIssueViewManager } from './webviews/jiraIssueViewManager';
import { OnboardingWebview } from './webviews/Onboarding';
import { PipelineViewManager } from './webviews/pipelineViewManager';
import { PullRequestCreatorWebview } from './webviews/pullRequestCreatorWebview';
import { PullRequestViewManager } from './webviews/pullRequestViewManager';
import { StartWorkOnBitbucketIssueWebview } from './webviews/startWorkOnBitbucketIssueWebview';
import { StartWorkOnIssueWebview } from './webviews/startWorkOnIssueWebview';
import { WelcomeWebview } from './webviews/welcomeWebview';

const isDebuggingRegex = /^--(debug|inspect)\b(-brk\b|(?!-))=?/;

export class AtlascodeUriHandler extends Disposable implements UriHandler {
    private disposables: Disposable;

    constructor() {
        super(() => this.dispose());
        this.disposables = window.registerUriHandler(this);
    }

    handleUri(uri: Uri): void {
        if (uri.path.endsWith('openSettings')) {
            Container.configWebview.createOrShow();
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }
}

export class Container {
    static initialize(context: ExtensionContext, config: IConfig, version: string) {
        let analyticsEnv: string = this.isDebugging ? 'staging' : 'prod';
        this._analyticsClient = new AnalyticsClient({
            origin: 'desktop',
            env: analyticsEnv,
            product: 'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version,
            deviceId: env.machineId
        });

        this._context = context;
        this._version = version;
        context.subscriptions.push((this._uriHandler = new AtlascodeUriHandler()));
        context.subscriptions.push((this._clientManager = new ClientManager(context)));
        context.subscriptions.push((this._credentialManager = new CredentialManager(this._analyticsClient)));
        context.subscriptions.push((this._onlineDetector = new OnlineDetector()));
        context.subscriptions.push((this._siteManager = new SiteManager(context.globalState)));
        context.subscriptions.push((this._jiraProjectManager = new JiraProjectManager()));
        context.subscriptions.push((this._jiraSettingsManager = new JiraSettingsManager()));
        context.subscriptions.push((this._configWebview = new ConfigWebview(context.extensionPath)));
        context.subscriptions.push((this._welcomeWebview = new WelcomeWebview(context.extensionPath)));
        context.subscriptions.push((this._onboardingWebview = new OnboardingWebview(context.extensionPath)));
        context.subscriptions.push(this._pullRequestViewManager = new PullRequestViewManager(this._context.extensionPath));
        context.subscriptions.push(this._pullRequestCreatorView = new PullRequestCreatorWebview(this._context.extensionPath));
        context.subscriptions.push((this._createBitbucketIssueWebview = new CreateBitbucketIssueWebview(context.extensionPath)));
        context.subscriptions.push((this._createIssueWebview = new CreateIssueWebview(context.extensionPath)));
        context.subscriptions.push((this._jiraIssueViewManager = new JiraIssueViewManager(context.extensionPath)));
        context.subscriptions.push(this._startWorkOnIssueWebview = new StartWorkOnIssueWebview(context.extensionPath));
        context.subscriptions.push(this._startWorkOnBitbucketIssueWebview = new StartWorkOnBitbucketIssueWebview(context.extensionPath));
        context.subscriptions.push(new IssueHoverProviderManager());
        context.subscriptions.push((this._authStatusBar = new AuthStatusBar()));
        context.subscriptions.push(this._jqlManager = new JQLManager());

        this._pmfStats = new PmfStats(context);

        this._loginManager = new LoginManager(this._credentialManager, this._siteManager, this._analyticsClient);

        if (config.jira.explorer.enabled) {
            context.subscriptions.push((this._jiraExplorer = new JiraContext()));
        } else {
            let disposable: Disposable;
            disposable = configuration.onDidChange(e => {
                if (configuration.changed(e, 'jira.explorer.enabled')) {
                    disposable.dispose();
                    context.subscriptions.push((this._jiraExplorer = new JiraContext()));
                }
            });
        }
    }

    static initializeBitbucket(bbCtx: BitbucketContext) {
        this._bitbucketContext = bbCtx;
        this._pipelinesExplorer = new PipelinesExplorer(bbCtx);
        this._context.subscriptions.push((this._pipelineViewManager = new PipelineViewManager(this._context.extensionPath)));
        this._context.subscriptions.push(this._bitbucketIssueViewManager = new BitbucketIssueViewManager(this._context.extensionPath));
    }

    static get machineId() {
        return env.machineId;
    }

    private static _isDebugging: boolean | undefined;
    public static get isDebugging() {
        if (this._isDebugging === undefined) {
            try {
                const args = process.execArgv;

                this._isDebugging = args ? args.some(arg => isDebuggingRegex.test(arg)) : false;
            } catch { }
        }

        return this._isDebugging;
    }

    private static _uriHandler: UriHandler;
    static get uriHandler() {
        return this._uriHandler;
    }

    private static _version: string;
    static get version() {
        return this._version;
    }

    static get config() {
        // always return the latest
        return configuration.get<IConfig>();
    }

    private static _jqlManager: JQLManager;
    static get jqlManager() {
        return this._jqlManager;
    }

    private static _context: ExtensionContext;
    static get context() {
        return this._context;
    }

    private static _bitbucketContext: BitbucketContext;
    static get bitbucketContext() {
        return this._bitbucketContext;
    }

    private static _configWebview: ConfigWebview;
    static get configWebview() {
        return this._configWebview;
    }

    private static _welcomeWebview: WelcomeWebview;
    static get welcomeWebview() {
        return this._welcomeWebview;
    }

    private static _onboardingWebview: OnboardingWebview;
    static get onboardingWebview() {
        return this._onboardingWebview;
    }

    private static _createIssueWebview: CreateIssueWebview;
    static get createIssueWebview() {
        return this._createIssueWebview;
    }

    private static _startWorkOnIssueWebview: StartWorkOnIssueWebview;
    static get startWorkOnIssueWebview() {
        return this._startWorkOnIssueWebview;
    }

    private static _startWorkOnBitbucketIssueWebview: StartWorkOnBitbucketIssueWebview;
    static get startWorkOnBitbucketIssueWebview() {
        return this._startWorkOnBitbucketIssueWebview;
    }

    private static _pullRequestViewManager: PullRequestViewManager;
    static get pullRequestViewManager() {
        return this._pullRequestViewManager;
    }

    private static _pullRequestCreatorView: PullRequestCreatorWebview;
    static get pullRequestCreatorView() {
        return this._pullRequestCreatorView;
    }

    private static _createBitbucketIssueWebview: CreateBitbucketIssueWebview;
    static get createBitbucketIssueWebview() {
        return this._createBitbucketIssueWebview;
    }

    private static _jiraExplorer: JiraContext | undefined;
    static get jiraExplorer(): JiraContext {
        return this._jiraExplorer!;
    }

    private static _pipelinesExplorer: PipelinesExplorer | undefined;
    static get pipelinesExplorer(): PipelinesExplorer {
        return this._pipelinesExplorer!;
    }

    private static _jiraIssueViewManager: JiraIssueViewManager;
    static get jiraIssueViewManager() {
        return this._jiraIssueViewManager;
    }

    private static _pipelineViewManager: PipelineViewManager;
    static get pipelineViewManager() {
        return this._pipelineViewManager;
    }

    private static _bitbucketIssueViewManager: BitbucketIssueViewManager;
    static get bitbucketIssueViewManager() {
        return this._bitbucketIssueViewManager;
    }

    private static _clientManager: ClientManager;
    static get clientManager() {
        return this._clientManager;
    }

    private static _loginManager: LoginManager;
    static get loginManager() {
        return this._loginManager;
    }

    private static _credentialManager: CredentialManager;
    static get credentialManager() {
        return this._credentialManager;
    }

    private static _onlineDetector: OnlineDetector;
    static get onlineDetector() {
        return this._onlineDetector;
    }

    private static _authStatusBar: AuthStatusBar;
    static get authStatusBar() {
        return this._authStatusBar;
    }

    private static _siteManager: SiteManager;
    static get siteManager() {
        return this._siteManager;
    }

    private static _jiraSettingsManager: JiraSettingsManager;
    static get jiraSettingsManager() {
        return this._jiraSettingsManager;
    }

    private static _jiraProjectManager: JiraProjectManager;
    static get jiraProjectManager() {
        return this._jiraProjectManager;
    }

    private static _analyticsClient: AnalyticsClient;
    static get analyticsClient() {
        return this._analyticsClient;
    }

    private static _pmfStats: PmfStats;
    static get pmfStats() {
        return this._pmfStats;
    }

}
