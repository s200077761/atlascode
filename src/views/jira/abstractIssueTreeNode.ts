import { Disposable, TreeItem, Command } from 'vscode';
import { Issue } from '../../jira/jiraModel';
import { IssueNode } from '../nodes/issueNode';
import { EmptyStateNode } from '../nodes/emptyStateNode';
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { issuesForJQL } from '../../jira/issuesForJql';
import { fetchIssue } from '../../jira/fetchIssue';

export abstract class AbstractIssueTreeNode extends Disposable {
    protected _disposables: Disposable[] = [];

    protected _id: string;
    protected _issues: Issue[] | undefined;
    protected _jql: string | undefined;

    private _emptyState = "No issues";
    private _emptyStateCommand: Command | undefined;

    constructor(id:string, jql?:string, emptyState?:string, emptyStateCommand?:Command) {
        super(() => this.dispose());

        this._id = id;
        this._jql = jql;
        if(emptyState && emptyState !== "") {
            this._emptyState = emptyState;
        }

        if(emptyStateCommand) {
            this._emptyStateCommand = emptyStateCommand;
        }
    }

    public get id():string {
        return this._id;
    }

    dispose() {
        this._disposables.forEach(d => {
            d.dispose();
        });
        
        this._disposables = [];
    }

    async getChildren(parent?: IssueNode): Promise<IssueNode[]> {
        if (!await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            return Promise.resolve([new EmptyStateNode("Please login to Jira", { command: Commands.AuthenticateJira, title: "Login to Jira" })]);
        }
        if (parent) {
            return parent.getChildren();
        }
        if (!this._jql) {
            return Promise.resolve([new EmptyStateNode(this._emptyState, this._emptyStateCommand)]);
        } else if (this._issues) {
            return Promise.resolve(this.nodesForIssues());
        } else {
            return await this.fetchIssues();
        }
    }

    getTreeItem(node: IssueNode): TreeItem {
        return node.getTreeItem();
    }
    
    private async fetchIssues(): Promise<IssueNode[]> {
        if(!this._jql) {
            return Promise.resolve([]);
        }

        const newIssues = await issuesForJQL(this._jql);
        newIssues.push(...await this.fetchParentIssues(newIssues));
        const subissueKeys = newIssues.map(issue => issue.subtasks.map(subtask => subtask.key)).reduce((prev, curr) => prev.concat(curr), []);
        this._issues = newIssues.filter(issue => !subissueKeys.includes(issue.key));
        return this.nodesForIssues();
    }

    private async fetchParentIssues(issues: Issue[]): Promise<Issue[]> {
        const fetchedIssuesKeys = issues.map(issue => issue.key);
        const allIssueKeys: string[] = [];
        issues.forEach(issue => {
            if (!allIssueKeys.includes(issue.key)) {
                allIssueKeys.push(issue.key);
            }
            if (issue.parentKey && !allIssueKeys.includes(issue.parentKey)) {
                allIssueKeys.push(issue.parentKey);
            }
        });

        return await Promise.all(allIssueKeys.filter(issueKey => !fetchedIssuesKeys.includes(issueKey)).map(async issueKey => await fetchIssue(issueKey)));
    }

    private nodesForIssues(): IssueNode[] {
        if (this._issues && this._issues.length > 0) {
            return this._issues.map((issue) => new IssueNode(issue));
        } else {
            return [new EmptyStateNode(this._emptyState)];
        }
    }
}
