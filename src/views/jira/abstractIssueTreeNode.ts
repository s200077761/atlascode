import { Disposable, TreeItem, Command } from 'vscode';
import { Logger } from '../../logger';
import { Issue, issueExpand, issueFields, issueFromJsonObject } from '../../jira/jiraModel';
import { IssueNode } from '../nodes/issueNode';
import { EmptyStateNode } from '../nodes/emptyStateNode';
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { Commands } from '../../commands';


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
        if (parent || !this._jql) {
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

        return this.issuesForJQL(this._jql)
        .then(newIssues => {
            this._issues = newIssues;
            return this.nodesForIssues();
        });
    }

    private nodesForIssues(): IssueNode[] {
        if (this._issues && this._issues.length > 0) {
            return this._issues.map((issue) => new IssueNode(issue));
        } else {
            return [new EmptyStateNode(this._emptyState)];
        }
    }

    async issuesForJQL(jql: string): Promise<Issue[]> {
        let client = await Container.clientManager.jirarequest();
      
        if (client) {
          return client.search
            .searchForIssuesUsingJqlGet({
              expand: issueExpand,
              jql: jql,
              fields: issueFields
            })
            .then((res: JIRA.Response<JIRA.Schema.SearchResultsBean>) => {
              const issues = res.data.issues;
              if (issues) {
                return issues.map((issue: any) => {
                  return issueFromJsonObject(issue, Container.jiraSiteManager.effectiveSite);
                });
              }
              return [];
            });
        } else {
          Logger.debug("issuesForJQL: client undefined");
        }
      
        return Promise.reject();
      }
}
