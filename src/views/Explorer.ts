import { Project } from '@atlassianlabs/jira-pi-common-models/entities';
import { Disposable, TreeDataProvider, TreeItem, TreeView, TreeViewVisibilityChangeEvent, window } from 'vscode';
import { viewScreenEvent } from '../analytics';
import { Product } from '../atlclients/authInfo';
import { Container } from '../container';
import { AbstractBaseNode } from './nodes/abstractBaseNode';

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
        if (event.visible && Container.siteManager.productHasAtLeastOneSite(this.product())) {
            viewScreenEvent(this.viewId(), undefined, this.product()).then(e => {
                Container.analyticsClient.sendScreenEvent(e);
            });
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
    setProject(project: Project) {}

    refresh() {}
    dispose() {}
}
