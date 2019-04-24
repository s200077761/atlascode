import { Disposable, TreeViewVisibilityChangeEvent, TreeView, TreeDataProvider, window, TreeItem } from "vscode";
import { viewScreenEvent } from "../analytics";
import { Container } from "../container";
import { AuthProvider } from "../atlclients/authInfo";
import { BaseNode } from "./nodes/baseNode";
import { WorkingProject } from "../config/model";

export abstract class Explorer extends Disposable {
    protected treeDataProvder: BaseTreeDataProvider | undefined;

    abstract viewId(): string;
    abstract authProvider(): AuthProvider;

    protected newTreeView(): TreeView<BaseNode> | undefined {
        if (this.treeDataProvder) {
            const treeView = window.createTreeView(this.viewId(), { treeDataProvider: this.treeDataProvder });
            treeView.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
            return treeView;
        }
        return undefined;
    }

    private async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.authManager.isAuthenticated(this.authProvider())) {
            viewScreenEvent(this.viewId()).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }

    dispose() {
        if (this.treeDataProvder) {
            this.treeDataProvder.dispose();
        }
    }
}

export abstract class BaseTreeDataProvider implements TreeDataProvider<BaseNode>, Disposable {
    getTreeItem(element: BaseNode): Promise<TreeItem> | TreeItem {
        return element.getTreeItem();
    }

    abstract getChildren(element?: BaseNode): Promise<BaseNode[]>;
    setProject(project: WorkingProject) { }

    refresh() { }
    dispose() { }
}
