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
import { ProductJira } from '../../atlclients/authInfo';
import { SimpleJiraIssueNode } from "../nodes/simpleJiraIssueNode";
import { Commands } from "../../commands";
import { JQLEntry, SiteJQL, configuration } from "../../config/configuration";
import { BaseTreeDataProvider } from "../Explorer";
import { IssueNode } from "../nodes/issueNode";
import { Project } from "../../jira/jira-client/model/entities";

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
      Container.siteManager.onDidSitesAvailableChange(this.refresh, this),
    );

    Container.context.subscriptions.push(
      configuration.onDidChange(this.onConfigurationChanged, this)
    );
  }

  onConfigurationChanged(e: ConfigurationChangeEvent) {
    if (configuration.changed(e, 'jira.customJql') ||
      (configuration.changed(e, 'jira.explorer'))) {
      this.refresh();
    }
  }

  getTreeItem(element: AbstractBaseNode) {
    return element.getTreeItem();
  }

  async getChildren(element: IssueNode | undefined) {
    if (!await Container.siteManager.productHasAtLeastOneSite(ProductJira)) {
      return Promise.resolve([new SimpleJiraIssueNode("Please login to Jira", { command: Commands.ShowConfigPage, title: "Login to Jira", arguments: [ProductJira] })]);
    }

    if (element) {
      return element.getChildren();
    }

    if (this._children.length > 0) {
      return this._children;
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
    this._jqlList = this.customJqlForWorkingSite();
    setCommandContext(CommandContext.CustomJQLExplorer, (this._jqlList.length > 0));

    this._onDidChangeTreeData.fire();
  }

  setProject(project: Project) {
    this._onDidChangeTreeData.fire();
  }

  customJqlForWorkingSite(): JQLEntry[] {
    const siteJql = Container.config.jira.customJql.find((item: SiteJQL) => item.siteId === Container.siteManager.effectiveSite(ProductJira).id);

    const base: JQLEntry[] = [];

    if (Container.config.jira.explorer.showAssignedIssues) {
      base.push({ id: "YOURS", enabled: true, name: "Your Issues", query: Container.config.jira.explorer.assignedIssueJql });
    }

    if (Container.config.jira.explorer.showOpenIssues) {
      base.push({ id: "OPEN", enabled: true, name: "Open Issues", query: Container.config.jira.explorer.openIssueJql });
    }

    if (siteJql) {
      return base.concat(siteJql.jql.filter((jql: JQLEntry) => {
        return jql.enabled;
      }));
    }
    return base;
  }

  dispose() {
    this._disposable.dispose();
    this._children.forEach(child => child.dispose());
  }
}
