import { TreeDataProvider, TreeItem, TreeItemCollapsibleState, EventEmitter, Event, Uri, Command } from "vscode";
import { PipelineApi } from "../../pipelines/pipelines";
import { Pipeline } from "../../pipelines/model";
import { PullRequestApi, GitUrlParse, bitbucketHosts } from "../../bitbucket/pullRequests";
import { Repository } from "../../typings/git";
import { Container } from "../../container";
import * as moment from "moment";
import { Resources } from "../../resources";
import { Commands } from "../../commands";
import { AuthProvider } from '../../atlclients/authInfo';

export class PipelinesTree implements TreeDataProvider<Node> {
    private _branches: [string, Repository][] | undefined;
    private _pipelines: Map<string, Pipeline[]> = new Map();
    private _onDidChangeTreeData = new EventEmitter<Node>();
    public get onDidChangeTreeData(): Event<Node> {
        return this._onDidChangeTreeData.event;
    }

    constructor(private _repositories: Repository[]) {
    }

    getTreeItem(element: Node): TreeItem {
        return element.treeItem();
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
            return this._branches.map(([b, r]) => new BranchNode(b, r, this._pipelines[b]));
        } else if (element instanceof BranchNode) {
            const branchPipelines = this._pipelines[element.branchName];
            if (branchPipelines) {
                return branchPipelines.map((p: any) => new PipelineNode(p));
            } else {
                return this.fetchPipelinesForBranch([element.branchName, element.repo])
                    .then(pipelines => {
                        return pipelines.map(p => new PipelineNode(p));
                    });
            }
        } else if (element instanceof PipelineNode) {
            return Promise.resolve([]);
        }
        return Promise.resolve([]);
    }

    async fetchBranches(): Promise<[string, Repository][]> {
        var branches: [string, Repository][] = [];
        for (var i = 0; i < this._repositories.length; i++) {
            const repo = this._repositories[i];
            const remotes = await PullRequestApi.getBitbucketRemotes(repo);
            if (remotes.length > 0) {
                const remote = remotes[0];
                const parsed = GitUrlParse(remote.fetchUrl! || remote.pushUrl!);
                const bb: Bitbucket = await bitbucketHosts.get(parsed.source)();
                const branchesResponse = await bb.refs.listBranches({ repo_slug: parsed.name, username: parsed.owner });
                branchesResponse.data.values!.forEach(v => {
                    branches = branches!.concat([[v.name!, repo]]);
                });
                branches = await this.fetchPipelinesForBranches(branches);
                return Promise.resolve(branches);
            }
        }
        return Promise.resolve([]);
    }

    async fetchPipelinesForBranches(branches: [string, Repository][]): Promise<[string, Repository][]> {
        await Promise.all(branches.map(b => this.fetchPipelinesForBranch(b)));
        branches.sort(([a]: [string, any], [b]: [string, any]) => {
            const pa: Pipeline[] = this._pipelines[a];
            const pb: Pipeline[] = this._pipelines[b];
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
        const pipelines = await PipelineApi.getList(repo, branchName);
        this._pipelines[branchName] = pipelines;
        return pipelines;
    }

    public refresh() {
        this._branches = undefined;
        this._pipelines.clear();
        this._repositories = Container.bitbucketContext.getBitbucketRepositores();
        this._onDidChangeTreeData.fire();
    }
}

const PipelineBranchContextValue = 'pipelineBranch';

export abstract class Node {
    abstract treeItem(): TreeItem;
}

export class PipelineNode extends Node {
    constructor(private _pipeline: Pipeline) {
        super();
    }

    treeItem() {
        var label = "";
        if (this._pipeline.created_on) {
            label = moment(this._pipeline.created_on).fromNow();
        }
        if (this._pipeline.state) {
            label += ` ${this._pipeline.state.name}`;
            if (this._pipeline.state.result) {
                label += ` - ${this._pipeline.state.result.name}`;
            }
        }
        const item = new TreeItem(label);
        item.command = { command: Commands.ShowPipeline, title: "Show Pipeline", arguments: [this._pipeline.uuid] };
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
            const iconPath = this.iconUriForPipeline(this.pipelines[0]);
            if (iconPath) {
                treeItem.iconPath = iconPath;
            }
        }
        return treeItem;
    }

    private iconUriForPipeline(pipeline: Pipeline): Uri | undefined {
        const iconUriForResult = {
            "pipeline_state_completed_successful": Resources.icons.get('success'),
            "pipeline_state_completed_failed": Resources.icons.get('failed'),
            "pipeline_state_completed_error": Resources.icons.get('failed'),
            "pipeline_state_completed_stopped": Resources.icons.get('stopped')
        };

        if (pipeline && pipeline.state) {
            switch (pipeline.state.type) {
                case "pipeline_state_completed":
                    return iconUriForResult[pipeline.state!.result!.type];
                    break;
                case "pipeline_state_in_progress":
                    return Resources.icons.get('building');
                    break;
                case "pipeline_state_pending":
                    return Resources.icons.get('pending');
                    break;
            }
        }
        return undefined;
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