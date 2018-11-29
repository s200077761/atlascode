import { TreeDataProvider, Disposable, EventEmitter, Event, commands, workspace, TreeItem} from 'vscode';
import { BaseNode } from './nodes/baseNode';
import { BitbucketContext } from '../bitbucket/context';
import { GitContentProvider } from './gitContentProvider';
import { PaginatedPullRequests } from '../bitbucket/model';
import { RepositoriesNode } from './nodes/repositoriesNode';
import { getPRDocumentCommentProvider } from './pullRequestCommentProvider';
import { Commands } from '../commands';
import { Container } from '../container';
import { AuthProvider } from '../atlclients/authInfo';
import { EmptyStateNode } from './nodes/emptyStateNode';

export class PullRequestNodeDataProvider implements TreeDataProvider<BaseNode>, Disposable {
    private _onDidChangeTreeData: EventEmitter<BaseNode | undefined> = new EventEmitter<BaseNode | undefined>();
    readonly onDidChangeTreeData: Event<BaseNode | undefined> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, RepositoriesNode> | undefined = undefined;

    static SCHEME = 'atlascode.bbpr';
    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        commands.registerCommand(Commands.BitbucketRefreshPullRequests, this.refresh, this);

        this._disposable = Disposable.from(
            workspace.registerTextDocumentContentProvider(PullRequestNodeDataProvider.SCHEME, new GitContentProvider(ctx)),
            workspace.registerDocumentCommentProvider(getPRDocumentCommentProvider()),
            getPRDocumentCommentProvider().onDidChangeCommentThreads(this.refresh,this),
            ctx.onDidChangeBitbucketContext(() => {
                this.updateChildren();
                this.refresh();
            }),
        );
    }

    private updateChildren(): void {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        this._childrenMap.clear();
        const repos = this.ctx.getAllRepositores();
        const expand = repos.length === 1;
        repos.forEach(repo => {
            this._childrenMap!.set(repo.rootUri.toString(), new RepositoriesNode(repo, expand));
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    addItems(prs: PaginatedPullRequests): void {
        if (!this._childrenMap || !this._childrenMap.get(prs.repository.rootUri.toString())) {
            return;
        }

        this._childrenMap.get(prs.repository.rootUri.toString())!.addItems(prs);
        this.refresh();
    }

    getTreeItem(element: BaseNode): TreeItem {
        return element.getTreeItem();
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            return Promise.resolve([new EmptyStateNode("Please login to Bitbucket", { command: Commands.AuthenticateBitbucket, title: "Login to Bitbucket" })]);
        }
        if (element) {
            return element.getChildren();
        }
        if (!this._childrenMap) {
            this.updateChildren();
        }
        return Array.from(this._childrenMap!.values());
    }

    dispose() {
        this._disposable.dispose();
        this._onDidChangeTreeData.dispose();
    }
}