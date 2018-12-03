import * as React from "react";
import Avatar, { AvatarItem } from "@atlaskit/avatar";
import SizeDetector from "@atlaskit/size-detector";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import { WebviewComponent } from "../WebviewComponent";
import { IssueData } from "../../../ipc/issueMessaging";
import { Action, Alert } from "../../../ipc/messaging";
import {
  emptyStatus,
  emptyIssueType,
  emptyUser,
  emptyPriority,
  Issue
} from "../../../jira/jiraModel";
import { emptyWorkingSite } from '../../../config/model';
import {
  TransitionIssueAction,
  IssueCommentAction
} from "../../../ipc/issueActions";
import {TransitionMenu} from "./TransitionMenu";
import {Comments} from "./Comments";

type Emit = TransitionIssueAction | IssueCommentAction | Action | Alert;
const emptyIssueData: IssueData = {
  type: "",
  key: "",
  id: "",
  self: "",
  description: "",
  summary: "",
  status: emptyStatus,
  priority: emptyPriority,
  issueType: emptyIssueType,
  reporter: emptyUser,
  assignee: emptyUser,
  comments: [],
  labels: [],
  attachments: [],
  transitions: [],
  workingSite: emptyWorkingSite
};

type MyState = {
  data: IssueData;
  isStatusButtonLoading: boolean;
  commentInput: string;
};

type SizeMetrics = {
  width: number;
  height: number;
};

export default class JiraIssuePage extends WebviewComponent<
  Emit,
  IssueData,
  {},
  MyState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      data: emptyIssueData,
      isStatusButtonLoading: false,
      commentInput: ""
    };
  }

  componentUpdater = (data: IssueData) => {};

  public onMessageReceived(e: IssueData) {
    console.log("got message from vscode", e);
    this.setState({ data: e, isStatusButtonLoading: false });
  }

  componentWillMount() {
    this.componentUpdater = data => {
      this.setState({data: data});
    };
  }

  handleSave = (issue: Issue, comment: string) => {
    this.postMessage({
      action: "comment",
      issue: issue,
      comment: comment
    });
    this.setState({ commentInput: "" });
  }

  onHandleStatusChange = (item: any) => {
    const transition = this.state.data.transitions.find(
      trans =>
        trans.id === item.target.parentNode.parentNode.dataset.transitionId
    );

    if (transition) {
      this.setState({ isStatusButtonLoading: true });
      this.postMessage({
        action: "transitionIssue",
        transition: transition,
        issue: this.state.data
      });
    }
  }

  header(issue: any): any {
    return (
      <div>
        <div className="icon-text" style={{ marginTop: 10 }}>
          <img src={issue.issueType.iconUrl} />
          {issue.key}
        </div>
        <h2>{issue.summary}</h2>
        <p>{issue.description}</p>
      </div>
    );
  }

  details(issue: Issue): any {

    return (
      <div>
        <h3>Status</h3>
        <TransitionMenu issue={issue} isStatusButtonLoading={this.state.isStatusButtonLoading} onHandleStatusChange={this.onHandleStatusChange} />
        <h3>Priority</h3>
        <div className="icon-text">
          <img src={issue.priority.iconUrl} />
          <span>{issue.priority.name}</span>
        </div>
        <h3>Assignee</h3>
        <AvatarItem
          avatar={<Avatar src={issue.assignee.avatarUrls["48x48"]} />}
          primaryText={issue.assignee.displayName || "Unassigned"}
        />
      </div>
    );
  }

  render() {
    const issue = this.state.data;
  
    return (
      <Page>
        <SizeDetector>
          {(size: SizeMetrics) => {
            if (size.width < 800) {
              return (
                <div>
                  {this.header(issue)}
                  {this.details(issue)}
                  <h3>Comments</h3>
                  <Comments issue={issue} onSave={this.handleSave} />
                </div>
              );
            }
            return (
              <Grid>
                <GridColumn medium={8}>
                  {this.header(issue)}
                  <h3>Comments</h3>
                  <Comments issue={issue} onSave={this.handleSave} />
                </GridColumn>
        
                <GridColumn medium={4}>{this.details(issue)}</GridColumn>
              </Grid>
            );        
          }}
        </SizeDetector>
      </Page>
    );
  }
}
