import {
  TreeDataProvider,
  TreeItem,
  TreeView,
  window,
  TreeItemCollapsibleState,
  TreeViewVisibilityChangeEvent,
  Event,
  EventEmitter
} from "vscode";
import { BaseNode } from "../nodes/baseNode";
import { CustomJQLTreeId } from "../../constants";
import { CustomJQLTree } from "./customJqlTree";
import { RefreshableTree } from "./abstractIssueTree";
import { JQLEntry } from "src/config/model";
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';
import { EmptyStateNode } from "../nodes/emptyStateNode";
import { Commands } from "../../commands";

export class CustomJQLRoot
  implements TreeDataProvider<BaseNode | CustomJQLTree>, RefreshableTree {
  private _tree: TreeView<BaseNode | CustomJQLTree> | undefined;
  private _children: CustomJQLTree[];
  private _onDidChangeTreeData = new EventEmitter<BaseNode>();
  public get onDidChangeTreeData(): Event<BaseNode> {
      return this._onDidChangeTreeData.event;
  }

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

  async getChildren(element: BaseNode | CustomJQLTree | undefined) {
    if (!await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
      return Promise.resolve([new EmptyStateNode("Please login to Jira", { command: Commands.AuthenticateJira, title: "Login to Jira" })]);
    }

    if (element) {
      return element.getChildren();
    }

    return this._jqlList.map((jql: JQLEntry) => {
      const childTree = new CustomJQLTree(jql);
      this._children.push(childTree);
      return childTree;
    });
  }

  refresh() {
    this._onDidChangeTreeData.fire();
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
