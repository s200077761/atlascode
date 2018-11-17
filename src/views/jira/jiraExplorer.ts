import { Disposable, commands } from "vscode";
import { OpenIssuesTree } from "./openIssuesTree";
import { AssignedIssuesTree } from "./assignedIssuesTree";
import { Commands } from "../../commands";
import { IssueTree } from "./abstractIssueTree";
import { Container } from "../../container";
import { AuthInfoEvent } from "../../atlclients/authStore";

export class JiraExplorer extends Disposable {

    private _trees:IssueTree[] = [];
    private _disposable:Disposable;

    constructor() {
        super(() => this.dispose());
        this._trees.push(new OpenIssuesTree());
        this._trees.push(new AssignedIssuesTree());

        this._disposable = Disposable.from(
            Container.authManager.onDidAuthChange(this.onDidAuthChange, this));
            
        commands.registerCommand(Commands.RefreshJiraExplorer, this.refresh, this);
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