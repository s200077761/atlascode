import { BaseNode } from "./baseNode";
import { Command, TreeItem, TreeItemCollapsibleState } from "vscode";

export class EmptyNode extends BaseNode {
    constructor(readonly _message: string, readonly _command?: Command) {
        super();
    }

    getTreeItem() {
        const text = this._message;
        const treeItem = new TreeItem(text, TreeItemCollapsibleState.None);
        treeItem.tooltip = text;
        treeItem.command = this._command;
        return treeItem;
    }
}