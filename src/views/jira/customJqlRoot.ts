import {
  TreeDataProvider,
  TreeItem,
  TreeView,
  window,
  TreeItemCollapsibleState,
  TreeViewVisibilityChangeEvent
} from "vscode";
import { BaseNode } from "../nodes/baseNode";
import { CustomJQLTreeId } from "../../constants";
import { CustomJQLTree } from "./customJqlTree";
import { RefreshableTree } from "./abstractIssueTree";
import { JQLEntry } from "src/config/model";
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';

export class CustomJQLRoot
  implements TreeDataProvider<BaseNode | CustomJQLTree>, RefreshableTree {
  private _tree: TreeView<BaseNode | CustomJQLTree> | undefined;
  private _children: CustomJQLTree[];

  constructor(private _jqlList: JQLEntry[]) {
    this._children = [];

    this._tree = window.createTreeView(CustomJQLTreeId, {
      treeDataProvider: this
    });
    this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e));
  }

  getTreeItem(element: BaseNode | CustomJQLTree) {
    if (element instanceof BaseNode) {
      return element.getTreeItem();
    } else {
      const item = new TreeItem(element.jqlEntry.name);
      item.tooltip = element.jqlEntry.query;
      item.collapsibleState = TreeItemCollapsibleState.Collapsed;
      return item;
    }
  }

  getChildren(element: BaseNode | CustomJQLTree | undefined) {
    if (!element) {
      return this._jqlList.map((jql: JQLEntry) => {
        const childTree = new CustomJQLTree(jql);
        this._children.push(childTree);
        return childTree;
      });
    } else if (element instanceof CustomJQLTree) {
      return element.getChildren(undefined);
    } else {
      return [];
    }
  }

  refresh() {
    this._children.forEach((child: CustomJQLTree) => {
      child.refresh();
    });
  }

  dispose() {
    if (this._tree) {
      this._tree.dispose();
    }
    this._children.forEach((child: CustomJQLTree) => {
      child.dispose();
    });
  }

  async onDidChangeVisibility(event: TreeViewVisibilityChangeEvent) {
    if (event.visible && await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
      viewScreenEvent(CustomJQLTreeId, Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendScreenEvent(e); });
    }
    this._children.forEach((child: CustomJQLTree) => {
      child.setVisibility(event.visible);
    });
    if (event.visible) {
      this.refresh();
    }
  }
}
