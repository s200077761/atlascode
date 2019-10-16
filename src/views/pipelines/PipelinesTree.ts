import * as path from 'path';
import { TreeItem, TreeItemCollapsibleState, EventEmitter, Event, Uri, Disposable, commands, ConfigurationChangeEvent } from "vscode";
import { Pipeline } from "../../pipelines/model";
import { Repository, Remote } from "../../typings/git";
import { Container } from "../../container";
import { distanceInWordsToNow, format } from "date-fns";
import { Resources } from "../../resources";
import { Commands } from "../../commands";
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { BaseTreeDataProvider } from "../Explorer";
import { emptyBitbucketNodes } from "../nodes/bitbucketEmptyNodeList";
import { SimpleNode } from "../nodes/simpleNode";
import { configuration } from "../../config/configuration";
import { firstBitbucketRemote, siteDetailsForRemote, clientForRemote } from '../../bitbucket/bbUtils';
import { ProductBitbucket } from '../../atlclients/authInfo';
import { descriptionForState, iconUriForPipeline, shouldDisplay, filtersActive } from "./Helpers";

const defaultPageLength = 25;
export interface PipelineInfo {
    pipelineUuid: string;
    repo: Repository;
    remote: Remote;
}
export class PipelinesTree extends BaseTreeDataProvider {
    private _disposable: Disposable;
    private _childrenMap = new Map<string, PipelinesRepoNode>();
    private _onDidChangeTreeData = new EventEmitter<AbstractBaseNode>();
    public get onDidChangeTreeData(): Event<AbstractBaseNode> {
        return this._onDidChangeTreeData.event;
    }

    constructor() {
        super();

        this._disposable = Disposable.from(
            this._onDidChangeTreeData,
            commands.registerCommand(Commands.PipelinesNextPage, (repo) => { this.fetchNextPage(repo); }),
            configuration.onDidChange(this.onConfigurationChanged, this)
        );
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        if (configuration.changed(e, 'bitbucket.pipelines.hideEmpty') ||
            configuration.changed(e, 'bitbucket.pipelines.hideFiltered') ||
            configuration.changed(e, 'bitbucket.pipelines.branchFilters')) {
            this.refresh();
        }
    }

    async fetchNextPage(repo: Repository) {
        const node = this._childrenMap.get(repo.rootUri.toString());
        if (node) {
            await node.fetchNextPage();
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AbstractBaseNode): TreeItem | Promise<TreeItem> {
        return element.getTreeItem();
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (element) {
            return element.getChildren(element);
        }

        const repos = Container.bitbucketContext.getBitbucketCloudRepositories();
        const expand = repos.length === 1;

        if (this._childrenMap.size === 0) {
            repos.forEach(repo => {
                const remote = firstBitbucketRemote(repo);
                this._childrenMap.set(repo.rootUri.toString(), new PipelinesRepoNode(repo, remote, expand));
            });
        }

        return this._childrenMap.size === 0
            ? emptyBitbucketNodes
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

export class PipelinesRepoNode extends AbstractBaseNode {
    private _pipelines: Pipeline[];
    private _page = 1;
    private _morePages = true;

    constructor(private _repo: Repository, private _remote: Remote, private expand?: boolean) {
        super();
    }

    getTreeItem(): TreeItem {
        const directory = path.basename(this._repo.rootUri.fsPath);
        const item = new TreeItem(`${directory}`, this.expand ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.Collapsed);
        item.tooltip = this._repo.rootUri.fsPath;
        return item;
    }

    async fetchNextPage() {
        if (this._page) {
            this._page++;
        }
        if (!this._pipelines) {
            this._pipelines = [];
        }
        const newPipelines = await this.fetchPipelines();
        this._pipelines = this._pipelines.concat(newPipelines);
    }

    async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        if (!siteDetailsForRemote(this._remote)) {
            return Promise.resolve([new SimpleNode(`Please login to ${ProductBitbucket.name}`, { command: Commands.ShowConfigPage, title: "Login to Bitbucket", arguments: [ProductBitbucket] })]);
        }
        if (!element || element instanceof PipelinesRepoNode) {
            if (!this._pipelines) {
                this._pipelines = await this.fetchPipelines();
            }
            if (this._pipelines.length === 0 && !filtersActive()) {
                return [new SimpleNode("No pipelines results for this repository")];
            }

            const filteredPipelines = this._pipelines.filter(pipeline => shouldDisplay(pipeline.target.ref_name));
            let nodes: AbstractBaseNode[] = [];
            if(filtersActive && filteredPipelines.length === 0 && !this._morePages){
                nodes = [new SimpleNode(`No pipelines matching your filters`)];
            } else if (filtersActive() && filteredPipelines.length === 0) {
                const firstPipeTime: string = this._pipelines[0].created_on;
                const lastPipeTime: string = this._pipelines[this._pipelines.length - 1].created_on;
                nodes = [new SimpleNode(`No pipelines matching your filters from ${format(firstPipeTime, 'YYYY-MM-DD h:mm A')} to ${format(lastPipeTime, 'YYYY-MM-DD h:mm A')}`)];
            } else {
                nodes = filteredPipelines.map(pipeline => new PipelineNode(this, pipeline, this._repo, this._remote));
            }
           
            if (this._morePages && filtersActive()) {
                nodes.push(new NextPageNode(this._repo, this._pipelines[this._pipelines.length - 1].created_on)); //Pass the last-retrieved pipeline date
            } else if (this._morePages){
                nodes.push(new NextPageNode(this._repo));
            }
            return nodes;
        } else if (element instanceof PipelineNode) {
            return Promise.resolve([]);
        }
        return Promise.resolve([]);
    }

    private async fetchPipelines(): Promise<Pipeline[]> {
        let pipelines: Pipeline[] = [];

        const remote = firstBitbucketRemote(this._repo);
        if (remote) {
            this._remote = remote;
            const bbApi = await clientForRemote(this._remote);
            const paginatedPipelines = await bbApi.pipelines!.getPaginatedPipelines(remote, {
                page: `${this._page}`,
                pagelen: defaultPageLength,
            });
            pipelines = paginatedPipelines.values;
            const numPages = paginatedPipelines.size / defaultPageLength;
            this._morePages = paginatedPipelines.page < numPages;
        }
        return pipelines;
    }

    public refresh() {
        this._page = 1;
        this._pipelines = [];
    }
}

const PipelineBuildContextValue = 'pipelineBuild';

export class PipelineNode extends AbstractBaseNode {
    constructor(private _repoNode: PipelinesRepoNode, readonly pipeline: Pipeline, private _repo: Repository, private _remote: Remote) {
        super();
    }

    getTreeItem() {
        //Labels show up before descriptions, and descriptions are grayed out
        const label = `${descriptionForState(this.pipeline, true)}`;
        let description = "";
        if (this.pipeline.created_on) {
            description = `${distanceInWordsToNow(this.pipeline.created_on)} ago`;
        }

        const item = new TreeItem(label);
        item.description = description;
        item.contextValue = PipelineBuildContextValue;
        item.tooltip = label;
        item.command = { command: Commands.ShowPipeline, title: "Show Pipeline", arguments: [{ pipelineUuid: this.pipeline.uuid, repo: this._repo, remote: this._remote }] };
        item.iconPath = iconUriForPipeline(this.pipeline);
        item.resourceUri = Uri.parse(`${this.pipeline.repository!.url}/addon/pipelines/home#!/results/${this.pipeline.build_number}`);
        return item;
    }

    getChildren(element: AbstractBaseNode): Promise<AbstractBaseNode[]> {
        return this._repoNode.getChildren(element);
    }
}

class NextPageNode extends AbstractBaseNode {
    private _resultsSince: string | undefined;
    constructor(private _repo: Repository, resultsSince?: string) {
        super();
        this._resultsSince = resultsSince;
    }

    getTreeItem() {
        const treeItem = this._resultsSince 
            ? new TreeItem(`Load more (showing filtered results since ${format(this._resultsSince, 'YYYY-MM-DD h:mm A')})`)
            : new TreeItem('Load more', TreeItemCollapsibleState.None);
        treeItem.iconPath = Resources.icons.get('more');
        treeItem.command = {
            command: Commands.PipelinesNextPage,
            title: 'Load more branches',
            arguments: [this._repo]
        };
        return treeItem;
    }
}

