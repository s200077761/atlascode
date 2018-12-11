import { window, Disposable, TreeDataProvider, TreeView, EventEmitter, Event, TreeViewVisibilityChangeEvent, ConfigurationChangeEvent, Command } from 'vscode';
import { Logger } from '../../logger';
import { IssueNode } from '../nodes/issueNode';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';
import { Time } from '../../util/time';
import { AbstractIssueTreeNode } from './abstractIssueTreeNode';

export interface IssueTree extends Disposable,TreeDataProvider<IssueNode> {
    refresh():void;
    setJql(jql: string | undefined):void;
}

export abstract class AbstractIssueTree extends AbstractIssueTreeNode implements IssueTree {

    private _onDidChangeTreeData = new EventEmitter<IssueNode>();
    public get onDidChangeTreeData(): Event<IssueNode> {
        return this._onDidChangeTreeData.event;
    }

    private _tree: TreeView<IssueNode> | undefined;
    private _timer: any | undefined;
    private _refreshInterval = 1 * Time.MINUTES;

    constructor(id:string, jql?:string, emptyState?:string, emptyStateCommand?:Command) {
        super(id, jql, emptyState, emptyStateCommand);

        this._disposables.push(Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        ));

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
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
        if(this._tree && this._tree.visible) {
            Logger.debug(`Refreshing issue tree: ${this._id}`);
            this._issues = undefined;
            this._onDidChangeTreeData.fire();
        }
    }

    setJql(jql: string | undefined) {
        this._jql = jql;
        this.refresh();
    }

    async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            viewScreenEvent(this.id, Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendScreenEvent(e); });
            this.startTimer();
        } else {
            this.stopTimer();
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
