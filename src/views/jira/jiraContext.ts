import { Disposable, commands, ConfigurationChangeEvent } from "vscode";
import { OpenIssuesTree } from "./openIssuesTree";
import { AssignedIssuesTree } from "./assignedIssuesTree";
import { Commands } from "../../commands";
import { JiraExplorer } from "./jiraExplorer";
import { Container } from "../../container";
import { AuthInfoEvent } from "../../atlclients/authStore";
import { configuration } from "../../config/configuration";
import { setCommandContext, CommandContext, OpenIssuesTreeId, AssignedIssuesTreeId, CustomJQLTreeId } from "../../constants";
import { AuthProvider } from "../../atlclients/authInfo";
import { CustomJQLRoot } from "./customJqlRoot";
import { RefreshTimer } from "../RefreshTimer";
import { NewIssueMonitor } from "../../jira/newIssueMonitor";

export class JiraContext extends Disposable {

    private _explorers: JiraExplorer[] = [];
    private _disposable: Disposable;
    private _newIssueMonitor: NewIssueMonitor;
    private _refreshTimer: RefreshTimer;

    constructor() {
        super(() => this.dispose());

        commands.registerCommand(Commands.RefreshJiraExplorer, this.refresh, this);

        this._refreshTimer = new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () => this.refresh());
        this._newIssueMonitor = new NewIssueMonitor();
        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this),
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
                if (initializing || this._explorers.length === 0) {
                    this._explorers.push(new JiraExplorer(OpenIssuesTreeId, new OpenIssuesTree()));
                    this._explorers.push(new JiraExplorer(AssignedIssuesTreeId, new AssignedIssuesTree()));
                    this._explorers.push(new JiraExplorer(CustomJQLTreeId, new CustomJQLRoot()));
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

        if (!initializing && (configuration.changed(e, 'jira.workingProject') || configuration.changed(e, 'jira.workingSite'))) {
            const project = await Container.jiraSiteManager.getEffectiveProject();
            this._explorers.forEach(t => t.project = project);
            this._newIssueMonitor.setProject(project);
        }

        if (initializing) {
            const isLoggedIn = await Container.authManager.isAuthenticated(AuthProvider.JiraCloud);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
        }
    }

    dispose() {
        this._disposable.dispose();
        this._explorers.forEach(tree => {
            tree.dispose();
        });
        this._explorers = [];
    }

    async refresh() {
        if (!Container.onlineDetector.isOnline() || !await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            return;
        }
        this._explorers.forEach(e => e.refresh());
        this._newIssueMonitor.checkForNewIssues();
    }

    async onDidAuthChange(e: AuthInfoEvent) {
        if (e.provider === AuthProvider.JiraCloud) {

            const isLoggedIn = await Container.authManager.isAuthenticated(AuthProvider.JiraCloud);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
            this.refresh();
        }
    }
}
