import { Disposable, commands, ConfigurationChangeEvent } from "vscode";
import { OpenIssuesTree } from "./openIssuesTree";
import { AssignedIssuesTree } from "./assignedIssuesTree";
import { Commands } from "../../commands";
import { IssueTree } from "./abstractIssueTree";
import { Container } from "../../container";
import { AuthInfoEvent } from "../../atlclients/authStore";
import { configuration } from "../../config/configuration";
import { setCommandContext, CommandContext } from "../../constants";
import { LoginTree } from "./loginTree";

export class JiraExplorer extends Disposable {

    private _trees:IssueTree[] = [];
    private _disposable:Disposable;

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this)
        );
        commands.registerCommand(Commands.RefreshJiraExplorer, this.refresh, this);
            
        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
        
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);
        if (
            initializing ||
            configuration.changed(e, 'jira.explorer.enabled')
        ) {
            if(!Container.config.jira.explorer.enabled) {
                this.dispose();
            } else {
                this._trees.push(new OpenIssuesTree());
                this._trees.push(new AssignedIssuesTree());
                this._trees.push(new LoginTree());
            }
            setCommandContext(CommandContext.JiraExplorer, Container.config.jira.explorer.enabled);
        }

        if(initializing || configuration.changed(e, 'jira.explorer.showOpenIssues')) {
            setCommandContext(CommandContext.OpenIssuesTree, Container.config.jira.explorer.showOpenIssues);
        }

        if(initializing || configuration.changed(e, 'jira.explorer.showAssignedIssues')) {
            setCommandContext(CommandContext.AssignedIssuesTree, Container.config.jira.explorer.showAssignedIssues);
        }
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

    onDidAuthChange(e:AuthInfoEvent) {
        this.refresh();
    }
}