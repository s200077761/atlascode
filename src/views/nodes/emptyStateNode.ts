import * as vscode from 'vscode';
import { BaseNode } from "./baseNode";

export class EmptyStateNode extends BaseNode {
    constructor(private text: string) {
        super();
    }

    getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem(this.text, vscode.TreeItemCollapsibleState.None);
    }

    async getChildren(element?: BaseNode): Promise<BaseNode[]> {
        return [];
    }
}