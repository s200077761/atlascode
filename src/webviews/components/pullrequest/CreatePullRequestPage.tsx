import * as React from 'react';
import * as path from 'path';
import uuid from 'uuid';
import Button, { ButtonGroup } from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Panel from '@atlaskit/panel';
import { Field } from '@atlaskit/form';
import { Checkbox } from '@atlaskit/checkbox';
import { WebviewComponent } from '../WebviewComponent';
import { CreatePRData, isCreatePRData, CommitsResult, isCommitsResult, RepoData } from '../../../ipc/prMessaging';
import Select, { AsyncSelect, components } from '@atlaskit/select';
import { CreatePullRequest, FetchDetails, RefreshPullRequest, FetchIssue, FetchUsers } from '../../../ipc/prActions';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import { OpenBitbucketIssueAction } from '../../../ipc/bitbucketIssueActions';
import Commits from './Commits';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import { Remote, Branch, Ref } from '../../../typings/git';
import BranchWarning from './BranchWarning';
import CreatePRTitleSummary from './CreatePRTitleSummary';
import Avatar from "@atlaskit/avatar";
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';
import Form from '@atlaskit/form';
import ErrorBanner from '../ErrorBanner';
import Offline from '../Offline';
import { TransitionMenu } from '../issue/TransitionMenu';
import { StatusMenu } from '../bbissue/StatusMenu';
import NavItem from '../issue/NavItem';
import PMFBBanner from '../pmfBanner';
import { PMFData } from '../../../ipc/messaging';
import { Reviewer, Commit, BitbucketIssueData } from '../../../bitbucket/model';
import { MinimalIssue, Transition, isMinimalIssue } from '../../../jira/jira-client/model/entities';

const createdFromAtlascodeFooter = '\n\n---\n_Created from_ [_Atlassian for VS Code_](https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode)';

type Emit = CreatePullRequest | FetchDetails | FetchIssue | FetchUsers | RefreshPullRequest | OpenJiraIssueAction | OpenBitbucketIssueAction;
type Receive = CreatePRData | CommitsResult;

interface MyState {
    data: CreatePRData;
    title: string;
    titleManuallyEdited: boolean;
    summary: string;
    summaryManuallyEdited: boolean;
    repo?: { label: string; value: RepoData; };
    remote?: { label: string; value: Remote; };
    reviewers: Reviewer[];
    sourceBranch?: { label: string; value: Branch };
    sourceRemoteBranchName?: string;
    destinationBranch?: { label: string; value: Ref };
    pushLocalChanges: boolean;
    closeSourceBranch: boolean;
    issueSetupEnabled: boolean;
    issue?: MinimalIssue | BitbucketIssueData;
    commits: Commit[];
    isCreateButtonLoading: boolean;
    result?: string;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    isOnline: boolean;
    showPMF: boolean;
    isSomethingLoading: boolean;
}

const emptyState = {
    data: {
        type: 'createPullRequest',
        repositories: []
    },
    title: 'Pull request title',
    titleManuallyEdited: false,
    summary: createdFromAtlascodeFooter,
    summaryManuallyEdited: false,
    pushLocalChanges: true,
    closeSourceBranch: false,
    issueSetupEnabled: true,
    reviewers: [],
    commits: [],
    isCreateButtonLoading: false,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
    showPMF: false,
    isSomethingLoading: false
};

const emptyRepoData: RepoData = { uri: '', remotes: [], defaultReviewers: [], localBranches: [], remoteBranches: [], isCloud: true };
const formatOptionLabel = (option: any, { context }: any) => {
    if (context === 'menu') {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div>{option.label}</div>
                {option.value && option.value.upstream ? (
                    <div
                        style={{
                            fontSize: 12,
                            fontStyle: 'italic'
                        }}
                    >
                        <div className='ac-flex-space-between'>
                            {`tracking upstream ${option.value.upstream.remote}/${option.value.upstream.name}`}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }
    return option.label;
};

const UserOption = (props: any) => {
    return (
        <components.Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', 'align-items': 'center' }}><Avatar size='medium' borderColor='var(--vscode-dropdown-foreground)!important' src={props.data.avatarUrl} /><span style={{ marginLeft: '4px' }}>{props.data.displayName}</span></div>
        </components.Option>
    );
};

const UserValue = (props: any) => {
    return (
        <components.MultiValueLabel {...props}>
            <div ref={props.innerRef} {...props.innerProps} style={{ display: 'flex', 'align-items': 'center' }}><Avatar size='xsmall' borderColor='var(--vscode-dropdown-foreground)!important' src={props.data.avatarUrl} /><span style={{ marginLeft: '4px' }}>{props.data.displayName}</span></div>
        </components.MultiValueLabel>
    );
};

export default class CreatePullRequestPage extends WebviewComponent<Emit, Receive, {}, MyState> {
    private nonce: string;
    private userSuggestions: any[] | undefined = undefined;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    handleTitleChange = (e: any) => {
        this.setState({ titleManuallyEdited: true });
    }

    handleSummaryChange = (e: any) => {
        this.setState({ summaryManuallyEdited: true });
    }

    handleRepoChange = (newValue: { label: string, value: RepoData }) => {
        this.resetRepoAndRemoteState(
            newValue.value,
            newValue.value.remotes.find(r => r.name === 'origin') || newValue.value.remotes[0]
        );
    }

    handleRemoteChange = (newValue: { label: string, value: Remote }) => {
        this.resetRepoAndRemoteState(this.state.repo!.value, newValue.value);
    }

    resetRepoAndRemoteState = (repo: RepoData, remote: Remote) => {
        const remoteBranches = repo.remoteBranches.filter(branch => branch.remote === remote.name);

        const sourceBranch = repo.localBranches[0];
        let destinationBranch = remoteBranches[0];
        if (repo.developmentBranch) {
            const mainRemoteBranch = repo.remoteBranches.find(b => b.remote === remote.name && b.name !== undefined && b.name.indexOf(repo.developmentBranch!) !== -1);
            destinationBranch = mainRemoteBranch ? mainRemoteBranch : destinationBranch;
        }

        this.setState({
            repo: { label: path.basename(repo.uri), value: repo },
            remote: { label: remote.name, value: remote },
            reviewers: repo.defaultReviewers,
            sourceBranch: { label: sourceBranch.name!, value: sourceBranch },
            destinationBranch: { label: destinationBranch.name!, value: destinationBranch }
        }, this.handleBranchChange);
    }

    handleSourceBranchChange = (newValue: any) => {
        this.setState({ sourceBranch: newValue }, this.handleBranchChange);
    }

    handleDestinationBranchChange = (newValue: any) => {
        this.setState({ destinationBranch: newValue }, this.handleBranchChange);
    }

    handleBranchChange = () => {
        const sourceRemoteBranchName = this.state.remote && this.state.sourceBranch
            ? this.state.sourceBranch.value.upstream && this.state.sourceBranch.value.upstream.remote === this.state.remote.value.name
                ? `${this.state.remote.value.name}/${this.state.sourceBranch.value.upstream.name}`
                : `${this.state.remote.value.name}/${this.state.sourceBranch.value.name}`
            : undefined;

        let newState: Partial<MyState> = {
            commits: [],
            issue: undefined,
            sourceRemoteBranchName: sourceRemoteBranchName
        };

        if (this.state.sourceBranch && (!this.state.titleManuallyEdited || this.state.title.trim().length === 0)) {
            newState = { ...newState, title: this.state.sourceBranch!.label };
        }
        if (!this.state.summaryManuallyEdited) {
            newState = { ...newState, summary: createdFromAtlascodeFooter };
        }
        this.setState(newState as any);

        if (this.state.sourceBranch) {
            this.postMessage({
                action: 'fetchIssue',
                repoUri: this.state.repo!.value.uri,
                sourceBranch: this.state.sourceBranch.value
            });
        }

        if (this.state.repo &&
            this.state.remote &&
            this.state.sourceBranch &&
            this.state.destinationBranch &&
            this.state.sourceBranch.value !== this.state.destinationBranch.value &&
            this.state.repo.value.remoteBranches.find(remoteBranch => sourceRemoteBranchName === remoteBranch.name)) {

            this.postMessage({
                action: 'fetchDetails',
                repoUri: this.state.repo!.value.uri,
                remote: this.state.remote!.value,
                sourceBranch: this.state.sourceBranch!.value,
                destinationBranch: this.state.destinationBranch!.value
            });
        }
    }

    handlePushLocalChangesChange = (e: any) => {
        this.setState({ pushLocalChanges: e.target.checked });
    }

    handleCloseSourceBranchChange = (e: any) => {
        this.setState({ closeSourceBranch: e.target.checked });
    }

    toggleIssueSetupEnabled = (e: any) => {
        this.setState({ issueSetupEnabled: e.target.checked });
    }

    handleJiraIssueStatusChange = (item: Transition) => {
        this.setState({
            issueSetupEnabled: true,
            // there must be a better way to update the transition dropdown!!
            issue: { ...this.state.issue as MinimalIssue, status: { ...(this.state.issue as MinimalIssue).status, id: item.to.id, name: item.to.name } }
        });
    }

    handleBitbucketIssueStatusChange = (item: string) => {
        this.setState({
            issue: { ...this.state.issue, state: item } as BitbucketIssueData
        });
    }

    loadUserOptions = (input: string): Promise<any> => {
        if (!this.state.remote || !this.state.repo) {
            return Promise.resolve([]);
        }
        return new Promise(resolve => {
            this.userSuggestions = undefined;
            const nonce = uuid.v4();
            this.postMessage({ action: 'fetchUsers', nonce: nonce, query: input, remote: this.state.remote!.value });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if ((this.userSuggestions !== undefined && this.nonce === nonce) || (end - start) > 2000) {
                    if (this.userSuggestions === undefined) {
                        this.userSuggestions = [];
                    }

                    clearInterval(timer);
                    this.setState({ isSomethingLoading: false });
                    resolve(this.userSuggestions);
                }
            }, 100);
        });
    }

    handleCreatePR = (e: any) => {
        this.setState({ isCreateButtonLoading: true });
        this.postMessage({
            action: 'createPullRequest',
            repoUri: this.state.repo!.value.uri,
            remote: this.state.remote!.value,
            reviewers: e.reviewers,
            title: e.title,
            summary: e.summary,
            sourceBranch: this.state.sourceBranch!.value,
            destinationBranch: this.state.destinationBranch!.value,
            pushLocalChanges: this.state.pushLocalChanges,
            closeSourceBranch: this.state.closeSourceBranch,
            issue: this.state.issueSetupEnabled ? this.state.issue : undefined
        });
    }

    onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isCreateButtonLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'createPullRequestData': {
                if (isCreatePRData(e)) {
                    this.setState({ data: e, isCreateButtonLoading: false });

                    if (this.state.repo === undefined && e.repositories.length > 0) {
                        const firstRepo = e.repositories[0];
                        const firstRemote = firstRepo.remotes.find(r => r.name === 'origin') || firstRepo.remotes[0];
                        this.resetRepoAndRemoteState(firstRepo, firstRemote);
                    }
                }
                break;
            }
            case 'commitsResult': {
                if (isCommitsResult(e)) {
                    this.setState({
                        isCreateButtonLoading: false,
                        commits: e.commits,
                        title: e.commits.length === 1 && (!this.state.summaryManuallyEdited || this.state.summary.trim().length === 0)
                            ? e.commits[0].message!.split('\n', 1)[0]
                            : this.state.title,
                        summary: this.state.sourceBranch && (!this.state.summaryManuallyEdited || this.state.summary.trim().length === 0)
                            ? e.commits.length === 1
                                ? `${e.commits[0].message!.substring(e.commits[0].message!.indexOf('\n') + 1)}${createdFromAtlascodeFooter}`
                                : `${e.commits.map(c => `- ${c.message}`).join('\n')}${createdFromAtlascodeFooter}`
                            : this.state.summary
                    });
                }
                break;
            }
            case 'fetchIssueResult': {
                this.setState({ issue: e.issue });
                break;
            }
            case 'fetchUsersResult': {
                this.userSuggestions = e.users;
                this.nonce = e.nonce;
                break;
            }
            case 'onlineStatus': {
                this.setState({ isOnline: e.isOnline });

                if (e.isOnline && !this.state.repo) {
                    this.postMessage({ action: 'refreshPR' });
                }

                break;
            }
            case 'pmfStatus': {
                this.setState({ showPMF: e.showPMF });
                break;
            }
        }

        return true;
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    render() {

        if (!this.state.repo && !this.state.isErrorBannerOpen && this.state.isOnline) {
            return (<div>waiting for data...</div>);
        }

        const repo = this.state.repo || { label: '', value: emptyRepoData };

        const actionsContent = (
            <ButtonGroup>
                <Button className='ac-button' href={
                    repo && repo.value.href
                        ? `${repo.value.href}/pull-requests/new`
                        : `https://bitbucket.org/dashboard/overview`
                }>Create on bitbucket.org...</Button>
            </ButtonGroup>
        );

        const issueDetails = <React.Fragment>
            {this.state.issue &&
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox isChecked={this.state.issueSetupEnabled} onChange={this.toggleIssueSetupEnabled} name='setup-jira-checkbox' />

                    {isMinimalIssue(this.state.issue)
                        ? <div className='ac-flex'>
                            <h4>Transition Jira issue - </h4>
                            <NavItem text={`${this.state.issue.key} ${this.state.issue.summary}`} iconUrl={this.state.issue.issuetype.iconUrl} onItemClick={() => this.postMessage({ action: 'openJiraIssue', issueOrKey: (this.state.issue as MinimalIssue) })} />
                        </div>
                        : <div className='ac-flex'>
                            <h4>Transition Bitbucket issue - </h4>
                            <NavItem text={`#${this.state.issue.id} ${this.state.issue.title}`} onItemClick={() => this.postMessage({ action: 'openBitbucketIssue', issue: this.state.issue as BitbucketIssueData })} />
                        </div>
                    }
                </div>
            }
            {this.state.issue && this.state.issueSetupEnabled &&
                <GridColumn medium={6}>
                    <div style={{ margin: 10, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                        <div style={{ margin: 10 }}>
                            <label>Select new status</label>
                            {isMinimalIssue(this.state.issue)
                                ? <TransitionMenu transitions={(this.state.issue as MinimalIssue).transitions} currentStatus={(this.state.issue as MinimalIssue).status} isStatusButtonLoading={false} onStatusChange={this.handleJiraIssueStatusChange} />
                                : <StatusMenu issue={this.state.issue as BitbucketIssueData} isStatusButtonLoading={false} onHandleStatusChange={this.handleBitbucketIssueStatusChange} />
                            }
                        </div>
                    </div>
                </GridColumn>
            }
        </React.Fragment>;

        return (
            <div className='bitbucket-page'>
                <Page>
                    <Form
                        name="bitbucket-pullrequest-form"
                        onSubmit={(e: any) => this.handleCreatePR(e)}
                    >
                        {(frmArgs: any) => {
                            return (<form {...frmArgs.formProps}>
                                <Grid>
                                    {!this.state.isOnline &&
                                        <Offline />
                                    }
                                    {this.state.isErrorBannerOpen &&
                                        <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                                    }
                                    {this.state.showPMF &&
                                        <PMFBBanner onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
                                    }
                                    <GridColumn medium={12}>
                                        <PageHeader actions={actionsContent}>
                                            <p>Create pull request</p>
                                        </PageHeader>
                                    </GridColumn>
                                    <GridColumn medium={6}>
                                        <div style={{ marginBottom: '20px' }}>
                                            <label>Repository</label>
                                            <Select
                                                options={this.state.data.repositories.map(repo => { return { label: path.basename(repo.uri), value: repo }; })}
                                                onChange={this.handleRepoChange}
                                                placeholder='Loading...'
                                                value={repo}
                                                className="ac-select-container"
                                                classNamePrefix="ac-select" />

                                            {repo.value.remotes.length > 1 &&
                                                <React.Fragment>
                                                    <label>Remote</label>
                                                    <Select
                                                        options={repo.value.remotes.map(remote => { return { label: remote.name, value: remote }; })}
                                                        onChange={this.handleRemoteChange}
                                                        value={this.state.remote}
                                                        className="ac-select-container"
                                                        classNamePrefix="ac-select" />
                                                </React.Fragment>
                                            }
                                        </div>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <div className='ac-compare-widget-container'>
                                            <div className='ac-compare-widget'>
                                                <div className='ac-compare-widget-item'>
                                                    <div className='ac-flex'>
                                                        <Avatar src={repo.value.avatarUrl} />
                                                        <p style={{ marginLeft: '8px' }}>Source branch (local)</p>
                                                    </div>
                                                    <div className='ac-compare-widget-break' />
                                                    <div className='ac-flex-space-between'>
                                                        <div style={{ padding: '8px' }}><BitbucketBranchesIcon label='branch' size='medium' /></div>
                                                        <Select
                                                            formatOptionLabel={formatOptionLabel}
                                                            options={repo.value.localBranches.map(branch => ({ label: branch.name, value: branch }))}
                                                            onChange={this.handleSourceBranchChange}
                                                            value={this.state.sourceBranch}
                                                            className="ac-compare-widget-select-container"
                                                            classNamePrefix="ac-select" />
                                                    </div>
                                                </div>
                                            </div>
                                            <Arrow label="" size="medium" />
                                            <div className='ac-compare-widget'>
                                                <div className='ac-compare-widget-item'>
                                                    <div className='ac-flex'>
                                                        <Avatar src={repo.value.avatarUrl} />
                                                        <p style={{ marginLeft: '8px' }}>{repo.value.owner} / {repo.value.name}</p>
                                                    </div>
                                                    <div className='ac-compare-widget-break' />
                                                    <div className='ac-flex-space-between'>
                                                        <div style={{ padding: '8px' }}><BitbucketBranchesIcon label='branch' size='medium' /></div>
                                                        <Select
                                                            options={this.state.remote
                                                                ? repo.value.remoteBranches.filter(branch => branch.remote === this.state.remote!.value.name)
                                                                    .map(branch => ({ label: branch.name, value: branch }))
                                                                : []}
                                                            onChange={this.handleDestinationBranchChange}
                                                            value={this.state.destinationBranch}
                                                            className="ac-compare-widget-select-container"
                                                            classNamePrefix="ac-select" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <Checkbox
                                            label={'Push latest changes from local to remote branch'}
                                            isChecked={this.state.pushLocalChanges}
                                            onChange={this.handlePushLocalChangesChange}
                                            name="push-local-branch-enabled" />

                                        <BranchWarning sourceBranch={this.state.sourceBranch ? this.state.sourceBranch.value : undefined} sourceRemoteBranchName={this.state.sourceRemoteBranchName} remoteBranches={repo.value.remoteBranches} hasLocalChanges={repo.value.hasLocalChanges} />
                                        <CreatePRTitleSummary title={this.state.title} summary={this.state.summary} onTitleChange={this.handleTitleChange} onSummaryChange={this.handleSummaryChange} />
                                        <div className='ac-vpadding'>
                                            <Field label='Reviewers'
                                                id='reviewers'
                                                name='reviewers'
                                                defaultValue={repo.value.defaultReviewers}
                                            >
                                                {
                                                    (fieldArgs: any) => {
                                                        return (
                                                            <div>
                                                                <AsyncSelect
                                                                    {...fieldArgs.fieldProps}
                                                                    className="ac-select-container"
                                                                    classNamePrefix="ac-select"
                                                                    loadOptions={this.loadUserOptions}
                                                                    getOptionLabel={(option: any) => option.display_name}
                                                                    getOptionValue={(option: any) => option.accountId}
                                                                    placeholder={repo.value.isCloud
                                                                        ? "Start typing bitbucket username to search for reviewers"
                                                                        : "Start typing to search for reviewers"
                                                                    }
                                                                    noOptionsMessage={() => repo.value.isCloud
                                                                        ? "No options (Start typing bitbucket username to search for reviewers)"
                                                                        : "No options"
                                                                    }
                                                                    defaultOptions={repo.value.defaultReviewers}
                                                                    isMulti
                                                                    components={{ Option: UserOption, MultiValueLabel: UserValue }}
                                                                    isDisabled={this.state.isSomethingLoading}
                                                                    isLoading={this.state.isSomethingLoading} />
                                                            </div>
                                                        );
                                                    }
                                                }
                                            </Field>
                                        </div>

                                        <div className='ac-vpadding'>
                                            <Checkbox
                                                label={'Close source branch after the pull request is merged'}
                                                isChecked={this.state.closeSourceBranch}
                                                onChange={this.handleCloseSourceBranchChange}
                                                name="close-source-branch-enabled" />
                                        </div>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        {issueDetails}
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <div className='ac-vpadding'>
                                            <Button className='ac-button' type='submit' isLoading={this.state.isCreateButtonLoading}>Create pull request</Button>
                                        </div>

                                        {this.state.remote && this.state.sourceBranch && this.state.destinationBranch && this.state.commits.length > 0 &&
                                            <Panel isDefaultExpanded header={<div className='ac-flex-space-between'><h3>Commits</h3><p>{this.state.remote!.value.name}/{this.state.sourceBranch!.label} <Arrow label="" size="small" /> {this.state.destinationBranch!.label}</p></div>}>
                                                <Commits type={''} remote={this.state.remote!.value} currentBranch={''} commits={this.state.commits} />
                                            </Panel>
                                        }
                                    </GridColumn>
                                </Grid>
                            </form>);
                        }}
                    </Form>
                </Page>
            </div>
        );
    }
}