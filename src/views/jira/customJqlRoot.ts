import {
  Event,
  EventEmitter,
  Disposable,
  ConfigurationChangeEvent
} from "vscode";
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { setCommandContext, CommandContext } from "../../constants";
import { CustomJQLTree } from "./customJqlTree";
import { Container } from '../../container';
import { AuthProvider } from '../../atlclients/authInfo';
import { SimpleJiraIssueNode } from "../nodes/simpleJiraIssueNode";
import { Commands } from "../../commands";
import { JQLEntry, SiteJQL, WorkingProject, configuration } from "../../config/configuration";
import { BaseTreeDataProvider } from "../Explorer";

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
    this._jqlList = this.customJqlForWorkingSite();
    setCommandContext(CommandContext.CustomJQLExplorer, (this._jqlList.length > 0));

    this._children = [];

    this._disposable = Disposable.from(
      Container.jiraSiteManager.onDidSiteChange(this.refresh, this),
    );

    Container.context.subscriptions.push(
      configuration.onDidChange(this.onConfigurationChanged, this)
    );
  }

  onConfigurationChanged(e: ConfigurationChangeEvent) {
    if (configuration.changed(e, 'jira.customJql')) {
      this.refresh();
    }
  }

  getTreeItem(element: AbstractBaseNode) {
    return element.getTreeItem();
  }

  async getChildren(element: AbstractBaseNode | undefined) {
    if (!await Container.authManager.isAuthenticated(AuthProvider.JiraCloud)) {
      return Promise.resolve([new SimpleJiraIssueNode("Please login to Jira", { command: Commands.AuthenticateJira, title: "Login to Jira" })]);
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

  setProject(project: WorkingProject) {
    this._onDidChangeTreeData.fire();
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
    this._children.forEach(child => child.dispose());
  }
}
