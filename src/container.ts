import { Disposable, env, ExtensionContext, UriHandler } from 'vscode';
import { AnalyticsClient } from './analytics-node-client/src/index';
import { CredentialManager } from './atlclients/authStore';
import { ClientManager } from './atlclients/clientManager';
import { LoginManager } from './atlclients/loginManager';
import { BitbucketContext } from './bitbucket/bbContext';
import { BitbucketIssue, PullRequest } from './bitbucket/model';
import { configuration, IConfig } from './config/configuration';
import { PmfStats } from './feedback/pmfStats';
import { JQLManager } from './jira/jqlManager';
import { JiraProjectManager } from './jira/projectManager';
import { JiraSettingsManager } from './jira/settingsManager';
import { CancellationManager } from './lib/cancellation';
import { BitbucketIssueAction } from './lib/ipc/fromUI/bbIssue';
import { ConfigAction } from './lib/ipc/fromUI/config';
import { OnboardingAction } from './lib/ipc/fromUI/onboarding';
import { PipelineSummaryAction } from './lib/ipc/fromUI/pipelineSummary';
import { PullRequestDetailsAction } from './lib/ipc/fromUI/pullRequestDetails';
import { StartWorkAction } from './lib/ipc/fromUI/startWork';
import { WelcomeAction } from './lib/ipc/fromUI/welcome';
import { ConfigTarget } from './lib/ipc/models/config';
import { SectionChangeMessage } from './lib/ipc/toUI/config';
import { StartWorkIssueMessage } from './lib/ipc/toUI/startWork';
import { WelcomeInitMessage } from './lib/ipc/toUI/welcome';
import { CommonActionMessageHandler } from './lib/webview/controller/common/commonActionMessageHandler';
import { Pipeline } from './pipelines/model';
import { SiteManager } from './siteManager';
import { AtlascodeUriHandler, ONBOARDING_URL, SETTINGS_URL } from './uriHandler';
import { OnlineDetector } from './util/online';
import { AuthStatusBar } from './views/authStatusBar';
import { HelpExplorer } from './views/HelpExplorer';
import { JiraActiveIssueStatusBar } from './views/jira/activeIssueStatusBar';
import { IssueHoverProviderManager } from './views/jira/issueHoverProviderManager';
import { JiraContext } from './views/jira/jiraContext';
import { PipelinesExplorer } from './views/pipelines/PipelinesExplorer';
import { VSCAnalyticsApi } from './vscAnalyticsApi';
import { VSCBitbucketIssueActionApi } from './webview/bbIssue/vscBitbucketIssueActionApi';
import { VSCBitbucketIssueWebviewControllerFactory } from './webview/bbIssue/vscBitbucketIssueWebviewControllerFactory';
import { VSCCommonMessageHandler } from './webview/common/vscCommonMessageActionHandler';
import { VSCConfigActionApi } from './webview/config/vscConfigActionApi';
import { VSCConfigWebviewControllerFactory } from './webview/config/vscConfigWebviewControllerFactory';
import { ExplorerFocusManager } from './webview/ExplorerFocusManager';
import { MultiWebview } from './webview/multiViewFactory';
import { VSCOnboardingActionApi } from './webview/onboarding/vscOnboardingActionApi';
import { VSCOnboardingWebviewControllerFactory } from './webview/onboarding/vscOnboardingWebviewControllerFactory';
import { PipelineSummaryActionImplementation } from './webview/pipelines/pipelineSummaryActionImplementation';
import { PipelineSummaryWebviewControllerFactory } from './webview/pipelines/pipelineSummaryWebviewControllerFactory';
import { VSCPullRequestDetailsActionApi } from './webview/pullRequest/vscPullRequestDetailsActionApi';
import { VSCPullRequestDetailsWebviewControllerFactory } from './webview/pullRequest/vscPullRequestDetailsWebviewControllerFactory';
import { SingleWebview } from './webview/singleViewFactory';
import { VSCStartWorkActionApi } from './webview/startwork/vscStartWorkActionApi';
import { VSCStartWorkWebviewControllerFactory } from './webview/startwork/vscStartWorkWebviewControllerFactory';
import { VSCWelcomeActionApi } from './webview/welcome/vscWelcomeActionApi';
import { VSCWelcomeWebviewControllerFactory } from './webview/welcome/vscWelcomeWebviewControllerFactory';
import { CreateBitbucketIssueWebview } from './webviews/createBitbucketIssueWebview';
import { CreateIssueWebview } from './webviews/createIssueWebview';
import { JiraIssueViewManager } from './webviews/jiraIssueViewManager';
import { PullRequestCreatorWebview } from './webviews/pullRequestCreatorWebview';
import { PullRequestViewManager } from './webviews/pullRequestViewManager';
import { StartWorkOnBitbucketIssueWebview } from './webviews/startWorkOnBitbucketIssueWebview';
import { StartWorkOnIssueWebview } from './webviews/startWorkOnIssueWebview';

const isDebuggingRegex = /^--(debug|inspect)\b(-brk\b|(?!-))=?/;
const ConfigTargetKey = 'configurationTarget';

export class Container {
    static initialize(context: ExtensionContext, config: IConfig, version: string) {
        let analyticsEnv: string = this.isDebugging ? 'staging' : 'prod';
        this._analyticsClient = new AnalyticsClient({
            origin: 'desktop',
            env: analyticsEnv,
            product: 'externalProductIntegrations',
            subproduct: 'atlascode',
            version: version,
            deviceId: env.machineId,
        });

        this._cancellationManager = new Map();
        this._analyticsApi = new VSCAnalyticsApi(this._analyticsClient);
        this._commonMessageHandler = new VSCCommonMessageHandler(this._analyticsApi, this._cancellationManager);

        this._context = context;
        this._version = version;
        context.subscriptions.push((this._uriHandler = new AtlascodeUriHandler(this._analyticsApi)));
        context.subscriptions.push((this._credentialManager = new CredentialManager(this._analyticsClient)));
        context.subscriptions.push((this._siteManager = new SiteManager(context.globalState)));
        context.subscriptions.push((this._clientManager = new ClientManager(context)));
        context.subscriptions.push((this._onlineDetector = new OnlineDetector()));
        context.subscriptions.push((this._jiraProjectManager = new JiraProjectManager()));
        context.subscriptions.push((this._jiraSettingsManager = new JiraSettingsManager()));
        context.subscriptions.push(
            (this._pullRequestViewManager = new PullRequestViewManager(this._context.extensionPath))
        );
        context.subscriptions.push(
            (this._pullRequestCreatorView = new PullRequestCreatorWebview(this._context.extensionPath))
        );
        context.subscriptions.push(
            (this._createBitbucketIssueWebview = new CreateBitbucketIssueWebview(context.extensionPath))
        );
        context.subscriptions.push((this._createIssueWebview = new CreateIssueWebview(context.extensionPath)));
        context.subscriptions.push((this._jiraIssueViewManager = new JiraIssueViewManager(context.extensionPath)));
        context.subscriptions.push(
            (this._startWorkOnIssueWebview = new StartWorkOnIssueWebview(context.extensionPath))
        );
        context.subscriptions.push(
            (this._startWorkOnBitbucketIssueWebview = new StartWorkOnBitbucketIssueWebview(context.extensionPath))
        );
        context.subscriptions.push(new IssueHoverProviderManager());
        context.subscriptions.push((this._authStatusBar = new AuthStatusBar()));
        context.subscriptions.push((this._jqlManager = new JQLManager()));

        context.subscriptions.push((this._explorerFocusManager = new ExplorerFocusManager()));

        const settingsV2ViewFactory = new SingleWebview<SectionChangeMessage, ConfigAction>(
            context.extensionPath,
            new VSCConfigWebviewControllerFactory(
                new VSCConfigActionApi(this._analyticsApi, this._cancellationManager),
                this._commonMessageHandler,
                this._analyticsApi,
                SETTINGS_URL
            ),
            this._analyticsApi
        );

        const onboardingV2ViewFactory = new SingleWebview<any, OnboardingAction>(
            context.extensionPath,
            new VSCOnboardingWebviewControllerFactory(
                new VSCOnboardingActionApi(this._analyticsApi),
                this._commonMessageHandler,
                this._analyticsApi,
                ONBOARDING_URL
            ),
            this.analyticsApi
        );

        const welcomeV2ViewFactory = new SingleWebview<WelcomeInitMessage, WelcomeAction>(
            context.extensionPath,
            new VSCWelcomeWebviewControllerFactory(new VSCWelcomeActionApi(), this._commonMessageHandler),
            this._analyticsApi
        );

        const startWorkV2ViewFactory = new SingleWebview<StartWorkIssueMessage, StartWorkAction>(
            context.extensionPath,
            new VSCStartWorkWebviewControllerFactory(
                new VSCStartWorkActionApi(),
                this._commonMessageHandler,
                this._analyticsApi
            ),
            this._analyticsApi
        );

        context.subscriptions.push((this._settingsWebviewFactory = settingsV2ViewFactory));
        context.subscriptions.push((this._onboardingWebviewFactory = onboardingV2ViewFactory));
        context.subscriptions.push((this._welcomeWebviewFactory = welcomeV2ViewFactory));
        context.subscriptions.push((this._startWorkWebviewFactory = startWorkV2ViewFactory));

        const pipelinesV2Webview = new MultiWebview<Pipeline, PipelineSummaryAction>(
            context.extensionPath,
            new PipelineSummaryWebviewControllerFactory(new PipelineSummaryActionImplementation(), this._analyticsApi),
            this._analyticsApi
        );

        context.subscriptions.push((this._pipelinesSummaryWebview = pipelinesV2Webview));

        this._pmfStats = new PmfStats(context);

        this._loginManager = new LoginManager(this._credentialManager, this._siteManager, this._analyticsClient);

        if (config.jira.explorer.enabled) {
            context.subscriptions.push((this._jiraExplorer = new JiraContext()));
        } else {
            let disposable: Disposable;
            disposable = configuration.onDidChange((e) => {
                if (configuration.changed(e, 'jira.explorer.enabled')) {
                    disposable.dispose();
                    context.subscriptions.push((this._jiraExplorer = new JiraContext()));
                }
            });
        }

        context.subscriptions.push((this._helpExplorer = new HelpExplorer()));
    }

    static initializeBitbucket(bbCtx: BitbucketContext) {
        this._bitbucketContext = bbCtx;
        this._pipelinesExplorer = new PipelinesExplorer(bbCtx);
        this._context.subscriptions.push(
            (this._bitbucketIssueWebviewFactory = new MultiWebview<BitbucketIssue, BitbucketIssueAction>(
                this._context.extensionPath,
                new VSCBitbucketIssueWebviewControllerFactory(
                    new VSCBitbucketIssueActionApi(this._cancellationManager),
                    this._commonMessageHandler,
                    this._analyticsApi
                ),
                this._analyticsApi
            ))
        );
        this._context.subscriptions.push(
            (this._pullRequestDetailsWebviewFactory = new MultiWebview<PullRequest, PullRequestDetailsAction>(
                this._context.extensionPath,
                new VSCPullRequestDetailsWebviewControllerFactory(
                    new VSCPullRequestDetailsActionApi(),
                    this._commonMessageHandler,
                    this._analyticsApi
                ),
                this._analyticsApi
            ))
        );
        this._context.subscriptions.push((this._jiraActiveIssueStatusBar = new JiraActiveIssueStatusBar(bbCtx)));
    }

    static get machineId() {
        return env.machineId;
    }

    private static _isDebugging: boolean | undefined;
    public static get isDebugging() {
        if (this._isDebugging === undefined) {
            try {
                const args = process.execArgv;

                this._isDebugging = args ? args.some((arg) => isDebuggingRegex.test(arg)) : false;
            } catch {}
        }

        return this._isDebugging;
    }

    public static get configTarget(): ConfigTarget {
        return this._context.globalState.get<ConfigTarget>(ConfigTargetKey, ConfigTarget.User);
    }

    public static set configTarget(target: ConfigTarget) {
        this._context.globalState.update(ConfigTargetKey, target);
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

    private static _helpExplorer: HelpExplorer;
    static get helpExplorer() {
        return this._helpExplorer;
    }

    private static _explorerFocusManager: ExplorerFocusManager;
    static get explorerFocusManager() {
        return this._explorerFocusManager;
    }

    private static _settingsWebviewFactory: SingleWebview<SectionChangeMessage, ConfigAction>;
    static get settingsWebviewFactory() {
        return this._settingsWebviewFactory;
    }

    private static _onboardingWebviewFactory: SingleWebview<any, OnboardingAction>;
    static get onboardingWebviewFactory() {
        return this._onboardingWebviewFactory;
    }

    private static _pullRequestDetailsWebviewFactory: MultiWebview<any, PullRequestDetailsAction>;
    static get pullRequestDetailsWebviewFactory() {
        return this._pullRequestDetailsWebviewFactory;
    }

    private static _pipelinesSummaryWebview: MultiWebview<Pipeline, PipelineSummaryAction>;
    static get pipelinesSummaryWebview() {
        return this._pipelinesSummaryWebview;
    }

    private static _welcomeWebviewFactory: SingleWebview<WelcomeInitMessage, WelcomeAction>;
    static get welcomeWebviewFactory() {
        return this._welcomeWebviewFactory;
    }

    private static _startWorkWebviewFactory: SingleWebview<StartWorkIssueMessage, StartWorkAction>;
    static get startWorkWebviewFactory() {
        return this._startWorkWebviewFactory;
    }

    private static _bitbucketIssueWebviewFactory: MultiWebview<any, ConfigAction>;
    static get bitbucketIssueWebviewFactory() {
        return this._bitbucketIssueWebviewFactory;
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

    private static _jiraActiveIssueStatusBar: JiraActiveIssueStatusBar;
    static get jiraActiveIssueStatusBar() {
        return this._jiraActiveIssueStatusBar;
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

    private static _analyticsApi: VSCAnalyticsApi;
    static get analyticsApi() {
        return this._analyticsApi;
    }

    private static _commonMessageHandler: CommonActionMessageHandler;
    static get commonMessageHandler() {
        return this._commonMessageHandler;
    }

    private static _cancellationManager: CancellationManager;
    static get cancellationManager() {
        return this._cancellationManager;
    }

    private static _pmfStats: PmfStats;
    static get pmfStats() {
        return this._pmfStats;
    }
}
