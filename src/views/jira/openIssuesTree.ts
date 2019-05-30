import { JQLTreeDataProvider } from './jqlTreeDataProvider';
import { Container } from "../../container";
import { WorkingProject } from "../../config/configuration";
import { Disposable } from 'vscode';
import { WorkingProjectToken } from '../../jira/JqlWorkingProjectHelper';

export class OpenIssuesTree extends JQLTreeDataProvider {
    private _disposable: Disposable;

    constructor() {
        super(undefined, `There are no open issues for '${Container.config.jira.workingProject.name}' project in '${Container.jiraSiteManager.effectiveSite.name}' site`);

        const project = Container.config.jira.workingProject;
        this._disposable = Disposable.from(
            this._onDidChangeTreeData,
        );
        this.setJql(this.jqlForProject(project.id));
    }

    dispose() {
        this._disposable.dispose();
    }

    public setProject(project: WorkingProject) {
        super.setProject(project);
        this.setEmptyState(`You have no open issues for '${project.name}' project in '${Container.jiraSiteManager.effectiveSite.name}' site`);
        this.setJql(this.jqlForProject(project.id));
        this._onDidChangeTreeData.fire();
    }

    private jqlForProject(project?: string): string {
        return project
            ? `assignee in (EMPTY) and project=${WorkingProjectToken} and resolution = Unresolved and statusCategory != Done order by lastViewed DESC`
            : 'assignee in (EMPTY) and resolution = Unresolved and statusCategory != Done order by lastViewed DESC';
    }
}
