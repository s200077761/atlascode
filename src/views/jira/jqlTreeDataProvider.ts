import { Disposable, TreeItem, Command, EventEmitter, Event } from 'vscode';
import { IssueNode } from '../nodes/issueNode';
import { SimpleJiraIssueNode } from '../nodes/simpleJiraIssueNode';
import { Container } from '../../container';
import { ProductJira, DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { issuesForJQL } from '../../jira/issuesForJql';
import { fetchMinimalIssue } from '../../jira/fetchIssue';
import { BaseTreeDataProvider } from '../Explorer';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { MinimalIssue } from '../../jira/jira-client/model/entities';
import { JQLEntry } from '../../config/model';

export abstract class JQLTreeDataProvider extends BaseTreeDataProvider {
    protected _disposables: Disposable[] = [];

    protected _issues: MinimalIssue[] | undefined;
    private _jqlEntry: JQLEntry | undefined;
    private _jqlSite: DetailedSiteInfo | undefined;

    private _emptyState = "No issues";
    private _emptyStateCommand: Command | undefined;
    protected _onDidChangeTreeData = new EventEmitter<AbstractBaseNode>();
    public get onDidChangeTreeData(): Event<AbstractBaseNode> {
        return this._onDidChangeTreeData.event;
    }

    constructor(jqlEntry?: JQLEntry, emptyState?: string, emptyStateCommand?: Command) {
        super();
        this._jqlEntry = jqlEntry;
        if (jqlEntry) {
            this._jqlSite = Container.siteManager.getSiteForId(ProductJira, jqlEntry.siteId);
        }

        if (emptyState && emptyState !== "") {
            this._emptyState = emptyState;
        }

        if (emptyStateCommand) {
            this._emptyStateCommand = emptyStateCommand;
        }
    }

    public setJqlEntry(entry: JQLEntry) {
        this._issues = undefined;
        this._jqlEntry = entry;
        this._jqlSite = Container.siteManager.getSiteForId(ProductJira, entry.siteId);
    }

    setEmptyState(text: string) {
        this._emptyState = text.trim() === ''
            ? 'No issues'
            : text;
    }

    refresh() {
        this._issues = undefined;
        this._onDidChangeTreeData.fire();
    }

    dispose() {
        this._disposables.forEach(d => {
            d.dispose();
        });

        this._disposables = [];
    }

    async getChildren(parent?: IssueNode, allowFetch: boolean = true): Promise<IssueNode[]> {
        if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
            return [new SimpleJiraIssueNode("Please login to Jira", { command: Commands.ShowConfigPage, title: "Login to Jira", arguments: [ProductJira] })];
        }
        if (parent) {
            return parent.getChildren();
        }
        if (!this._jqlEntry) {
            return [new SimpleJiraIssueNode(this._emptyState, this._emptyStateCommand)];
        } else if (this._issues) {
            return this.nodesForIssues();
        } else if (allowFetch) {
            return await this.fetchIssues();
        } else {
            return [];
        }
    }

    getTreeItem(node: IssueNode): TreeItem {
        return node.getTreeItem();
    }

    private async fetchIssues(): Promise<IssueNode[]> {
        if (!this._jqlEntry || !this._jqlSite) {
            return Promise.resolve([]);
        }

        // fetch issues matching the jql
        const newIssues = await issuesForJQL(this._jqlEntry.query, this._jqlSite);

        // epics don't have children filled in and children only have a ref to the parent key
        // we need to fill in the children and fetch the parents of any orphans
        const [epics, epicChildrenKeys] = await this.resolveEpics(newIssues);

        const issuesMissingParents: MinimalIssue[] = [];
        const standAloneIssues: MinimalIssue[] = [];

        newIssues.forEach(i => {
            if (i.parentKey && !newIssues.some(i2 => i.parentKey === i2.key)) {
                issuesMissingParents.push(i);
            } else if (!epics.some(e => e.key === i.key)) {
                standAloneIssues.push(i);
            }
        });

        // fetch parent issues for subtasks whose parents are not covered by the jql
        const parentIssues = await this.fetchParentIssues(issuesMissingParents);

        const allIssues = [...standAloneIssues, ...parentIssues, ...epics];
        const allSubIssueKeys = allIssues.map(issue => issue.subtasks.map(subtask => subtask.key)).reduce((prev, curr) => prev.concat(curr), []);

        // show subtasks under parent if parent is available
        this._issues = allIssues.filter(issue => { return !allSubIssueKeys.includes(issue.key) && !epicChildrenKeys.includes(issue.key); });
        return this.nodesForIssues();
    }

    private async fetchParentIssues(subIssues: MinimalIssue[]): Promise<MinimalIssue[]> {
        if (subIssues.length < 1) {
            return [];
        }
        const site = subIssues[0].siteDetails;
        const parentKeys: string[] = Array.from(new Set(subIssues.map(i => i.parentKey!)));

        const parentIssues = await Promise.all(
            parentKeys
                .map(async issueKey => {
                    const parent = await fetchMinimalIssue(issueKey, site);
                    // we only need the parent information here, we already have all the subtasks that satisfy the jql query
                    parent.subtasks = [];
                    return parent;
                }));

        subIssues.forEach(i => parentIssues.find(parentIssue => parentIssue.key === i.parentKey)!.subtasks.push(i));

        return parentIssues;
    }

    private async resolveEpics(allIssues: MinimalIssue[]): Promise<[MinimalIssue[], string[]]> {
        const allIssueKeys = allIssues.map(i => i.key);
        const localEpics = allIssues.filter(iss => iss.epicName && iss.epicName !== '');
        const epicChildrenWithoutParents = allIssues.filter(i => i.epicLink && !allIssueKeys.includes(i.epicLink));
        const remoteEpics = await this.fetchEpicIssues(epicChildrenWithoutParents);
        let epicChildKeys: string[] = [];

        const epics = [...localEpics, ...remoteEpics];

        if (epics.length < 1) {
            return [[], []];
        }

        let finalEpics: MinimalIssue[] = await Promise.all(
            epics
                .map(async epic => {
                    if (epic.epicChildren.length < 1) {
                        epic.epicChildren = allIssues.filter(i => i.epicLink === epic.key);
                    }

                    epicChildKeys.push(...epic.epicChildren.map(child => child.key));
                    return epic;
                }));

        return [finalEpics, epicChildKeys];
    }

    private async fetchEpicIssues(childIssues: MinimalIssue[]): Promise<MinimalIssue[]> {
        if (childIssues.length < 1) {
            return [];
        }
        const site = childIssues[0].siteDetails;
        const parentKeys: string[] = Array.from(new Set(childIssues.map(i => i.epicLink!)));

        const parentIssues = await Promise.all(
            parentKeys
                .map(async issueKey => {
                    const parent = await fetchMinimalIssue(issueKey, site);
                    return parent;
                }));

        return parentIssues;
    }

    private nodesForIssues(): IssueNode[] {
        if (this._issues && this._issues.length > 0) {
            return this._issues.map((issue) => new IssueNode(issue));
        } else {
            return [new SimpleJiraIssueNode(this._emptyState)];
        }
    }
}
