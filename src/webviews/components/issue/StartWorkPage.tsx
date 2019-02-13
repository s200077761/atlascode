import * as React from "react";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { WebviewComponent } from "../WebviewComponent";
import { isStartWorkOnIssueData, StartWorkOnIssueData, isStartWorkOnIssueResult, StartWorkOnIssueResult } from "../../../ipc/issueMessaging";
import {
  emptyIssue,
  Transition,
  emptyTransition
} from "../../../jira/jiraModel";
import {
  StartWorkAction
} from "../../../ipc/issueActions";
import {TransitionMenu} from "./TransitionMenu";
import Button from "@atlaskit/button";
import { VerticalPadding, FlexCentered, BlockCentered } from '../styles';
import Select from '@atlaskit/select';
import { RepoData } from "../../../ipc/prMessaging";
import { Branch } from "../../../typings/git";

type Emit = StartWorkAction;
const emptyRepoData: RepoData = { uri: '', remotes: [], localBranches: [], remoteBranches: [] };

type State = {
  data: StartWorkOnIssueData;
  transition: Transition;
  sourceBranch?: { label: string, value: Branch },
  branchName: string;
  repo: { label: string, value: RepoData };
  isStartButtonLoading: boolean;
  result: StartWorkOnIssueResult;
};

const emptyState: State = {
  data: { type: 'update', issue: emptyIssue, repoData: [] },
  transition: emptyTransition,
  repo: { label: 'No repo found', value: emptyRepoData },
  branchName: '',
  isStartButtonLoading: false,
  result: { type: 'startWorkOnIssueResult', successMessage: undefined, error: undefined }
};

export default class StartWorkPage extends WebviewComponent<
  Emit,
  StartWorkOnIssueData,
  {},
  State
> {
  constructor(props: any) {
    super(props);
    this.state = emptyState;
  }

  public onMessageReceived(e:any) {
    console.log("got message from vscode", e);

    if(e.type && e.type === 'update' && isStartWorkOnIssueData(e)) {
      console.log("got issue data");
      if (e.issue.key.length > 0) {
        const repo = this.state.repo.value === emptyRepoData && e.repoData.length > 0 ? { label: e.repoData[0].uri.split('/').pop()!, value: e.repoData[0] } : this.state.repo;
        const transition = this.state.transition === emptyTransition ? e.issue.transitions.find(t => t.to.id === e.issue.status.id) || this.state.transition : this.state.transition;
        const branchName = this.state.branchName.trim().length === 0 ? `${e.issue.key}-${e.issue.summary.substring(0, 50).trim().toLowerCase().replace(/\W+/g, '-')}` : this.state.branchName;
        const sourceBranchValue = this.state.sourceBranch ? this.state.sourceBranch.value : repo.value.localBranches.find(b => b.name !== undefined && b.name.indexOf(repo.value.mainbranch!) !== -1) || repo.value.localBranches[0];
        const sourceBranch = sourceBranchValue === undefined ? undefined : { label: sourceBranchValue.name!, value: sourceBranchValue };

        this.setState({
          data: e,
          repo: repo,
          sourceBranch: sourceBranch,
          transition: transition,
          branchName: branchName
        });
      }
      else { // empty issue
        this.setState(emptyState);
      }

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
    this.setState({ repo: repo, sourceBranch: sourceBranchValue ? { label: sourceBranchValue.name!, value: sourceBranchValue } : undefined });
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
      repoUri: this.state.repo.value.uri,
      branchName: this.state.branchName,
      sourceBranchName: this.state.sourceBranch!.value.name!,
      transition: this.state.transition
    });
  }

  header(issue: any): any {
    return (
      <div>
        <h3>
          <FlexCentered>
            <em><p>Start work on - </p></em>
            <div className="icon-text" style={{ margin: 10 }}>
              <img src={issue.issueType.iconUrl} />
              {issue.key}
            </div>
            <p>{issue.summary}</p>
          </FlexCentered>
        </h3>
        <p>{issue.description}</p>
      </div>
    );
  }

  render() {
    const issue = this.state.data.issue;
    const repo = this.state.repo;

    if (issue.key === '') {
      return <BlockCentered><Spinner size="large" /></BlockCentered>;
    }

    return (
      <Page>
        <Grid layout="fluid">
          <GridColumn medium={8}>
            {this.header(issue)}
          </GridColumn>
          <GridColumn medium={12}>
            <h4>Transition issue</h4>
            <div style={{ margin: 10, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
              <div style={{ margin: 10 }}>
                <label>Select new status</label>
                <TransitionMenu issue={issue} isStatusButtonLoading={false} onHandleStatusChange={this.onHandleStatusChange} />
              </div>
            </div>
          </GridColumn>
          <GridColumn medium={6}>
            <h4>Set up git branch</h4>
            <div style={{ margin: 10, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
              <div style={{ margin: 10 }}>
                {this.state.data.repoData.length > 1 &&
                  <VerticalPadding>
                    <label>Repository</label>
                    <Select
                      className="ak-select-container"
                      classNamePrefix="ak-select"
                      options={this.state.data.repoData.map(repo => { return { label: repo.uri.split('/').pop(), value: repo }; })}
                      onChange={this.handleRepoChange}
                      placeholder='Loading...'
                      value={repo} />
                  </VerticalPadding>
                }
                <label>Source branch (this will be the start point for the new branch)</label>
                <Select
                  className="ak-select-container"
                  classNamePrefix="ak-select"
                  options={repo.value.localBranches.map(branch => ({ label: branch.name, value: branch }))}
                  onChange={this.handleSourceBranchChange}
                  value={this.state.sourceBranch} />
                <VerticalPadding>
                  <label>Name of the new branch to be created</label>
                  <input style={{ width: '100%', display: 'block' }} className='ak-inputField' value={this.state.branchName} onChange={this.handleBranchNameChange} />
                </VerticalPadding>
              </div>
            </div>
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
      </Page>
    );
  }
}
