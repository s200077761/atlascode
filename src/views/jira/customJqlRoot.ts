import {
  Event,
  EventEmitter,
  Disposable,
  ConfigurationChangeEvent
} from "vscode";
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { CustomJQLTree } from "./customJqlTree";
import { Container } from '../../container';
import { ProductJira } from '../../atlclients/authInfo';
import { SimpleJiraIssueNode } from "../nodes/simpleJiraIssueNode";
import { Commands } from "../../commands";
import { JQLEntry, configuration } from "../../config/configuration";
import { BaseTreeDataProvider } from "../Explorer";
import { IssueNode } from "../nodes/issueNode";

export class CustomJQLRoot extends BaseTreeDataProvider {

  private _disposable: Disposable;
  private _jqlList: JQLEntry[];
  private _children: CustomJQLTree[];
  private _onDidChangeTreeData = new EventEmitter<AbstractBaseNode>();
  public get onDidChangeTreeData(): Event<AbstractBaseNode> {
    return this._onDidChangeTreeData.event;
  }

  constructor() {
    super();
    this._jqlList = this.getCustomJqlSiteList();

    this._children = [];

    this._disposable = Disposable.from(
      Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
    );

    Container.context.subscriptions.push(
      configuration.onDidChange(this.onConfigurationChanged, this)
    );
  }

  onConfigurationChanged(e: ConfigurationChangeEvent) {
    if (configuration.changed(e, 'jira.jqlList') ||
      (configuration.changed(e, 'jira.explorer'))) {
      this.refresh();
    }
  }

  getTreeItem(element: AbstractBaseNode) {
    return element.getTreeItem();
  }

  async getChildren(element: IssueNode | undefined) {
    if (!Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
      return Promise.resolve([new SimpleJiraIssueNode("Please login to Jira", { command: Commands.ShowConfigPage, title: "Login to Jira", arguments: [ProductJira] })]);
    }

    if (element) {
      return element.getChildren();
    }

    if (this._children.length > 0) {
      return this._children;
    }

    if (this._jqlList.length === 0) {
      return Promise.resolve([new SimpleJiraIssueNode("Configure JQL entries in settings to view Jira issues", { command: Commands.ShowJiraIssueSettings, title: "Customize JQL settings" })]);
    }

    return this._jqlList.map((jql: JQLEntry) => {
      const childTree = new CustomJQLTree(jql);
      this._children.push(childTree);
      return childTree;
    });
  }

  refresh() {
    this._children.forEach(child => child.dispose());
    this._children = [];
    this._jqlList = this.getCustomJqlSiteList();

    this._onDidChangeTreeData.fire();
  }

  getCustomJqlSiteList(): JQLEntry[] {
    return Container.config.jira.jqlList.filter(jqlEntry => jqlEntry.enabled);
  }

  dispose() {
    this._disposable.dispose();
    this._children.forEach(child => child.dispose());
  }
}
