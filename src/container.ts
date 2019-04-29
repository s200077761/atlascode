import { ExtensionContext, Disposable, env, UriHandler, window, Uri } from 'vscode';
import { configuration, IConfig } from './config/configuration';
import { ConfigWebview } from './webviews/configWebview';
import { PullRequestViewManager } from './webviews/pullRequestViewManager';
import { JiraIssueViewManager } from './webviews/jiraIssueViewManager';
import { ClientManager } from './atlclients/clientManager';
import { AuthManager } from './atlclients/authStore';
import { JiraContext } from './views/jira/jiraContext';
import { AuthStatusBar } from './views/authStatusBar';
import { JiraSiteManager } from './jira/siteManager';
import { WelcomeWebview } from './webviews/welcomeWebview';
import { AnalyticsClient } from './analytics-node-client/src/index';
import { IssueHoverProviderManager } from './views/jira/issueHoverProviderManager';
import { CreateIssueWebview } from './webviews/createIssueWebview';
import { PullRequestCreatorWebview } from './webviews/pullRequestCreatorWebview';
import { BitbucketContext } from './bitbucket/bbContext';
import { PipelinesExplorer } from './views/pipelines/PipelinesExplorer';
import { StartWorkOnIssueWebview } from './webviews/startWorkOnIssueWebview';
import { PipelineViewManager } from './webviews/pipelineViewManager';
import { BitbucketIssueViewManager } from './webviews/bitbucketIssueViewManager';
import { CreateBitbucketIssueWebview } from './webviews/createBitbucketIssueWebview';
import { OnlineDetector } from './util/online';
import { StartWorkOnBitbucketIssueWebview } from './webviews/startWorkOnBitbucketIssueWebview';
import { JiraFieldManager } from './jira/fieldManager';

export class AtlascodeUriHandler extends Disposable implements UriHandler {
    private disposables: Disposable;

    constructor() {
        super(() => this.dispose());
        this.disposables = window.registerUriHandler(this);
    }

    handleUri(uri: Uri): void {
    }

    dispose(): void {
        this.disposables.dispose();
    }
}

export class Container {
    static initialize(context: ExtensionContext, config: IConfig, version: string) {
        this._context = context;
        this._config = config;
        context.subscriptions.push((this._uriHandler = new AtlascodeUriHandler()));
        context.subscriptions.push((this._clientManager = new ClientManager(context)));
        context.subscriptions.push((this._authManager = new AuthManager()));
        context.subscriptions.push((this._onlineDetector = new OnlineDetector()));
        context.subscriptions.push((this._authStatusBar = new AuthStatusBar()));
        context.subscriptions.push((this._jiraSiteManager = new JiraSiteManager()));
        context.subscriptions.push((this._jiraFieldManager = new JiraFieldManager()));
        context.subscriptions.push((this._configWebview = new ConfigWebview(context.extensionPath)));
        context.subscriptions.push((this._welcomeWebview = new WelcomeWebview(context.extensionPath)));
        context.subscriptions.push(this._pullRequestViewManager = new PullRequestViewManager(this._context.extensionPath));
        context.subscriptions.push(this._pullRequestCreatorView = new PullRequestCreatorWebview(this._context.extensionPath));
        context.subscriptions.push((this._createBitbucketIssueWebview = new CreateBitbucketIssueWebview(context.extensionPath)));
        context.subscriptions.push((this._createIssueWebview = new CreateIssueWebview(context.extensionPath)));
        context.subscriptions.push((this._jiraIssueViewManager = new JiraIssueViewManager(context.extensionPath)));
        context.subscriptions.push(this._startWorkOnIssueWebview = new StartWorkOnIssueWebview(context.extensionPath));
        context.subscriptions.push(this._startWorkOnBitbucketIssueWebview = new StartWorkOnBitbucketIssueWebview(context.extensionPath));
        context.subscriptions.push(new IssueHoverProviderManager());

        let analyticsEnv: string = configuration.isDebugging ? 'staging' : 'prod';

        this._analyticsClient = new AnalyticsClient({
            origin: 'desktop',
            env: analyticsEnv,
            product: 'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version,
            deviceId: env.machineId
        });

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

    private static _uriHandler: UriHandler;
    static get uriHandler() {
        return this._uriHandler;
    }

    private static _config: IConfig | undefined;
    static get config() {
        return this._config || configuration.get<IConfig>();
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

    private static _authManager: AuthManager;
    static get authManager() {
        return this._authManager;
    }

    private static _onlineDetector: OnlineDetector;
    static get onlineDetector() {
        return this._onlineDetector;
    }

    private static _authStatusBar: AuthStatusBar;
    static get authStatusBar() {
        return this._authStatusBar;
    }

    private static _jiraSiteManager: JiraSiteManager;
    static get jiraSiteManager() {
        return this._jiraSiteManager;
    }

    private static _jiraFieldManager: JiraFieldManager;
    static get jiraFieldManager() {
        return this._jiraFieldManager;
    }

    private static _analyticsClient: AnalyticsClient;
    static get analyticsClient() {
        return this._analyticsClient;
    }

    static resetConfig() {
        this._config = undefined;
    }
}
