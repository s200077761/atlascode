import * as React from "react";
import * as path from 'path';
import Page, { Grid, GridColumn } from "@atlaskit/page";
import PageHeader from '@atlaskit/page-header';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import { Checkbox } from '@atlaskit/checkbox';
import { CreatableSelect } from '@atlaskit/select';
import { WebviewComponent } from "../WebviewComponent";
import { isStartWorkOnIssueData, StartWorkOnIssueData, isStartWorkOnIssueResult, StartWorkOnIssueResult } from "../../../ipc/issueMessaging";
import {
  emptyIssue,
  Transition,
  emptyTransition,
  Issue,
  isIssue
} from "../../../jira/jiraModel";
import {
  StartWorkAction, OpenJiraIssueAction, CopyJiraIssueLinkAction, RefreshIssueAction
} from "../../../ipc/issueActions";
import { TransitionMenu } from "./TransitionMenu";
import Button from "@atlaskit/button";
import Select from '@atlaskit/select';
import { RepoData } from "../../../ipc/prMessaging";
import { Branch } from "../../../typings/git";
import NavItem from "./NavItem";
import { HostErrorMessage } from "../../../ipc/messaging";
import ErrorBanner from "../ErrorBanner";
import Offline from "../Offline";
import { StartWorkOnBitbucketIssueData, isStartWorkOnBitbucketIssueData } from "../../../ipc/bitbucketIssueMessaging";
import { OpenBitbucketIssueAction, CopyBitbucketIssueLink } from "../../../ipc/bitbucketIssueActions";
import { BitbucketIssue } from "../../../bitbucket/model";

type Emit = RefreshIssueAction | StartWorkAction | OpenJiraIssueAction | CopyJiraIssueLinkAction | OpenBitbucketIssueAction | CopyBitbucketIssueLink;
type Accept = StartWorkOnIssueData | StartWorkOnBitbucketIssueData | HostErrorMessage;

const emptyRepoData: RepoData = { uri: '', remotes: [], defaultReviewers: [], localBranches: [], remoteBranches: [] };

type BranchNameOption = { label: string, value: string };
type State = {
  data: StartWorkOnIssueData | StartWorkOnBitbucketIssueData;
  issueType: 'jiraIssue' | 'bitbucketIssue',
  jiraSetupEnabled: boolean;
  bitbucketSetupEnabled: boolean;
  transition: Transition;
  sourceBranch?: { label: string, value: Branch },
  prefix?: { label: string, value: string },
  localBranch?: BranchNameOption;
  branchOptions: { label: string, options: BranchNameOption[] }[],
  repo: { label: string, value: RepoData };
  remote?: { label: string, value: string };
  isStartButtonLoading: boolean;
  result: StartWorkOnIssueResult;
  isErrorBannerOpen: boolean;
  errorDetails: any;
  isOnline: boolean;
};

const emptyState: State = {
  data: { type: 'update', issue: emptyIssue, repoData: [] },
  issueType: 'jiraIssue',
  jiraSetupEnabled: true,
  bitbucketSetupEnabled: true,
  transition: emptyTransition,
  repo: { label: 'No repositories found...', value: emptyRepoData },
  localBranch: undefined,
  branchOptions: [],
  isStartButtonLoading: false,
  result: { type: 'startWorkOnIssueResult', successMessage: undefined, error: undefined },
  isErrorBannerOpen: false,
  errorDetails: undefined,
  isOnline: true
};

export default class StartWorkPage extends WebviewComponent<
  Emit,
  Accept,
  {},
  State
  > {
  constructor(props: any) {
    super(props);
    this.state = emptyState;
  }

  isEmptyRepo = (r: RepoData): boolean => r === emptyRepoData;

  createLocalBranchOption = (branchName: string): BranchNameOption => {
    return {
      label: branchName,
      value: branchName
    };
  }

  public onMessageReceived(e: any) {
    switch (e.type) {
      case 'error': {
        this.setState({ isStartButtonLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
        break;
      }
      case 'update': {
        if (isStartWorkOnIssueData(e) && e.issue.key.length > 0) {
          const repo = this.isEmptyRepo(this.state.repo.value) && e.repoData.length > 0 ? { label: path.basename(e.repoData[0].uri), value: e.repoData[0] } : this.state.repo;
          const transition = this.state.transition === emptyTransition ? e.issue.transitions.find(t => t.to.id === e.issue.status.id) || this.state.transition : this.state.transition;


          const issueType = 'jiraIssue';
          const issueId = e.issue.key;
          const issueTitle = e.issue.summary;
          this.updateState(e, issueType, repo, issueId, issueTitle, transition);
        }
        else { // empty issue
          this.setState(emptyState);
        }
        break;
      }

      case 'startWorkOnBitbucketIssueData': {
        if (isStartWorkOnBitbucketIssueData(e)) {
          let repo = this.state.repo;
          if (this.isEmptyRepo(this.state.repo.value) && e.repoData.length > 0) {
            const issueRepo = e.repoData.find(r => r.href === e.issue.repository!.links!.html!.href) || e.repoData[0];
            repo = { label: path.basename(issueRepo.uri), value: issueRepo };
          }

          const issueType = 'bitbucketIssue';
          const issueId = `issue-#${e.issue.id!.toString()}`;
          const issueTitle = e.issue.title!;
          this.updateState(e, issueType, repo, issueId, issueTitle, emptyTransition);
        }
        else { // empty issue
          this.setState(emptyState);
        }
        break;
      }

      case 'startWorkOnIssueResult': {
        if (isStartWorkOnIssueResult(e)) {
          this.setState({ isStartButtonLoading: false, result: e, isErrorBannerOpen: false, errorDetails: undefined });
        }
        break;
      }

      case 'onlineStatus': {
        let data = e.isOnline ? emptyState : this.state;
        this.setState({ ...data, ...{ isOnline: e.isOnline } });

        if (e.isOnline) {
          this.postMessage({ action: 'refreshIssue' });
        }

        break;
      }

    }

  }

  onHandleStatusChange = (item: Transition) => {
    if (isStartWorkOnIssueData(this.state.data)) {
      this.setState({
        // there must be a better way to update the transition dropdown!!
        data: { ...this.state.data, issue: { ...this.state.data.issue, status: { ...this.state.data.issue.status, id: item.to.id, name: item.to.name } } },
        transition: item
      });
    }
  }

  handleRepoChange = (repo: { label: string, value: RepoData }) => {
    const sourceBranchValue = repo!.value.localBranches.find(b => b.name !== undefined && b.name.indexOf(repo!.value.developmentBranch!) !== -1);
    this.setState({ repo: repo, sourceBranch: sourceBranchValue ? { label: sourceBranchValue.name!, value: sourceBranchValue } : undefined });
  }

  handleSourceBranchChange = (newValue: { label: string, value: Branch }) => {
    this.setState({ sourceBranch: newValue });
  }

  handleBranchNameChange = (e: any) => {
    this.setState({ localBranch: e });
  }

  handleCreateBranchOption = (e: any) => {
    const newOption = { label: e, value: e.trim() };
    this.setState({
      branchOptions: [...this.state.branchOptions, { label: 'Create new branch', options: [newOption] }],
      localBranch: newOption
    });
  }

  toggleJiraSetupEnabled = (e: any) => {
    this.setState({
      jiraSetupEnabled: e.target.checked
    });
  }

  toggleBitbucketSetupEnabled = (e: any) => {
    this.setState({
      bitbucketSetupEnabled: e.target.checked
    });
  }

  handleRemoteChange = (newValue: { label: string, value: string }) => {
    this.setState({ remote: newValue });
  }

  handleStart = () => {
    this.setState({ isStartButtonLoading: true });

    let branchName = '';
    if (this.state.localBranch) {
      const prefix = this.state.prefix ? this.state.prefix.value : '';
      branchName = prefix + this.state.localBranch.value;
    }

    this.postMessage({
      action: 'startWork',
      repoUri: this.state.repo.value.uri,
      branchName: branchName,
      sourceBranchName: this.state.sourceBranch ? this.state.sourceBranch.value.name! : '',
      remote: this.state.remote ? this.state.remote!.value : '',
      transition: this.state.transition,
      setupJira: this.state.jiraSetupEnabled,
      setupBitbucket: this.isEmptyRepo(this.state.repo.value) ? false : this.state.bitbucketSetupEnabled
    });
  }

  handleDismissError = () => {
    this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
  }

  private updateState(data: StartWorkOnIssueData | StartWorkOnBitbucketIssueData, issueType: 'jiraIssue' | 'bitbucketIssue', repo: { label: string; value: RepoData; }, issueId: string, issueTitle: string, transition: Transition) {
    const branchOptions = this.state.branchOptions.length > 0
      ? this.state.branchOptions
      : [{ label: 'Select an existing branch', options: repo.value.localBranches.filter(b => b.name!.toLowerCase().includes(issueId.toLowerCase())).map(b => this.createLocalBranchOption(b.name!)) }];
    let generatedBranchNameOption = undefined;
    const localBranch = this.state.localBranch
      ? this.state.localBranch
      : branchOptions.length > 0 && branchOptions[0].options.length > 0
        ? this.createLocalBranchOption(branchOptions[0].options[0].value)
        : generatedBranchNameOption = this.createLocalBranchOption(`${issueId}-${issueTitle.substring(0, 50).trim().toLowerCase().replace(/\W+/g, '-')}`);
    if (generatedBranchNameOption) {
      branchOptions.push({ label: 'Create a new branch', options: [generatedBranchNameOption] });
    }
    const sourceBranchValue = this.state.sourceBranch ? this.state.sourceBranch.value : repo.value.localBranches.find(b => b.name !== undefined && b.name.indexOf(repo.value.developmentBranch!) !== -1) || repo.value.localBranches[0];
    const sourceBranch = sourceBranchValue === undefined ? undefined : { label: sourceBranchValue.name!, value: sourceBranchValue };
    const remote = this.state.remote || repo.value.remotes.length === 0 ? this.state.remote : { label: repo.value.remotes[0].name, value: repo.value.remotes[0].name };
    this.setState({
      data: data,
      issueType: issueType,
      repo: repo,
      sourceBranch: sourceBranch,
      transition: transition,
      branchOptions: branchOptions,
      localBranch: localBranch,
      remote: remote,
      bitbucketSetupEnabled: this.isEmptyRepo(repo.value) ? false : this.state.bitbucketSetupEnabled,
      isErrorBannerOpen: false, errorDetails: undefined
    });
  }

  render() {
    if (isStartWorkOnIssueData(this.state.data) && this.state.data.issue.key === '' && !this.state.isErrorBannerOpen && this.state.isOnline) {
      return <div className='ac-block-centered'>waiting for data... <Spinner size="large" /></div>;
    }

    const issue = this.state.data.issue;
    const repo = this.state.repo;

    let pageHeader =
      <GridColumn medium={8}>
        <em><p>Start work on:</p></em>
      </GridColumn>;

    if (this.state.issueType === 'jiraIssue' && isIssue(issue)) {
      pageHeader = <GridColumn medium={8}>
        <em><p>Start work on:</p></em>
        <PageHeader
          actions={undefined}
          breadcrumbs={
            <BreadcrumbsStateless onExpand={() => { }}>
              {issue.parentKey &&
                <BreadcrumbsItem component={() => <NavItem text={`${issue.parentKey}`} onItemClick={() => this.postMessage({ action: 'openJiraIssue', issueOrKey: issue.parentKey! })} />} />
              }
              <BreadcrumbsItem component={() => <NavItem text={`${issue.key}`} iconUrl={issue.issueType.iconUrl} onItemClick={() => this.postMessage({ action: 'openJiraIssue', issueOrKey: issue })} onCopy={() => this.postMessage({ action: 'copyJiraIssueLink' })} />} />
            </BreadcrumbsStateless>
          }
        >
          <p>{issue.summary}</p>
        </PageHeader>
        <p dangerouslySetInnerHTML={{ __html: issue.descriptionHtml }} />
      </GridColumn>;
    }
    else if (this.state.issueType === 'bitbucketIssue') {
      const bbIssue = issue as BitbucketIssue;
      pageHeader = <GridColumn medium={8}>
        <em><p>Start work on:</p></em>
        <PageHeader
          actions={undefined}
          breadcrumbs={
            <BreadcrumbsStateless onExpand={() => { }}>
              <BreadcrumbsItem component={() => <NavItem text={bbIssue.repository!.name!} href={bbIssue.repository!.links!.html!.href} />} />
              <BreadcrumbsItem component={() => <NavItem text='Issues' href={`${bbIssue.repository!.links!.html!.href}/issues`} />} />
              <BreadcrumbsItem component={() => <NavItem text={`Issue #${bbIssue.id}`} onItemClick={() => this.postMessage({ action: 'openBitbucketIssue', issue: bbIssue })} onCopy={() => this.postMessage({ action: 'copyBitbucketIssueLink' })} />} />
            </BreadcrumbsStateless>
          }
        >
          <p>{bbIssue.title}</p>
        </PageHeader>
        <p dangerouslySetInnerHTML={{ __html: bbIssue.content!.html! }} />
      </GridColumn>;
    }

    let branchTypes: { kind: string, prefix: string }[] = [];
    if (repo.value.branchingModel && repo.value.branchingModel.branch_types) {
      branchTypes = [...repo.value.branchingModel.branch_types]
        .sort((a, b) => { return (a.kind.localeCompare(b.kind)); });
      if (branchTypes.length > 0) {
        if (!this.state.prefix) {
          this.setState({ prefix: { label: branchTypes[0].kind, value: branchTypes[0].prefix } });
        }
        branchTypes.push({ kind: "other", prefix: "" });
      }
    }

    return (
      <Page>
        <Grid>
          <GridColumn medium={8}>
            {!this.state.isOnline &&
              <Offline />
            }

            {this.state.result.successMessage &&
              <SectionMessage
                appearance="confirmation"
                title="Work Started">
                <div className='start-work-success'><p dangerouslySetInnerHTML={{ __html: this.state.result.successMessage }} /></div>
              </SectionMessage>
            }
            {this.state.isErrorBannerOpen &&
              <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
            }
          </GridColumn>
          {pageHeader}
          {this.state.issueType === 'jiraIssue' &&
            <GridColumn medium={6}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox isChecked={this.state.jiraSetupEnabled} onChange={this.toggleJiraSetupEnabled} name='setup-jira-checkbox' />
                <h4>Transition issue</h4>
              </div>
              {this.state.jiraSetupEnabled &&
                <div style={{ margin: 10, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                  <div style={{ margin: 10 }}>
                    <label>Select new status</label>
                    <TransitionMenu issue={issue as Issue} isStatusButtonLoading={false} onHandleStatusChange={this.onHandleStatusChange} />
                  </div>
                </div>
              }
            </GridColumn>
          }
          <GridColumn medium={12} />
          <GridColumn medium={6}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Checkbox isChecked={this.state.bitbucketSetupEnabled} onChange={this.toggleBitbucketSetupEnabled} name='setup-bitbucket-checkbox' />
              <h4>Set up git branch</h4>
            </div>
            {this.isEmptyRepo(this.state.repo.value) &&
              <div style={{ margin: 10, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                <div style={{ margin: 10 }}>
                  <div className='ac-vpadding'>
                    <label>Repository</label>
                    <Select
                      className="ac-select-container"
                      classNamePrefix="ac-select"
                      placeholder='No repositories found...'
                      value={repo} />
                  </div>
                </div>
              </div>
            }
            {this.state.bitbucketSetupEnabled && !this.isEmptyRepo(this.state.repo.value) &&
              <div style={{ margin: 10, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                <div style={{ margin: 10 }}>
                  {this.state.data.repoData.length > 1 &&
                    <div className='ac-vpadding'>
                      <label>Repository</label>
                      <Select
                        className="ac-select-container"
                        classNamePrefix="ac-select"
                        options={this.state.data.repoData.map(repo => { return { label: path.basename(repo.uri), value: repo }; })}
                        onChange={this.handleRepoChange}
                        placeholder='Loading...'
                        value={repo} />
                    </div>
                  }
                  {(branchTypes.length > 0) &&
                    <div className='ac-vpadding' style={{ textTransform: 'capitalize' }}>
                      <label>Type</label>
                      <CreatableSelect
                        className="ac-select-container"
                        classNamePrefix="ac-select"
                        options={branchTypes.map(bt => { return { label: bt.kind, value: bt.prefix }; })}
                        onChange={(model: any) => { this.setState({ prefix: model }); }}
                        value={this.state.prefix} />
                    </div>
                  }
                  <div className='ac-vpadding'>
                    <label>Source branch (this will be the start point for the new branch)</label>
                    <Select
                      className="ac-select-container"
                      classNamePrefix="ac-select"
                      options={repo.value.localBranches.map(branch => ({ label: branch.name, value: branch }))}
                      onChange={this.handleSourceBranchChange}
                      value={this.state.sourceBranch} />
                  </div>
                  <div className='ac-vpadding'>
                    <label>Local branch</label>
                    <div className="branch-container">
                      <div className='prefix-container'>
                        {this.state.prefix && this.state.prefix.value &&
                          <label>{this.state.prefix.value}</label>
                        }
                      </div>
                      <div className="branch-name">
                        <CreatableSelect
                          isClearable
                          className="ac-select-container"
                          classNamePrefix="ac-select"
                          onCreateOption={this.handleCreateBranchOption}
                          options={this.state.branchOptions}
                          isValidNewOption={(inputValue: any, selectValue: any, selectOptions: any[]) => {
                            if (inputValue.trim().length === 0 || selectOptions.find(option => option === inputValue) || /\s/.test(inputValue)) {
                              return false;
                            }
                            return true;
                          }}
                          onChange={this.handleBranchNameChange}
                          value={this.state.localBranch} />
                      </div>
                    </div>

                  </div>
                  {this.state.repo.value.remotes.length > 1 &&
                    <div>
                      <label>Set upstream to</label>
                      <Select
                        className="ac-select-container"
                        classNamePrefix="ac-select"
                        options={repo.value.remotes.map(remote => ({ label: remote.name, value: remote.name }))}
                        onChange={this.handleRemoteChange}
                        value={this.state.remote} />
                    </div>
                  }
                </div>
              </div>
            }
          </GridColumn>
          <GridColumn medium={12}>
            <div className='ac-vpadding'>
              {!this.state.result.successMessage && <Button className='ac-button' isLoading={this.state.isStartButtonLoading} onClick={this.handleStart}>Start</Button>}
            </div>
          </GridColumn>
        </Grid>
      </Page>
    );
  }
}
