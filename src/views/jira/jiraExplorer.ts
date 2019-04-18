import { Disposable } from 'vscode';
import { WorkingProject } from '../../config/configuration';
import { AuthProvider } from '../../atlclients/authInfo';
import { Explorer, BaseTreeDataProvider } from '../Explorer';

export interface Refreshable {
    refresh(): void;
}
export class JiraExplorer extends Explorer implements Refreshable {
    private _disposables: Disposable[] = [];

    constructor(private _id: string, dataProvider: BaseTreeDataProvider) {
        super(() => this.dispose());
        this.treeDataProvder = dataProvider;
        this.newTreeView();
    }

    viewId() {
        return this._id;
    }

    authProvider() {
        return AuthProvider.JiraCloud;
    }

    set project(project: WorkingProject) {
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
}
