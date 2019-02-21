import { Disposable, commands, ConfigurationChangeEvent } from "vscode";
import { OpenIssuesTree } from "./openIssuesTree";
import { AssignedIssuesTree } from "./assignedIssuesTree";
import { Commands } from "../../commands";
import { RefreshableTree } from "./abstractIssueTree";
import { Container } from "../../container";
import { AuthInfoEvent } from "../../atlclients/authStore";
import { configuration, SiteJQL, JQLEntry } from "../../config/configuration";
import { setCommandContext, CommandContext } from "../../constants";
import { AuthProvider } from "../../atlclients/authInfo";
import { CustomJQLRoot } from "./customJqlRoot";
import { Time } from '../../util/time';

const defaultRefreshInterval = 5 * Time.MINUTES;

export class JiraExplorer extends Disposable {

    private _trees: RefreshableTree[] = [];
    private _disposable: Disposable;
    private _timer: any | undefined;
    private _refreshInterval = defaultRefreshInterval;

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

    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (
            initializing ||
            configuration.changed(e, 'jira.explorer.enabled') ||
            configuration.changed(e, 'jira.customJql')
        ) {
            if (!Container.config.jira.explorer.enabled) {
                this.dispose();
            } else {
                this._trees.push(new OpenIssuesTree());
                this._trees.push(new AssignedIssuesTree());
                const customJql = this.customJqlForWorkingSite();
                if (customJql.length > 0) {
                    this._trees.push(new CustomJQLRoot(customJql) as any);
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

        if (initializing ||
            configuration.changed(e, 'jira.explorer.refreshInterval') ||
            configuration.changed(e, 'jira.explorer.enabled')) {
            this._refreshInterval = Container.config.jira.explorer.refreshInterval * Time.MINUTES;
            const enabled = Container.config.jira.explorer.enabled;

            if (this._refreshInterval <= 0) {
                this._refreshInterval = 0;
            }

            if (this._refreshInterval === 0 || !enabled) {
                this.stopTimer();
            } else {
                this.stopTimer();
                this.startTimer();
            }
        }

        if (initializing) {
            const isLoggedIn = await Container.authManager.isAuthenticated(AuthProvider.JiraCloud);
            setCommandContext(CommandContext.JiraLoginTree, !isLoggedIn);
        }
    }

    private customJqlForWorkingSite(): JQLEntry[] {
        const siteJql = Container.config.jira.customJql.find((item: SiteJQL) => {
            return item.siteId === Container.config.jira.workingSite.id;
        });

        if (siteJql) {
            return siteJql.jql.filter((jql: JQLEntry) => {
                return jql.enabled;
            });
        }
        return [];
    }

    dispose() {
        this._disposable.dispose();
        this._trees.forEach(tree => {
            tree.dispose();
        });
    }

    refresh() {
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

    private startTimer() {
        if (this._refreshInterval > 0 && !this._timer) {
            this._timer = setInterval(() => {
                this.refresh();
            }, this._refreshInterval);
        }
    }

    private stopTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}