import { window, Disposable, TreeDataProvider, TreeView, EventEmitter, Event, TreeViewVisibilityChangeEvent, ConfigurationChangeEvent, Command } from 'vscode';
import { IssueNode } from '../nodes/issueNode';
import { configuration } from '../../config/configuration';
import { AbstractIssueTreeNode } from './abstractIssueTreeNode';
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';

export interface RefreshableTree extends Disposable {
    refresh(): void;
}

export interface IssueTree extends RefreshableTree, TreeDataProvider<IssueNode> {
    setJql(jql: string | undefined): void;
}

export abstract class AbstractIssueTree extends AbstractIssueTreeNode implements IssueTree {

    private _onDidChangeTreeData = new EventEmitter<IssueNode>();
    public get onDidChangeTreeData(): Event<IssueNode> {
        return this._onDidChangeTreeData.event;
    }

    private _isVisible = false;
    private _tree: TreeView<IssueNode> | undefined;

    constructor(id: string, jql?: string, emptyState?: string, emptyStateCommand?: Command) {
        super(id, jql, emptyState, emptyStateCommand);

        this._disposables.push(Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        ));

        void this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    public async setVisibility(isVisible: boolean) {
        this._isVisible = isVisible;
        if (this.id && isVisible && await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            viewScreenEvent(this.id).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }

    protected async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing) {
            this._onDidChangeTreeData = new EventEmitter<IssueNode>();

            if (this._id.length > 0) {
                this._tree = window.createTreeView(this._id, {
                    treeDataProvider: this
                });
                this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
                this._disposables.push(this._tree);
            }
        }
    }

    refresh() {
        if (this._isVisible) {
            this._issues = undefined;
            this._onDidChangeTreeData.fire();
        }
    }

    setJql(jql: string | undefined) {
        this._jql = jql;
        this.refresh();
    }

    async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        this.setVisibility(event.visible);
    }
}
