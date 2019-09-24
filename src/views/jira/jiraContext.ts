import { Disposable, commands, ConfigurationChangeEvent, ConfigurationTarget } from "vscode";
import { Commands } from "../../commands";
import { JiraExplorer } from "./jiraExplorer";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { setCommandContext, CommandContext, CustomJQLTreeId } from "../../constants";
import { ProductJira } from "../../atlclients/authInfo";
import { CustomJQLRoot } from "./customJqlRoot";
import { RefreshTimer } from "../RefreshTimer";
import { NewIssueMonitor } from "../../jira/newIssueMonitor";
import { MinimalORIssueLink } from "../../jira/jira-client/model/entities";
import { SitesAvailableUpdateEvent } from "../../siteManager";
import { v4 } from "uuid";

export class JiraContext extends Disposable {

    private _explorer: JiraExplorer | undefined;
    private _disposable: Disposable;
    private _newIssueMonitor: NewIssueMonitor;
    private _refreshTimer: RefreshTimer;

    constructor() {
        super(() => this.dispose());

        commands.registerCommand(Commands.RefreshJiraExplorer, this.refresh, this);

        this._refreshTimer = new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () => this.refresh());
        this._newIssueMonitor = new NewIssueMonitor();
        this._disposable = Disposable.from(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesDidChange, this),
            this._refreshTimer
        );

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'jira.explorer.enabled')) {
            if (!Container.config.jira.explorer.enabled) {
                this.dispose();
            } else {
                if (initializing || !this._explorer) {
                    this._explorer = new JiraExplorer(CustomJQLTreeId, new CustomJQLRoot());
                }
            }
            setCommandContext(CommandContext.JiraExplorer, Container.config.jira.explorer.enabled);
        }

        if (initializing || configuration.changed(e, 'jira.explorer.showOpenIssues')) {
            setCommandContext(CommandContext.OpenIssuesTree, Container.config.jira.explorer.showOpenIssues);
        }

        if (initializing || configuration.changed(e, 'jira.explorer.showAssignedIssues')) {
            setCommandContext(CommandContext.AssignedIssuesTree, Container.config.jira.explorer.showAssignedIssues);
        }

        if (initializing) {
            const isLoggedIn = Container.siteManager.productHasAtLeastOneSite(ProductJira);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
            //this._newIssueMonitor.setProject(project);
        }
    }

    dispose() {
        this._disposable.dispose();
        if (this._explorer) {
            this._explorer.dispose();
            this._explorer = undefined;
        }

    }

    async refresh() {
        if (!Container.onlineDetector.isOnline() || !Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return;
        }

        if (this._explorer) {
            this._explorer.refresh();
        }

        this._newIssueMonitor.checkForNewIssues();
    }

    async onSitesDidChange(e: SitesAvailableUpdateEvent) {
        if (e.product.key === ProductJira.key) {
            if (e.sites.length === 1 && Container.config.jira.jqlList.length < 1) {
                configuration.update('jira.jqlList', {
                    id: v4(),
                    enabled: true,
                    name: `My ${e.sites[0].name} Issues`,
                    query: 'assignee = currentUser() ORDER BY lastViewed DESC ',
                    siteId: e.sites[0].id,
                    monitor: true
                }, ConfigurationTarget.Global);
            }

            const isLoggedIn = e.sites.length > 0;
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
            this.refresh();
        }
    }

    async findIssue(issueKey: string): Promise<MinimalORIssueLink | undefined> {
        let issue: MinimalORIssueLink | undefined = undefined;
        if (this._explorer) {
            issue = await this._explorer.findIssue(issueKey);
        }

        return issue;
    }
}
