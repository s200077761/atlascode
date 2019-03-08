import {
  TreeDataProvider,
  TreeItem,
  TreeView,
  window,
  TreeItemCollapsibleState,
  TreeViewVisibilityChangeEvent,
  Event,
  EventEmitter,
  Disposable,
  ConfigurationChangeEvent
} from "vscode";
import { BaseNode } from "../nodes/baseNode";
import { CustomJQLTreeId, setCommandContext, CommandContext } from "../../constants";
import { CustomJQLTree } from "./customJqlTree";
import { RefreshableTree } from "./abstractIssueTree";
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { viewScreenEvent } from '../../analytics';
import { EmptyStateNode } from "../nodes/emptyStateNode";
import { Commands } from "../../commands";
import { JQLEntry, SiteJQL, configuration } from "../../config/configuration";

export class CustomJQLRoot
  implements TreeDataProvider<BaseNode | CustomJQLTree>, RefreshableTree {

  private _disposable: Disposable;
  private _jqlList: JQLEntry[];
  private _tree: TreeView<BaseNode | CustomJQLTree> | undefined;
  private _children: CustomJQLTree[];
  private _onDidChangeTreeData = new EventEmitter<BaseNode>();
  public get onDidChangeTreeData(): Event<BaseNode> {
    return this._onDidChangeTreeData.event;
  }

  constructor() {
    this._jqlList = this.customJqlForWorkingSite();
    setCommandContext(CommandContext.CustomJQLExplorer, (this._jqlList.length > 0));

    this._children = [];

    this._tree = window.createTreeView(CustomJQLTreeId, {
      treeDataProvider: this
    });

    this._disposable = Disposable.from(
      this._tree.onDidChangeVisibility(e => this.onDidChangeVisibility(e)),
      Container.jiraSiteManager.onDidSiteChange(this.refresh, this),
      configuration.onDidChange(this.handleConfigurationChange, this)
    );
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
    this._jqlList = this.customJqlForWorkingSite();
    setCommandContext(CommandContext.CustomJQLExplorer, (this._jqlList.length > 0));

    this._onDidChangeTreeData.fire();
  }

  handleConfigurationChange(e: ConfigurationChangeEvent) {
    if (configuration.changed(e, 'jira.workingSite') || configuration.changed(e, 'jira.customJql')) {
      this.refresh();
    }
  }

  customJqlForWorkingSite(): JQLEntry[] {
    const siteJql = Container.config.jira.customJql.find((item: SiteJQL) => item.siteId === Container.jiraSiteManager.effectiveSite.id);

    if (siteJql) {
      return siteJql.jql.filter((jql: JQLEntry) => {
        return jql.enabled;
      });
    }
    return [];
  }

  dispose() {
    this._disposable.dispose();
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
