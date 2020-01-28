import { JQLTreeDataProvider } from './jqlTreeDataProvider';
import { IssueNode } from "../nodes/issueNode";
import { JQLEntry } from "src/config/model";
import { AbstractBaseNode } from '../nodes/abstractBaseNode';
import { TreeItem, TreeItemCollapsibleState, Disposable } from 'vscode';

export class CustomJQLTree extends JQLTreeDataProvider implements AbstractBaseNode {
  public readonly disposables: Disposable[] = [];

  constructor(readonly jqlEntry: JQLEntry) {
    super(undefined, "No issues match this query");
    this.setJqlEntry(this.jqlEntry);
  }

  async getChildren(parent?: IssueNode, allowFetch: boolean = true): Promise<IssueNode[]> {
    return super.getChildren(undefined, allowFetch);
  }

  async getTreeItem(): Promise<TreeItem> {
    const item = new TreeItem(this.jqlEntry.name);
    item.tooltip = this.jqlEntry.query;
    item.collapsibleState = TreeItemCollapsibleState.Collapsed;
    item.description = `[${this._issues && this._issues.length > 0 ? `${this._issues.length} Issues` : 'No Issues Found'}]`;
    return item;
  }
}
