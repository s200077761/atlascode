import { window, Disposable, TreeDataProvider, TreeView, EventEmitter, Event, TreeViewVisibilityChangeEvent, TreeItem, ConfigurationChangeEvent, Command } from 'vscode';
import { Logger } from '../../logger';
import { Issue, issueExpand, issueFields, issueFromJsonObject } from '../../jira/jiraModel';
import { IssueNode } from '../nodes/issueNode';
import { EmptyStateNode } from '../nodes/emptyStateNode';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';

export interface IssueTree extends Disposable,TreeDataProvider<IssueNode> {
    refresh():void;
    setJql(jql: string | undefined):void;
}

export abstract class AbstractIssueTree extends Disposable implements IssueTree {
    private _disposables: Disposable[] = [];

    private _onDidChangeTreeData = new EventEmitter<IssueNode>();
    public get onDidChangeTreeData(): Event<IssueNode> {
        return this._onDidChangeTreeData.event;
    }

    private _id: string;
    private _tree: TreeView<IssueNode> | undefined;
    private _issues: Issue[] | undefined;
    private _jql: string | undefined;
    private _timer: any | undefined;
    private _emptyState = "No issues";
    private _emptyStateCommand: Command | undefined;
    private _refreshInterval = 60 * 1000;

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

        this._disposables.push(Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        ));

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    public get id():string {
        return this._id;
    }

    dispose() {
        Logger.debug("disposing", this._id);
        this._disposables.forEach(d => {
            d.dispose();
        });
        
        this._disposables = [];
    }

    protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing) {
            this._onDidChangeTreeData = new EventEmitter<IssueNode>();

            this._tree = window.createTreeView(this._id, {
                treeDataProvider: this
            });

            this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
            this._disposables.push(this._tree);

        }
    }

    refresh() {
        Logger.debug(`Refreshing issue tree: ${this._id}`);
        this._issues = undefined;
        this._onDidChangeTreeData.fire();
    }

    setJql(jql: string | undefined) {
        this._jql = jql;
        this.refresh();
    }

    onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible) {
            this.startTimer();
        } else {
            this.stopTimer();
        }
    }

    async getChildren(parent?: IssueNode): Promise<IssueNode[]> {
        if (parent || !this._jql) {
            return Promise.resolve([new EmptyStateNode(this._emptyState, this._emptyStateCommand)]);
        } else if (this._issues) {
            return Promise.resolve(this.nodesForIssues());
        } else {
            return this.fetchIssues();
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
            this._onDidChangeTreeData.fire();
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
                  return issueFromJsonObject(issue, Container.config.jira.workingSite);
                });
              }
              return [];
            });
        } else {
          Logger.debug("issuesForJQL: client undefined");
        }
      
        return Promise.reject();
      }

    private startTimer() {
        if (!this._timer) {
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
