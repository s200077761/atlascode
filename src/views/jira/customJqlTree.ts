import { JQLTreeDataProvider } from './jqlTreeDataProvider';
import { IssueNode } from "../nodes/issueNode";
import { JQLEntry } from "src/config/model";
import { BaseNode } from '../nodes/baseNode';
import { TreeItem, TreeItemCollapsibleState, Disposable } from 'vscode';

export class CustomJQLTree extends JQLTreeDataProvider implements BaseNode {
  public readonly disposables: Disposable[] = [];

  constructor(readonly jqlEntry: JQLEntry) {
    super(undefined, "No issues match this query");
    this.setJql(this.jqlEntry.query);
  }

  async getChildren(parent?: IssueNode): Promise<IssueNode[]> {
    return super.getChildren(undefined);
  }

  getTreeItem(): TreeItem {
    const item = new TreeItem(this.jqlEntry.name);
    item.tooltip = this.jqlEntry.query;
    item.collapsibleState = TreeItemCollapsibleState.Collapsed;
    return item;
  }
}
