import { Disposable, EventEmitter, Event, TreeItem, commands } from 'vscode';
import { AbstractBaseNode } from './nodes/abstractBaseNode';
import { BitbucketContext } from '../bitbucket/bbContext';
import { PaginatedBitbucketIssues } from '../bitbucket/model';
import { Commands } from '../commands';
import { Container } from '../container';
import { BitbucketIssuesRepositoryNode } from './bbissues/bbIssueNode';
import { bbIssuesPaginationEvent } from '../analytics';
import { BaseTreeDataProvider } from './Explorer';
import { emptyBitbucketNodes } from './nodes/bitbucketEmptyNodeList';
import { clientForRemote, firstBitbucketRemote } from '../bitbucket/bbUtils';

export class BitbucketIssuesDataProvider extends BaseTreeDataProvider {
    private _onDidChangeTreeData: EventEmitter<AbstractBaseNode | undefined> = new EventEmitter<AbstractBaseNode | undefined>();
    readonly onDidChangeTreeData: Event<AbstractBaseNode | undefined> = this._onDidChangeTreeData.event;
    private _childrenMap: Map<string, BitbucketIssuesRepositoryNode> | undefined = undefined;

    private _disposable: Disposable;

    constructor(private ctx: BitbucketContext) {
        super();
        this._disposable = Disposable.from(
            commands.registerCommand(Commands.BitbucketIssuesNextPage, async (issues: PaginatedBitbucketIssues) => {
                const bbApi = await clientForRemote(issues.remote);
                const result = await bbApi.issues!.nextPage(issues);
                this.addItems(result);
                bbIssuesPaginationEvent().then(e => Container.analyticsClient.sendUIEvent(e));
            }),
            ctx.onDidChangeBitbucketContext(() => {
                this.refresh();
            }),
        );
    }

    private updateChildren(): void {
        if (!this._childrenMap) {
            this._childrenMap = new Map();
        }
        this._childrenMap.clear();
        const repos = this.ctx.getBitbucketRepositores();
        const expand = repos.length === 1;
        repos.forEach(repo => {
            const remote = firstBitbucketRemote(repo);
            this._childrenMap!.set(repo.rootUri.toString(), new BitbucketIssuesRepositoryNode(repo, remote, expand));
        });
    }

    refresh(): void {
        this.updateChildren();
        this._onDidChangeTreeData.fire();
    }

    addItems(issues: PaginatedBitbucketIssues): void {
        if (!this._childrenMap || !this._childrenMap.get(issues.repository.rootUri.toString())) {
            return;
        }

        this._childrenMap.get(issues.repository.rootUri.toString())!.addItems(issues);
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: AbstractBaseNode): Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        const repos = this.ctx.getBitbucketRepositores();
        if (repos.length < 1) {
            return emptyBitbucketNodes;
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
