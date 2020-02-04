import { ConfigurationChangeEvent, Disposable, Event, EventEmitter, commands, window, QuickPickItem } from "vscode";
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
import { searchIssuesEvent } from "../../analytics";

const createJiraIssueNode = new CreateJiraIssueNode();
let searchJiraIssuesNode = new SearchJiraIssuesNode();
interface QuickPickIssue extends QuickPickItem {
  issue: MinimalORIssueLink<DetailedSiteInfo>;
}

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
      commands.registerCommand(Commands.JiraSearchIssues, this.createIssueQuickPick)
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

  createIssueQuickPick() {
    searchIssuesEvent(ProductJira).then(e => { Container.analyticsClient.sendTrackEvent(e); });
    const quickPickIssues: QuickPickIssue[] = 
      searchJiraIssuesNode.getIssues()
      .map(issue => { 
        return {
          label: issue.key, 
          description: issue.summary, 
          issue: issue
        };
      }
    );
    window
      .showQuickPick<QuickPickIssue>(quickPickIssues, {
        matchOnDescription: true,
        placeHolder: 'Search for issue key or summary',
      })
      .then((quickPickIssue: QuickPickIssue | undefined) => {
        if(quickPickIssue){
          commands.executeCommand(Commands.ShowIssue, quickPickIssue.issue);
        }
      }
    );
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

    /* This both creates the _children array and executes the queries on each child. This ensures all children are initialized 
    prior to returning anything. Since executeQuery() returns an issue list for each child, we also accumulate those lists inside
    of allIssues, and then dedupe them at the end. This gives us a searchable issue list for the QuickPick */
    let allIssues: MinimalORIssueLink<DetailedSiteInfo>[] = [];
    this._children = await Promise.all(
      this._jqlList.map(async (jql: JQLEntry) => { 
          const childTree = new CustomJQLTree(jql);
          const flattenedIssueList = await childTree.executeQuery().catch(e => {
            Logger.error(new Error(`Error executing JQL: ${e}`));
            return [];
          });
          childTree.setNumIssues(flattenedIssueList.length);
          allIssues.push(...flattenedIssueList);
          return childTree;
        }
      )
    );
    allIssues = [...new Map(allIssues.map(issue => [issue.key, issue])).values()]; //dedupe
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
