import { Disposable } from 'vscode';
import { ProductJira } from '../../atlclients/authInfo';
import { Explorer, BaseTreeDataProvider } from '../Explorer';
import { CustomJQLRoot } from './customJqlRoot';
import { IssueNode } from '../nodes/issueNode';
import { MinimalORIssueLink, Project } from '../../jira/jira-client/model/entities';
import { CustomJQLTree } from './customJqlTree';

export interface Refreshable {
    refresh(): void;
}
export class JiraExplorer extends Explorer implements Refreshable {
    private _disposables: Disposable[] = [];

    constructor(private _id: string, dataProvider: CustomJQLRoot) {
        super(() => this.dispose());
        this.treeDataProvder = dataProvider;
        this.newTreeView();
    }

    viewId() {
        return this._id;
    }

    product() {
        return ProductJira;
    }

    set project(project: Project) {
        if (this.treeDataProvder) {
            this.treeDataProvder.setProject(project);
        }
    }

    refresh() {
        if (this.treeDataProvder) {
            this.treeDataProvder.refresh();
        }
    }

    dispose() {
        super.dispose();
        this._disposables.forEach(d => d.dispose());
    }

    public async findIssue(issueKey: string, jqlRoot?: BaseTreeDataProvider): Promise<MinimalORIssueLink | undefined> {
        let dp = jqlRoot;
        if (dp === undefined) {
            dp = this.treeDataProvder as CustomJQLRoot;
        }

        let issue: MinimalORIssueLink | undefined = undefined;
        if (this.treeDataProvder) {
            let dpchildren = [];

            if (dp instanceof CustomJQLTree) {
                dpchildren = await dp.getChildren(undefined, false);
            } else {
                dpchildren = await dp.getChildren(undefined);
            }

            for (let child of dpchildren) {
                if (child instanceof IssueNode) {
                    if (child.issue.key === issueKey) {
                        issue = child.issue;
                        break;
                    }
                    issue = await this.findIssueInChildren(issueKey, child);
                    if (issue !== undefined) {
                        break;
                    }
                } else if (child instanceof CustomJQLTree) {
                    issue = await this.findIssue(issueKey, child);
                    if (issue !== undefined) {
                        break;
                    }
                }
            }
        }

        return issue;
    }

    async findIssueInChildren(issueKey: string, parent: IssueNode): Promise<MinimalORIssueLink | undefined> {
        let issue: MinimalORIssueLink | undefined = undefined;
        const children = await parent.getChildren();

        for (let child of children) {
            if (child.issue.key === issueKey) {
                issue = child.issue;
                break;
            }

            issue = await this.findIssueInChildren(issueKey, child);
            if (issue !== undefined) {
                break;
            }
        }

        return issue;
    }
}
