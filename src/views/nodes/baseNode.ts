import { Disposable, TreeItem } from 'vscode';

// BaseNode is an abstract tree node which all other *nodes* must extend.
// It also takes care of disposables if they are added to the `disposables` field.
export abstract class BaseNode implements Disposable {
    public readonly disposables: Disposable[] = [];

    abstract getTreeItem(): Promise<TreeItem> | TreeItem ;
    abstract async getChildren(element?: BaseNode): Promise<BaseNode[]>;

    dispose() {
        if (this.disposables) {
            this.disposables.forEach(d => d.dispose());
        }
        this.getChildren().then((children: BaseNode[]) => children.forEach(child => child.dispose()));
    }
}