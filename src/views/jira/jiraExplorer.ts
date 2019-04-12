import { Disposable, commands, ConfigurationChangeEvent } from "vscode";
import { OpenIssuesTree } from "./openIssuesTree";
import { AssignedIssuesTree } from "./assignedIssuesTree";
import { Commands } from "../../commands";
import { RefreshableTree } from "./abstractIssueTree";
import { Container } from "../../container";
import { AuthInfoEvent } from "../../atlclients/authStore";
import { configuration } from "../../config/configuration";
import { setCommandContext, CommandContext } from "../../constants";
import { AuthProvider } from "../../atlclients/authInfo";
import { CustomJQLRoot } from "./customJqlRoot";
import { RefreshTimer } from "../RefreshTimer";

export class JiraExplorer extends Disposable {

    private _trees: RefreshableTree[] = [];
    private _disposable: Disposable;
    private _refreshTimer: RefreshTimer;

    constructor() {
        super(() => this.dispose());

        commands.registerCommand(Commands.RefreshJiraExplorer, this.refresh, this);

        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this)
        );

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
        this._refreshTimer = new RefreshTimer('jira.explorer.enabled', 'jira.explorer.refreshInterval', () => this.refresh());
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'jira.explorer.enabled')) {
            if (!Container.config.jira.explorer.enabled) {
                this.dispose();
            } else {
                if (initializing || this._trees.length === 0) {
                    this._trees.push(new OpenIssuesTree());
                    this._trees.push(new AssignedIssuesTree());
                    this._trees.push(new CustomJQLRoot());
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
            const isLoggedIn = await Container.authManager.isAuthenticated(AuthProvider.JiraCloud);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
        }
    }

    dispose() {
        this._disposable.dispose();
        this._trees.forEach(tree => {
            tree.dispose();
        });
        this._trees = [];
        this._refreshTimer.setActive(false);
    }

    async refresh() {
        if (!Container.onlineDetector.isOnline() || !await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            return;
        }
        this._trees.forEach(tree => {
            tree.refresh();
        });
    }

    async onDidAuthChange(e: AuthInfoEvent) {
        if (e.provider === AuthProvider.JiraCloud) {

            const isLoggedIn = await Container.authManager.isAuthenticated(AuthProvider.JiraCloud);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
            this.refresh();
        }
    }
}