import { TreeItem, TreeItemCollapsibleState, EventEmitter, Event, Uri, Command, Disposable, commands } from "vscode";
import { PipelineApi } from "../../pipelines/pipelines";
import { Pipeline, statusForState, Status } from "../../pipelines/model";
import { PullRequestApi, GitUrlParse, bitbucketHosts } from "../../bitbucket/pullRequests";
import { Repository } from "../../typings/git";
import { Container } from "../../container";
import * as moment from "moment";
import { Resources } from "../../resources";
import { Commands } from "../../commands";
import { AuthProvider } from '../../atlclients/authInfo';
import { BaseNode } from "../nodes/baseNode";
import { BaseTreeDataProvider } from "../Explorer";

const defaultPageLength = 25;
export interface PipelineInfo {
    pipelineUuid: string;
    repo: Repository;
}
export class PipelinesTree extends BaseTreeDataProvider {
    private _disposable: Disposable;
    private _childrenMap = new Map<string, PipelinesRepoNode>();
    private _onDidChangeTreeData = new EventEmitter<BaseNode>();
    public get onDidChangeTreeData(): Event<BaseNode> {
        return this._onDidChangeTreeData.event;
    }

    constructor() {
        super();

        this._disposable = Disposable.from(
            this._onDidChangeTreeData,
            commands.registerCommand(Commands.PipelinesNextPage, (repo) => { this.fetchNextPage(repo); })
        );
    }

    async fetchNextPage(repo: Repository) {
        const node = this._childrenMap.get(repo.rootUri.toString());
        if (node) {
            await node.fetchNextPage();
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BaseNode): TreeItem | Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (element) {
            return element.getChildren(element);
        }

        const repos = Container.bitbucketContext.getBitbucketRepositores();
        const expand = repos.length === 1;

        if (this._childrenMap.size === 0) {
            repos.forEach(repo => {
                this._childrenMap.set(repo.rootUri.toString(), new PipelinesRepoNode(repo, expand));
            });
        }

        return this._childrenMap.size === 0
            ? [new EmptyNode("No Bitbucket repositories found")]
            : Array.from(this._childrenMap.values());
    }

    public refresh() {
        this._childrenMap.clear();
        this._onDidChangeTreeData.fire();
    }

    async dispose() {
        this._disposable.dispose();
    }
}

export class PipelinesRepoNode extends BaseNode {
    private _branches: string[];
    private _page = 1;
    private _morePages = true;
    private _pipelines: Map<string, Pipeline[]> = new Map();

    constructor(private _repo: Repository, private expand?: boolean) {
        super();
    }

    getTreeItem(): TreeItem {
        const directory = this._repo.rootUri.path.split('/').pop();
        const item = new TreeItem(`${directory}`, this.expand ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
        item.tooltip = this._repo.rootUri.path;
        return item;
    }

    async fetchNextPage() {
        if (this._page) {
            this._page++;
        }
        if (!this._branches) {
            this._branches = [];
        }
        const newBranches = await this.fetchBranches();
        this._branches = this._branches.concat(newBranches);
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        if (!await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            return Promise.resolve([new EmptyNode("Please login to Bitbucket", { command: Commands.AuthenticateBitbucket, title: "Login to Bitbucket" })]);
        }
        if (!element || element instanceof PipelinesRepoNode) {
            if (!this._branches) {
                this._branches = await this.fetchBranches();
            }
            if ([...this._pipelines.values()].every(results => results.length === 0)) {
                return [new EmptyNode("No Pipelines results for this repository")];
            }
            const nodes: BaseNode[] = this._branches.map((b) => new BranchNode(this, b, this._repo, this._pipelines.get(b)));
            if (this._morePages) {
                nodes.push(new NextPageNode(this._repo));
            }
            return nodes;
        } else if (element instanceof BranchNode) {
            const branchPipelines = this._pipelines.get(element.branchName);
            if (branchPipelines) {
                return branchPipelines.map((p: any) => new PipelineNode(this, p, element.repo));
            } else {
                return this.fetchPipelinesForBranch(element.branchName)
                    .then(pipelines => {
                        return pipelines.map(p => new PipelineNode(this, p, element.repo));
                    });
            }
        } else if (element instanceof PipelineNode) {
            return Promise.resolve([]);
        }
        return Promise.resolve([]);
    }

    async fetchBranches(): Promise<string[]> {
        var branches: string[] = [];
        var morePages = false;
        const remotes = await PullRequestApi.getBitbucketRemotes(this._repo);
        if (remotes.length > 0) {
            const remote = remotes[0];
            const parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
            const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
            const branchesResponse = await bb.refs.listBranches({
                repo_slug: parsed.name,
                username: parsed.owner,
                page: `${this._page}`,
                pagelen: defaultPageLength,
                sort: '-target.date'
            });
            branchesResponse.data.values!.forEach(v => {
                branches.push(v.name!);
            });
            if (branchesResponse.data.next) {
                morePages = true;
            }
        }
        this._morePages = morePages;
        return this.fetchPipelinesForBranches(branches);
    }

    async fetchPipelinesForBranches(branches: string[]): Promise<string[]> {
        await Promise.all(branches.map(b => this.fetchPipelinesForBranch(b)));
        branches.sort((a, b) => {
            const pa = this._pipelines.get(a);
            const pb = this._pipelines.get(b);
            if (!pa || pa.length === 0) {
                return -1;
            }
            if (!pb || pb.length === 0) {
                return 1;
            }
            if (pa[0].created_on! < pb[0]!.created_on!) {
                return 1;
            }
            return -1;
        });
        return branches;
    }

    async fetchPipelinesForBranch(branchName: string): Promise<Pipeline[]> {
        await Container.clientManager.bbrequest();
        const pipelines = await PipelineApi.getList(this._repo, branchName);
        this._pipelines.set(branchName, pipelines);
        return pipelines;
    }

    public refresh() {
        this._branches = [];
        this._page = 1;
        this._pipelines.clear();
    }
}

const PipelineBranchContextValue = 'pipelineBranch';
const PipelineBuildContextValue = 'pipelineBuild';

function iconUriForPipeline(pipeline: Pipeline): Uri | undefined {
    switch (statusForState(pipeline.state)) {
        case Status.Pending:
            return Resources.icons.get('pending');
        case Status.InProgress:
            return Resources.icons.get('building');
        case Status.Paused:
            return Resources.icons.get('paused');
        case Status.Stopped:
            return Resources.icons.get('stopped');
        case Status.Successful:
            return Resources.icons.get('success');
        case Status.Error:
            return Resources.icons.get('failed');
        case Status.Failed:
            return Resources.icons.get('failed');
        default:
            return undefined;
    }
}

function statusForPipeline(pipeline: Pipeline): string {
    switch (statusForState(pipeline.state)) {
        case Status.Pending:
            return 'Pending';
        case Status.InProgress:
            return 'Building';
        case Status.Paused:
            return 'Success';
        case Status.Stopped:
            return 'Stopped';
        case Status.Successful:
            return 'Success';
        case Status.Error:
            return 'Error';
        case Status.Failed:
            return 'Failed';
        default:
            return 'Error';
    }
}

export class PipelineNode extends BaseNode {
    constructor(private _repoNode: PipelinesRepoNode, readonly pipeline: Pipeline, private _repo: Repository) {
        super();
    }

    getTreeItem() {
        var label = "";
        if (this.pipeline.created_on) {
            label = moment(this.pipeline.created_on).fromNow();
        }
        label += ` ${statusForPipeline(this.pipeline)}`;
        const item = new TreeItem(label);
        item.contextValue = PipelineBuildContextValue;
        item.command = { command: Commands.ShowPipeline, title: "Show Pipeline", arguments: [{ pipelineUuid: this.pipeline.uuid, repo: this._repo }] };
        item.iconPath = iconUriForPipeline(this.pipeline);
        return item;
    }

    getChildren(element: BaseNode): Promise<BaseNode[]> {
        return this._repoNode.getChildren(element);
    }
}

export class BranchNode extends BaseNode {
    constructor(private _repoNode: PipelinesRepoNode, readonly branchName: string, readonly repo: Repository, readonly pipelines?: Pipeline[]) {
        super();
    }

    getTreeItem() {
        const treeItem = new TreeItem(this.branchName);
        treeItem.collapsibleState = TreeItemCollapsibleState.Collapsed;
        treeItem.contextValue = PipelineBranchContextValue;
        if (this.pipelines && this.pipelines.length > 0) {
            const iconPath = iconUriForPipeline(this.pipelines[0]);
            if (iconPath) {
                treeItem.iconPath = iconPath;
            }
        }
        return treeItem;
    }

    getChildren(element: BaseNode): Promise<BaseNode[]> {
        return this._repoNode.getChildren(element);
    }
}

class NextPageNode extends BaseNode {
    constructor(private _repo: Repository) {
        super();
    }

    getTreeItem() {
        const treeItem = new TreeItem('Load next page', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('more');
        treeItem.command = {
            command: Commands.PipelinesNextPage,
            title: 'Load more branches',
            arguments: [this._repo]
        };
        return treeItem;
    }
}

class EmptyNode extends BaseNode {
    constructor(readonly _message: string, readonly _command?: Command) {
        super();
    }

    getTreeItem() {
        const text = this._message;
        const treeItem = new TreeItem(text, TreeItemCollapsibleState.None);
        treeItem.tooltip = text;
        treeItem.command = this._command;
        return treeItem;
    }
}
