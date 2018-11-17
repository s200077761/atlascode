import { window, Disposable, TreeDataProvider, TreeView, EventEmitter, Event, TreeViewVisibilityChangeEvent, TreeItem, ConfigurationChangeEvent } from 'vscode';
import { issuesForJQL } from '../../commands/jira/issuesForJQL';
import { Logger } from '../../logger';
import { Issue } from '../../jira/jiraModel';
import { IssueNode } from '../nodes/issueNode';
import { EmptyStateNode } from '../nodes/emptyStateNode';
import { Container } from '../../container';
import { configuration } from '../../config/configuration';

//import { Commands } from '../../commands';
export interface IssueTree extends Disposable,TreeDataProvider<IssueNode> {
    refresh():void;
    setJql(jql: string | undefined):void;
}

export abstract class AbstractIssueTree extends Disposable implements IssueTree {
    private _disposable: Disposable | undefined;

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
    private _refreshInterval = 60 * 1000;

    constructor(id:string, jql?:string, emptyState?:string) {
        super(() => this.dispose());

        this._id = id;
        this._jql = jql;
        if(emptyState && emptyState !== "") {
            this._emptyState = emptyState;
        }

        Container.context.subscriptions.push(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    dispose() {
        if(this._disposable) { this._disposable.dispose(); }
    }

    protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (
            !initializing
            // && !configuration.changed(e, configuration.name('gitExplorer').value) &&
            // !configuration.changed(e, configuration.name('explorers').value) &&
            // !configuration.changed(e, configuration.name('defaultGravatarsStyle').value) &&
            // !configuration.changed(e, configuration.name('advanced')('fileHistoryFollowsRenames').value)
        ) {
            return;
        }

        // if (
        //     initializing 
        //     // || configuration.changed(e, configuration.name('gitExplorer')('enabled').value) ||
        //     // configuration.changed(e, configuration.name('gitExplorer')('location').value)
        // ) {
        //     setCommandContext(CommandContext.GitExplorer, this.config.enabled ? this.config.location : false);
        // }

        // if (initializing || configuration.changed(e, configuration.name('gitExplorer')('autoRefresh').value)) {
        //     void this.setAutoRefresh(Container.config.gitExplorer.autoRefresh);
        // }

        // if (!initializing && configuration.changed(e, configuration.name('gitExplorer')('undockHistory').value)) {
        //     if (Container.config.historyExplorer.enabled) {
        //         this.undockHistory(!initializing);
        //     }
        //     // else {
        //     //     this.dockHistory(!initializing);
        //     // }
        // }

        if (initializing) {
            if (this._disposable) {
                this._disposable.dispose();
                this._onDidChangeTreeData = new EventEmitter<IssueNode>();
            }

            this._tree = window.createTreeView(this._id, {
                treeDataProvider: this
            });

            this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
            this._disposable = this._tree;

            return;
        }

        this.refresh();
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

    getChildren(parent?: IssueNode): Promise<IssueNode[]> {
        if (parent || !this._jql) {
            return Promise.resolve([new EmptyStateNode(this._emptyState)]);
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

        return issuesForJQL(this._jql)
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
