import { Disposable, TreeItem, Command, EventEmitter, Event } from 'vscode';
import { Issue } from '../../jira/jiraModel';
import { IssueNode } from '../nodes/issueNode';
import { EmptyStateJiraIssueNode } from '../nodes/emptyStateJiraIssueNode';
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { Commands } from '../../commands';
import { issuesForJQL } from '../../jira/issuesForJql';
import { fetchIssue } from '../../jira/fetchIssue';
import { BaseTreeDataProvider } from '../Explorer';
import { BaseNode } from '../nodes/baseNode';

export abstract class JQLTreeDataProvider extends BaseTreeDataProvider {
    protected _disposables: Disposable[] = [];

    protected _issues: Issue[] | undefined;
    protected _jql: string | undefined;

    private _emptyState = "No issues";
    private _emptyStateCommand: Command | undefined;
    protected _onDidChangeTreeData = new EventEmitter<BaseNode>();
    public get onDidChangeTreeData(): Event<BaseNode> {
        return this._onDidChangeTreeData.event;
    }

    constructor(jql?: string, emptyState?: string, emptyStateCommand?: Command) {
        super();

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
        if (!await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
            return Promise.resolve([new EmptyStateJiraIssueNode("Please login to Jira", { command: Commands.AuthenticateJira, title: "Login to Jira" })]);
        }
        if (parent) {
            return parent.getChildren();
        }
        if (!this._jql) {
            return Promise.resolve([new EmptyStateJiraIssueNode(this._emptyState, this._emptyStateCommand)]);
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
        if (!this._jql) {
            return Promise.resolve([]);
        }

        // fetch issues matching the jql
        const newIssues = await issuesForJQL(this._jql);
        const newIssuesKeys = newIssues.map(i => i.key);

        // epics don't have children filled in and children only have a ref to the parent key
        // we need to fill in the children and fetch the parents of any orphans
        const [epics, epicChildrenKeys] = await this.resolveEpics(newIssues, newIssuesKeys);

        const subIssuesWithoutParents = newIssues.filter(i => i.parentKey && !newIssuesKeys.includes(i.parentKey));
        let remainingIssues = newIssues.filter(i => subIssuesWithoutParents.find(subIssue => subIssue.key === i.key) === undefined);
        remainingIssues = remainingIssues.filter(i => epics.find(epic => epic.key === i.key) === undefined);

        // fetch parent issues for subtasks whose parents are not covered by the jql
        const parentIssues = await this.fetchParentIssues(subIssuesWithoutParents);

        const allIssues = [...remainingIssues, ...parentIssues, ...epics];
        const allSubIssueKeys = allIssues.map(issue => issue.subtasks.map(subtask => subtask.key)).reduce((prev, curr) => prev.concat(curr), []);

        // show subtasks under parent if parent is available
        this._issues = allIssues.filter(issue => { return !allSubIssueKeys.includes(issue.key) && !epicChildrenKeys.includes(issue.key); });
        return this.nodesForIssues();
    }

    private async fetchParentIssues(subIssues: Issue[]): Promise<Issue[]> {
        const parentKeys: string[] = Array.from(new Set(subIssues.map(i => i.parentKey!)));

        const parentIssues = await Promise.all(
            parentKeys
                .map(async issueKey => {
                    const parent = await fetchIssue(issueKey);
                    // we only need the parent information here, we already have all the subtasks that satisfy the jql query
                    parent.subtasks = [];
                    return parent;
                }));

        subIssues.forEach(i => parentIssues.find(parentIssue => parentIssue.key === i.parentKey)!.subtasks.push(i));

        return parentIssues;
    }

    private async resolveEpics(allIssues: Issue[], allIssueKeys: string[]): Promise<[Issue[], string[]]> {
        const localEpics = allIssues.filter(iss => iss.epicName && iss.epicName !== '');
        const epicChildrenWithoutParents = allIssues.filter(i => i.epicLink && !allIssueKeys.includes(i.epicLink));
        const remoteEpics = await this.fetchEpicIssues(epicChildrenWithoutParents);
        let epicChildKeys: string[] = [];

        const epics = [...localEpics, ...remoteEpics];

        if (epics.length < 1) {
            return [[], []];
        }

        const epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(epics[0].workingSite);
        // note: we always have to fetch children because they might not be included in the JQL
        let finalEpics: Issue[] = await Promise.all(
            epics
                .map(async epic => {
                    if (epic.epicChildren.length < 1) {
                        let children = await issuesForJQL(`cf[${epicFieldInfo.epicLink.cfid}] = "${epic.key}" and resolution = Unresolved and statusCategory != Done order by lastViewed DESC`);
                        epic.epicChildren = children;
                    }

                    epicChildKeys.push(...epic.epicChildren.map(child => child.key));
                    return epic;
                }));

        return [finalEpics, epicChildKeys];
    }

    private async fetchEpicIssues(childIssues: Issue[]): Promise<Issue[]> {
        const parentKeys: string[] = Array.from(new Set(childIssues.map(i => i.epicLink!)));

        const parentIssues = await Promise.all(
            parentKeys
                .map(async issueKey => {
                    const parent = await fetchIssue(issueKey);
                    return parent;
                }));

        return parentIssues;
    }

    private nodesForIssues(): IssueNode[] {
        if (this._issues && this._issues.length > 0) {
            return this._issues.map((issue) => new IssueNode(issue));
        } else {
            return [new EmptyStateJiraIssueNode(this._emptyState)];
        }
    }
}
