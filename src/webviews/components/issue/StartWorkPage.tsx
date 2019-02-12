import * as React from "react";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { WebviewComponent } from "../WebviewComponent";
import { IssueData, isStartWorkOnIssueData, StartWorkOnIssueData, isStartWorkOnIssueResult, StartWorkOnIssueResult } from "../../../ipc/issueMessaging";
import {
  emptyStatus,
  emptyIssueType,
  emptyUser,
  emptyPriority,
  Transition,
  emptyTransition,
} from "../../../jira/jiraModel";
import { emptyWorkingSite } from '../../../config/model';
import {
  StartWorkAction
} from "../../../ipc/issueActions";
import {TransitionMenu} from "./TransitionMenu";
import Button from "@atlaskit/button";
import { VerticalPadding, SelectStyles, FlexCentered, BlockCentered } from '../styles';
import Select from '@atlaskit/select';
import { RepoData } from "../../../ipc/prMessaging";
import { Branch } from "../../../typings/git";

type Emit = StartWorkAction;
const emptyIssueData: IssueData = {
  type: "",
  key: "",
  id: "",
  self: "",
  created: new Date(0),
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
  components: [],
  fixVersions: [],
  workingSite: emptyWorkingSite,
  isAssignedToMe: false,
  childIssues: []
};
const emptyRepoData: RepoData = { uri: '', remotes: [], localBranches: [], remoteBranches: [] };

type MyState = {
  data: StartWorkOnIssueData;
  transition: Transition;
  sourceBranch?: { label: string, value: Branch },
  branchName: string;
  repo?: { label: string, value: RepoData };
  isStartButtonLoading: boolean;
  result: StartWorkOnIssueResult;
};

export default class StartWorkPage extends WebviewComponent<
  Emit,
  StartWorkOnIssueData,
  {},
  MyState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      data: {type: 'update', issue: emptyIssueData, repoData: []},
      transition: emptyTransition,
      branchName: '',
      isStartButtonLoading: false,
      result: {type: 'startWorkOnIssueResult', successMessage: undefined, error: undefined}
    };
  }

  public onMessageReceived(e:any) {
    console.log("got message from vscode", e);

    if(e.type && e.type === 'update' && isStartWorkOnIssueData(e)) {
      console.log("got issue data");
      const repo = this.state.repo === undefined && e.repoData.length > 0 ? { label: e.repoData[0].uri.split('/').pop()!, value: e.repoData[0] } : this.state.repo;
      const sourceBranchValue = this.state.sourceBranch ? this.state.sourceBranch.value : repo!.value.localBranches.find(b => b.name !== undefined && b.name.indexOf(repo!.value.mainbranch!) !== -1) || repo!.value.localBranches[0];
      const transition = this.state.transition === emptyTransition ? e.issue.transitions.find(t => t.to.id === e.issue.status.id) || this.state.transition : this.state.transition;
      const branchName = this.state.branchName.trim() === '' ? `${e.issue.key}-${e.issue.summary.substring(0, 50).trim().replace(/\W+/g, '-')}` : this.state.branchName;

      this.setState({
        data: e,
        repo: repo,
        sourceBranch: {label: sourceBranchValue.name!, value: sourceBranchValue}, 
        transition: transition,
        branchName: branchName
      });
    }
    else if (isStartWorkOnIssueResult(e)) {
      this.setState({ isStartButtonLoading: false, result: e });
    }
  }

  onHandleStatusChange = (item: any) => {
    const transition = this.state.data.issue.transitions.find(
      trans =>
        trans.id === item.target.parentNode.parentNode.dataset.transitionId
    );

    if (transition) {
      this.setState({
        // there must be a better way to update the transition dropdown!!
        data: {...this.state.data, issue: {...this.state.data.issue, status: {...this.state.data.issue.status, id: transition.to.id, name: transition.to.name}}},
        transition: transition });
    }
  }

  handleRepoChange = (repo: { label: string, value: RepoData }) => {
    const sourceBranchValue = repo!.value.localBranches.find(b => b.name !== undefined && b.name.indexOf(repo!.value.mainbranch!) !== -1);
    this.setState({ repo: repo, sourceBranch: sourceBranchValue ? { label: sourceBranchValue.name!, value: sourceBranchValue } : undefined});
  }

  handleSourceBranchChange = (newValue: { label: string, value: Branch }) => {
    this.setState({ sourceBranch: newValue });
  }

  handleBranchNameChange = (e: any) => {
    this.setState({ branchName: e.target.value });
  }

  handleStart = () => {
    this.setState({isStartButtonLoading: true});

    this.postMessage({
      action: 'startWork',
      repoUri: this.state.repo!.value.uri,
      branchName: this.state.branchName,
      sourceBranchName: this.state.sourceBranch!.value.name!,
      transition: this.state.transition
    });
  }

  header(issue: any): any {
    return (
      <div>
        <FlexCentered>
          <em><p>Start work on - </p></em>
          <div className="icon-text" style={{ margin: 10 }}>
            <img src={issue.issueType.iconUrl} />
            {issue.key}
          </div>
          <p>{issue.summary}</p>
        </FlexCentered>
        <p>{issue.description}</p>
      </div>
    );
  }

  render() {
    const issue = this.state.data.issue;
    const repo = this.state.repo || { label: '', value: emptyRepoData };

    if (issue === emptyIssueData) {
      return <BlockCentered><Spinner size="large" /></BlockCentered>;
    }

    return (
      <Page>
        <div style={{ maxWidth: '1200px', margin: 'auto' }}>
          <Grid layout="fluid">
            <GridColumn medium={8}>
              {this.header(issue)}
            </GridColumn>
            <GridColumn medium={6}>
              <VerticalPadding>
                <label>Repository</label>
                <Select
                  options={this.state.data.repoData.map(repo => { return { label: repo.uri.split('/').pop(), value: repo }; })}
                  onChange={this.handleRepoChange}
                  placeholder='Loading...'
                  value={repo}
                  styles={SelectStyles()} />
              </VerticalPadding>
            </GridColumn>
            <GridColumn medium={12} />
            <GridColumn medium={6}>
              <label>Source branch (local)</label>
              <Select
                options={repo.value.localBranches.map(branch => ({ label: branch.name, value: branch }))}
                onChange={this.handleSourceBranchChange}
                value={this.state.sourceBranch}
                styles={SelectStyles()} />
            </GridColumn>
            <GridColumn medium={12} />
            <GridColumn medium={6}>
              <VerticalPadding>
                <label>Name of the new branch to be created</label>
                <input style={{ width: '100%', display: 'block' }} className='ak-inputField' value={this.state.branchName} onChange={this.handleBranchNameChange} />
              </VerticalPadding>
              <label>New status</label>
              <TransitionMenu issue={issue} isStatusButtonLoading={false} onHandleStatusChange={this.onHandleStatusChange} />
            </GridColumn>
            <GridColumn medium={12}>
              <VerticalPadding>
                {this.state.result.successMessage
                ? <p>{this.state.result.successMessage}</p>
                : <Button className='ak-button' isLoading={this.state.isStartButtonLoading} onClick={this.handleStart}>Start</Button>
                }
              </VerticalPadding>
            </GridColumn>
            <GridColumn medium={12}>
              {this.state.result.error &&
                  <SectionMessage appearance="warning" title="Something went wrong">
                    <VerticalPadding>
                      <div style={{ color: 'black' }}>{this.state.result.error}</div>
                    </VerticalPadding>
                  </SectionMessage>
              }
            </GridColumn>
          </Grid>
        </div>
      </Page>
    );
  }
}
