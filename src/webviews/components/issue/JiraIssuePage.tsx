import * as React from "react";
import Avatar, { AvatarItem } from "@atlaskit/avatar";
import SizeDetector from "@atlaskit/size-detector";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import PageHeader from '@atlaskit/page-header';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tag from "@atlaskit/tag";
import TagGroup from "@atlaskit/tag-group";
import { WebviewComponent } from "../WebviewComponent";
import { IssueData } from "../../../ipc/issueMessaging";
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
  IssueCommentAction,
  IssueAssignAction,
  CopyJiraIssueLinkAction,
  OpenStartWorkPageAction
} from "../../../ipc/issueActions";
import { TransitionMenu } from "./TransitionMenu";
import { Comments } from "./Comments";
import Button, { ButtonGroup } from "@atlaskit/button";
import VidRaisedHandIcon from '@atlaskit/icon/glyph/vid-raised-hand';
import IssueList from "./IssueList";
import { OpenJiraIssueAction } from "../../../ipc/issueActions";
import NavItem from "./NavItem";
import { HostErrorMessage } from "../../../ipc/messaging";
import ErrorBanner from "../ErrorBanner";
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";

type Emit = TransitionIssueAction | IssueCommentAction | IssueAssignAction | OpenJiraIssueAction | CopyJiraIssueLinkAction | OpenStartWorkPageAction;
type Accept = IssueData | HostErrorMessage;

const emptyIssueData: IssueData = {
  type: "",
  key: "",
  id: "",
  self: "",
  created: new Date(0),
  description: "",
  descriptionHtml: "",
  summary: "",
  status: emptyStatus,
  priority: emptyPriority,
  issueType: emptyIssueType,
  reporter: emptyUser,
  assignee: emptyUser,
  parentKey: undefined,
  subtasks: [],
  comments: [],
  labels: [],
  attachments: [],
  transitions: [],
  components: [],
  fixVersions: [],
  workingSite: emptyWorkingSite,
  isAssignedToMe: false,
  childIssues: [],
  workInProgress: true
};

type MyState = {
  data: IssueData;
  isStatusButtonLoading: boolean;
  commentInput: string;
  isErrorBannerOpen: boolean;
  isOnline: boolean;
  errorDetails: any;
};

type SizeMetrics = {
  width: number;
  height: number;
};

export default class JiraIssuePage extends WebviewComponent<
  Emit,
  Accept,
  {},
  MyState
  > {
  constructor(props: any) {
    super(props);
    this.state = {
      data: emptyIssueData,
      isStatusButtonLoading: false,
      commentInput: "",
      isErrorBannerOpen: false,
      isOnline: true,
      errorDetails: undefined
    };
  }

  componentUpdater = (data: IssueData) => { };

  public onMessageReceived(e: any) {
    switch (e.type) {
      case 'error': {
        this.setState({ isStatusButtonLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });

        break;
      }
      case 'update': {
        this.setState({ data: e, isStatusButtonLoading: false, isErrorBannerOpen: false, errorDetails: undefined });
        break;
      }
      case 'onlineStatus': {
        this.setState({ isOnline: e.isOnline });
        break;
      }
    }
  }

  componentWillMount() {
    this.componentUpdater = data => {
      this.setState({ data: data });
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

  handleAssign = (issue: Issue) => {
    this.postMessage({
      action: "assign",
      issue: issue
    });
  }

  onHandleStatusChange = (item: any) => {
    this.setState({ isStatusButtonLoading: true });
    this.postMessage({
      action: "transitionIssue",
      transition: item,
      issue: this.state.data
    });
  }

  handleCopyIssueLink = () => {
    this.postMessage({
      action: 'copyJiraIssueLink'
    });
  }

  handleDismissError = () => {
    this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
  }

  header(issue: any): any {
    return (
      <div>
        {this.state.isErrorBannerOpen &&
          <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
        }
        <PageHeader
          actions={<ButtonGroup>
            <Button className='ac-button' onClick={() => this.postMessage({ action: 'openStartWorkPage', issue: issue })}>Start work on issue...</Button>
          </ButtonGroup>}
          breadcrumbs={
            <BreadcrumbsStateless onExpand={() => { }}>
              {issue.parentKey &&
                <BreadcrumbsItem component={() => <NavItem text={`${issue.parentKey}`} href={`https://${issue.workingSite.name}.atlassian.net/browse/${issue.parentKey}`} />} />
              }
              <BreadcrumbsItem component={() => <NavItem text={`${issue.key}`} href={`https://${issue.workingSite.name}.atlassian.net/browse/${issue.key}`} iconUrl={issue.issueType.iconUrl} onCopy={this.handleCopyIssueLink} />} />
            </BreadcrumbsStateless>
          }>
          <p>{issue.summary}</p>
        </PageHeader>
        <p dangerouslySetInnerHTML={{ __html: issue.descriptionHtml }} />
      </div>
    );
  }

  details(issue: Issue): any {
    let components = Array.isArray(issue.components) ? issue.components.map(c => c.name) : [];
    let fixVersions = Array.isArray(issue.fixVersions) ? issue.fixVersions.map(v => v.name) : [];

    return (
      <div>
        <h3>Status</h3>
        <TransitionMenu issue={issue} isStatusButtonLoading={this.state.isStatusButtonLoading} onHandleStatusChange={this.onHandleStatusChange} />
        <h3>Priority</h3>
        <div className="ac-icon-with-text">
          <img src={issue.priority.iconUrl} />
          <span>{issue.priority.name}</span>
        </div>
        <h3>Assignee</h3>
        <AvatarItem
          avatar={<Avatar src={issue.assignee.avatarUrls["48x48"]} />}
          primaryText={issue.assignee.displayName || "Unassigned"}
        />
        {!this.state.data.isAssignedToMe && <Button appearance='subtle' onClick={() => this.handleAssign(issue)} iconBefore={<VidRaisedHandIcon label='assign-to-me' />}>Assign to me</Button>}
        <h3>Labels</h3>
        {this.tags(issue.labels)}
        <h3>Components</h3>
        {this.tags(components)}
        <h3>Fix Versions</h3>
        {this.tags(fixVersions)}
      </div>
    );
  }

  tags(items: string[]) {
    if (Array.isArray(items) && items.length === 0) {
      return <span className="no-tags">None</span>;
    }
    return (
      <TagGroup>
        {items.map(i => <Tag text={i} />)}
      </TagGroup>);
  }

  render() {
    const issue = this.state.data;

    const subtasks = (Array.isArray(this.state.data.subtasks) && this.state.data.subtasks.length === 0)
      ? <React.Fragment></React.Fragment>
      : <React.Fragment>
        <h3>Subtasks</h3>
        <IssueList issues={this.state.data.subtasks} postMessage={(e: OpenJiraIssueAction) => this.postMessage(e)} />
      </React.Fragment>;

    const childIssues = (Array.isArray(this.state.data.childIssues) && this.state.data.childIssues.length === 0)
      ? <React.Fragment></React.Fragment>
      : <React.Fragment>
        <h3>Child issues</h3>
        <IssueList issues={this.state.data.childIssues} postMessage={(e: OpenJiraIssueAction) => this.postMessage(e)} />
      </React.Fragment>;

    return (
      <Page>
        {
          !this.state.isOnline && (
            <ModalTransition>
              <Modal

                heading="Offline"
                shouldCloseOnEscapePress={false}
                shouldCloseOnOverlayClick={false}
              >
                <h1>Looks like you've gone offline.</h1>
              </Modal>
            </ModalTransition>
          )
        }
        <SizeDetector>
          {(size: SizeMetrics) => {
            if (size.width < 800) {
              return (
                <div>
                  {this.header(issue)}
                  {this.details(issue)}
                  {subtasks}
                  {childIssues}
                  <h3>Comments</h3>
                  <Comments issue={issue} onSave={this.handleSave} />
                </div>
              );
            }
            return (
              <div style={{ maxWidth: '1200px', margin: 'auto' }}>
                <Grid layout="fluid">
                  <GridColumn medium={8}>
                    {this.header(issue)}
                    {subtasks}
                    {childIssues}
                    <h3>Comments</h3>
                    <Comments issue={issue} onSave={this.handleSave} />
                  </GridColumn>

                  <GridColumn medium={4}>{this.details(issue)}</GridColumn>
                </Grid>
              </div>
            );
          }}
        </SizeDetector>
      </Page>
    );
  }
}
