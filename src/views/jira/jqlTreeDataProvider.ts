import { Disposable, TreeItem, Command, EventEmitter, Event } from 'vscode';
import { Issue } from '../../jira/jiraModel';
import { IssueNode } from '../nodes/issueNode';
import { SimpleJiraIssueNode } from '../nodes/simpleJiraIssueNode';
import { Container } from '../../container';
import { ProductJira } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { issuesForJQL } from '../../jira/issuesForJql';
import { fetchIssue } from '../../jira/fetchIssue';
import { BaseTreeDataProvider } from '../Explorer';
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { WorkingProject } from '../../config/model';
import { applyWorkingProject } from '../../jira/JqlWorkingProjectHelper';

export abstract class JQLTreeDataProvider extends BaseTreeDataProvider {
    protected _disposables: Disposable[] = [];

    protected _issues: Issue[] | undefined;
    private _jql: string | undefined;

    private _emptyState = "No issues";
    private _emptyStateCommand: Command | undefined;
    private _projectId: string | undefined;
    protected _onDidChangeTreeData = new EventEmitter<AbstractBaseNode>();
    public get onDidChangeTreeData(): Event<AbstractBaseNode> {
        return this._onDidChangeTreeData.event;
    }

    constructor(jql?: string, emptyState?: string, emptyStateCommand?: Command) {
        super();

        Container.jiraProjectManager.getEffectiveProject().then(p => this._projectId = p.id);
        this._jql = jql;
        if (emptyState && emptyState !== "") {
            this._emptyState = emptyState;
        }

        if (emptyStateCommand) {
            this._emptyStateCommand = emptyStateCommand;
        }
    }

    public setJql(jql: string) {
        this._issues = undefined;
        this._jql = jql;
    }

    private effectiveJql(): string | undefined {
        if (this._jql === undefined) {
            return undefined;
        }
        return applyWorkingProject(this._projectId, this._jql);
    }

    setProject(project: WorkingProject) {
        this._projectId = project.id;
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

    async getChildren(parent?: IssueNode): Promise<IssueNode[]> {
        if (!await Container.authManager.isProductAuthenticated(ProductJira)) {
            return Promise.resolve([new SimpleJiraIssueNode("Please login to Jira", { command: Commands.AuthenticateJira, title: "Login to Jira" })]);
        }
        if (parent) {
            return parent.getChildren();
        }
        if (!this._jql) {
            return Promise.resolve([new SimpleJiraIssueNode(this._emptyState, this._emptyStateCommand)]);
        } else if (this._issues) {
            return Promise.resolve(this.nodesForIssues());
        } else {
            return await this.fetchIssues();
        }
    }

    getTreeItem(node: IssueNode): TreeItem {
        return node.getTreeItem();
    }

    private async fetchIssues(): Promise<IssueNode[]> {
        const jql = this.effectiveJql();
        if (!jql) {
            return Promise.resolve([]);
        }

        // fetch issues matching the jql
        const newIssues = await issuesForJQL(jql);

        // epics don't have children filled in and children only have a ref to the parent key
        // we need to fill in the children and fetch the parents of any orphans
        const [epics, epicChildrenKeys] = await this.resolveEpics(newIssues);

        const issuesMissingParents: Issue[] = [];
        const standAloneIssues: Issue[] = [];

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

    private async fetchParentIssues(subIssues: Issue[]): Promise<Issue[]> {
        if (subIssues.length < 1) {
            return [];
        }
        const site = subIssues[0].siteDetails;
        const parentKeys: string[] = Array.from(new Set(subIssues.map(i => i.parentKey!)));

        const parentIssues = await Promise.all(
            parentKeys
                .map(async issueKey => {
                    const parent = await fetchIssue(issueKey, site);
                    // we only need the parent information here, we already have all the subtasks that satisfy the jql query
                    parent.subtasks = [];
                    return parent;
                }));

        subIssues.forEach(i => parentIssues.find(parentIssue => parentIssue.key === i.parentKey)!.subtasks.push(i));

        return parentIssues;
    }

    private async resolveEpics(allIssues: Issue[]): Promise<[Issue[], string[]]> {
        const allIssueKeys = allIssues.map(i => i.key);
        const localEpics = allIssues.filter(iss => iss.epicName && iss.epicName !== '');
        const epicChildrenWithoutParents = allIssues.filter(i => i.epicLink && !allIssueKeys.includes(i.epicLink));
        const remoteEpics = await this.fetchEpicIssues(epicChildrenWithoutParents);
        let epicChildKeys: string[] = [];

        const epics = [...localEpics, ...remoteEpics];

        if (epics.length < 1) {
            return [[], []];
        }

        let finalEpics: Issue[] = await Promise.all(
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

    private async fetchEpicIssues(childIssues: Issue[]): Promise<Issue[]> {
        if (childIssues.length < 1) {
            return [];
        }
        const site = childIssues[0].siteDetails;
        const parentKeys: string[] = Array.from(new Set(childIssues.map(i => i.epicLink!)));

        const parentIssues = await Promise.all(
            parentKeys
                .map(async issueKey => {
                    const parent = await fetchIssue(issueKey, site);
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
