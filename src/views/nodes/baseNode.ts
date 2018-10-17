import * as vscode from 'vscode';

// BaseNode is an abstract tree node which all other *nodes* must extend.
// It also takes care of disposables if they are added to the `disposables` field.
export abstract class BaseNode implements vscode.Disposable {
    public readonly disposables: vscode.Disposable[] = [];

    abstract getTreeItem(): vscode.TreeItem;
    abstract async getChildren(element?: BaseNode): Promise<BaseNode[]>;

    dispose() {
        if (this.disposables) {
            this.disposables.forEach(d => d.dispose());
        }
        this.getChildren().then((children: BaseNode[]) => children.forEach(child => child.dispose()));
    }
}