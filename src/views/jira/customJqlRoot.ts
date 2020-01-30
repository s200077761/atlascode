import { ConfigurationChangeEvent, Disposable, Event, EventEmitter, commands, window } from "vscode";
import { ProductJira, DetailedSiteInfo } from '../../atlclients/authInfo';
import { Commands } from "../../commands";
import { configuration, JQLEntry } from "../../config/configuration";
import { Container } from '../../container';
import { BaseTreeDataProvider } from "../Explorer";
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { IssueNode } from "../nodes/issueNode";
import { SimpleJiraIssueNode } from "../nodes/simpleJiraIssueNode";
import { CustomJQLTree } from "./customJqlTree";
import { CreateJiraIssueNode } from './headerNode';
import { Logger } from "../../logger";
import { SearchJiraIssuesNode } from './searchJiraIssueNode';
import { MinimalORIssueLink } from "@atlassianlabs/jira-pi-common-models";

const createJiraIssueNode = new CreateJiraIssueNode();
let searchJiraIssuesNode = new SearchJiraIssuesNode();

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
      Container.jqlManager.onDidJQLChange(this.refresh, this),
      commands.registerCommand(Commands.JiraSearchIssues, () => {
        window
            .showQuickPick(searchJiraIssuesNode.getKeysAndSummary())
            .then((keyAndSummary: string) => {
              commands.executeCommand(Commands.ShowIssue, searchJiraIssuesNode.getIssueForKeyAndSummary(keyAndSummary));
        });
      })
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

    //This both creates the _children array and executes the queries on each child. This ensures all children are initialized prior to returning anything.
    this._children = await Promise.all(
      this._jqlList.map(async (jql: JQLEntry) => { 
          const childTree = new CustomJQLTree(jql);
          await childTree.executeQuery().catch(e => Logger.error(new Error(`Error executing JQL: ${e}`)));
          return childTree;
        }
      )
    );

    //Convert the child nodes into lists of all the issues they contain, and then concat that all into one list
    const allIssues = this._children.reduce(
      (allIssues: MinimalORIssueLink<DetailedSiteInfo>[], issueNode: CustomJQLTree) => 
        allIssues.concat(issueNode.getSearchableList())
      , []);
    searchJiraIssuesNode.setIssues(allIssues);

    return [createJiraIssueNode, searchJiraIssuesNode, ...this._children];
  }

  refresh() {
    this._children.forEach(child => child.dispose());
    this._children = [];
    this._jqlList = this.getCustomJqlSiteList();

    this._onDidChangeTreeData.fire();
  }

  getCustomJqlSiteList(): JQLEntry[] {
    return Container.jqlManager.enabledJQLEntries();
  }

  dispose() {
    this._disposable.dispose();
    this._children.forEach(child => child.dispose());
  }
}
