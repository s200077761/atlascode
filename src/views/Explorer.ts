import { Disposable, TreeViewVisibilityChangeEvent, TreeView, TreeDataProvider, window, TreeItem } from "vscode";
import { viewScreenEvent } from "../analytics";
import { Container } from "../container";
import { Product } from "../atlclients/authInfo";
import { AbstractBaseNode } from "./nodes/abstractBaseNode";
import { Project } from "../jira/jira-client/model/entities";

export abstract class Explorer extends Disposable {
    protected treeDataProvder: BaseTreeDataProvider | undefined;

    abstract viewId(): string;
    abstract product(): Product;

    protected newTreeView(): TreeView<AbstractBaseNode> | undefined {
        if (this.treeDataProvder) {
            const treeView = window.createTreeView(this.viewId(), { treeDataProvider: this.treeDataProvder });
            treeView.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
            return treeView;
        }
        return undefined;
    }

    private async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
        if (event.visible && await Container.siteManager.productHasAtLeastOneSite(this.product())) {
            viewScreenEvent(this.viewId()).then(e => { Container.analyticsClient.sendScreenEvent(e); });
        }
    }

    dispose() {
        console.log('explorer disposed');
        if (this.treeDataProvder) {
            this.treeDataProvder.dispose();
        }
    }
}

export abstract class BaseTreeDataProvider implements TreeDataProvider<AbstractBaseNode>, Disposable {
    getTreeItem(element: AbstractBaseNode): Promise<TreeItem> | TreeItem {
        return element.getTreeItem();
    }

    abstract getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]>;
    setProject(project: Project) { }

    refresh() { }
    dispose() { }
}
