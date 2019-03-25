import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter, Event, Uri, Command, Disposable, commands } from "vscode";
import { PipelineApi } from "../../pipelines/pipelines";
import { Pipeline, statusForState, Status } from "../../pipelines/model";
import { PullRequestApi, GitUrlParse, bitbucketHosts } from "../../bitbucket/pullRequests";
import { Repository } from "../../typings/git";
import { Container } from "../../container";
import * as moment from "moment";
import { Resources } from "../../resources";
import { Commands } from "../../commands";
import { AuthProvider } from '../../atlclients/authInfo';

const defaultPageLength = 25;
export interface PipelineInfo {
    pipelineUuid: string;
    repo: Repository;
}
export class PipelinesTree implements TreeDataProvider<Node>, Disposable {
    private _disposable: Disposable;
    private _branches: [string, Repository][] | undefined;
    private _page = 1;
    private _morePages = true;
    private _pipelines: Map<string, Pipeline[]> = new Map();
    private _onDidChangeTreeData = new EventEmitter<Node>();
    public get onDidChangeTreeData(): Event<Node> {
        return this._onDidChangeTreeData.event;
    }

    constructor(private _repositories: Repository[]) {
        this._disposable = Disposable.from(
            commands.registerCommand(Commands.PipelinesNextPage, () => { this.fetchNextPages(); })
        );
    }

    dispose() {
        this._disposable.dispose();
    }

    getTreeItem(element: Node): TreeItem {
        return element.treeItem();
    }

    async fetchNextPages() {
        if (this._page) {
            this._page++;
        }
        if (!this._branches) {
            this._branches = [];
        }
        const newBranches = await this.fetchBranches();
        this._branches = this._branches.concat(newBranches);
        this._onDidChangeTreeData.fire();
    }

    async getChildren(element?: Node): Promise<Node[]> {
        if (!await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud)) {
            return Promise.resolve([new EmptyNode("Please login to Bitbucket", { command: Commands.AuthenticateBitbucket, title: "Login to Bitbucket" })]);
        }
        if (!element) {
            if (!this._branches) {
                this._branches = await this.fetchBranches();
            }
            if ([...this._pipelines.values()].every(results => results.length === 0)) {
                return [new EmptyNode("No Pipelines results for this repository")];
            }
            const nodes: Node[] = this._branches.map(([b, r]) => new BranchNode(b, r, this._pipelines.get(b)));
            if (this._morePages) {
                nodes.push(new NextPageNode());
            }
            return nodes;
        } else if (element instanceof BranchNode) {
            const branchPipelines = this._pipelines.get(element.branchName);
            if (branchPipelines) {
                return branchPipelines.map((p: any) => new PipelineNode(p, element.repo));
            } else {
                return this.fetchPipelinesForBranch([element.branchName, element.repo])
                    .then(pipelines => {
                        return pipelines.map(p => new PipelineNode(p, element.repo));
                    });
            }
        } else if (element instanceof PipelineNode) {
            return Promise.resolve([]);
        }
        return Promise.resolve([]);
    }

    async fetchBranches(): Promise<[string, Repository][]> {
        var branches: [string, Repository][] = [];
        var morePages = false;
        for (var i = 0; i < this._repositories.length; i++) {
            const repo = this._repositories[i];
            const remotes = await PullRequestApi.getBitbucketRemotes(repo);
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
                    branches = branches.concat([[`${parsed.name}/${v.name!}`, repo]]);
                });
                if (branchesResponse.data.next) {
                    morePages = true;
                }
            }
        }
        this._morePages = morePages;
        return this.fetchPipelinesForBranches(branches);
    }

    async fetchPipelinesForBranches(branches: [string, Repository][]): Promise<[string, Repository][]> {
        await Promise.all(branches.map(b => this.fetchPipelinesForBranch(b)));
        branches.sort(([a]: [string, any], [b]: [string, any]) => {
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

    async fetchPipelinesForBranch([branchName, repo]: [string, Repository]): Promise<Pipeline[]> {
        await Container.clientManager.bbrequest();
        const pipelines = await PipelineApi.getList(repo, branchName.split('/')[1]);
        this._pipelines.set(branchName, pipelines);
        return pipelines;
    }

    public refresh() {
        this._branches = undefined;
        this._page = 1;
        this._pipelines.clear();
        this._repositories = Container.bitbucketContext.getBitbucketRepositores();
        this._onDidChangeTreeData.fire();
    }
}

const PipelineBranchContextValue = 'pipelineBranch';

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

export abstract class Node {
    abstract treeItem(): TreeItem;
}

export class PipelineNode extends Node {
    constructor(private _pipeline: Pipeline, private _repo: Repository) {
        super();
    }

    treeItem() {
        var label = "";
        if (this._pipeline.created_on) {
            label = moment(this._pipeline.created_on).fromNow();
        }
        label += ` ${statusForPipeline(this._pipeline)}`;
        const item = new TreeItem(label);
        item.command = { command: Commands.ShowPipeline, title: "Show Pipeline", arguments: [{ pipelineUuid: this._pipeline.uuid, repo: this._repo }] };
        item.iconPath = iconUriForPipeline(this._pipeline);
        return item;
    }
}

export class BranchNode extends Node {
    constructor(readonly branchName: string, readonly repo: Repository, readonly pipelines?: Pipeline[]) {
        super();
    }

    treeItem() {
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
}

class NextPageNode extends Node {
    treeItem() {
        const treeItem = new TreeItem('Load next page', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('more');
        treeItem.command = {
            command: Commands.PipelinesNextPage,
            title: 'Load more branches'
        };
        return treeItem;
    }
}

class EmptyNode extends Node {
    constructor(readonly _message: string, readonly _command?: Command) {
        super();
    }

    treeItem() {
        const text = this._message;
        const treeItem = new TreeItem(text, TreeItemCollapsibleState.None);
        treeItem.tooltip = text;
        treeItem.command = this._command;
        return treeItem;
    }
}
