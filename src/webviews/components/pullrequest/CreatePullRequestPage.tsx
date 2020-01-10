import Avatar from "@atlaskit/avatar";
import Button, { ButtonGroup } from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import Form, { CheckboxField, Field } from '@atlaskit/form';
import Arrow from '@atlaskit/icon/glyph/arrow-right';
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Panel from '@atlaskit/panel';
import Select, { AsyncSelect, components } from '@atlaskit/select';
import { isMinimalIssue, MinimalIssue, Transition } from "@atlassianlabs/jira-pi-common-models/entities";
import path from 'path';
import React from 'react';
import uuid from 'uuid';
import { DetailedSiteInfo } from "../../../atlclients/authInfo";
import { BitbucketIssue, BitbucketIssueData, Commit, emptyBitbucketSite, FileDiff, SiteRemote, User } from '../../../bitbucket/model';
import { OpenBitbucketIssueAction, UpdateDiffAction } from '../../../ipc/bitbucketIssueActions';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import { PMFData } from '../../../ipc/messaging';
import { CreatePullRequest, FetchDefaultReviewers, FetchDetails, FetchIssue, FetchUsers, OpenDiffPreviewAction, RefreshPullRequest } from '../../../ipc/prActions';
import { CommitsResult, CreatePRData, DiffResult, isCommitsResult, isCreatePRData, isDiffResult, RepoData } from '../../../ipc/prMessaging';
import { Branch, Ref } from '../../../typings/git';
import { ConnectionTimeout } from "../../../util/time";
import { AtlLoader } from '../AtlLoader';
import { StatusMenu } from '../bbissue/StatusMenu';
import ErrorBanner from '../ErrorBanner';
import NavItem from '../issue/NavItem';
import { TransitionMenu } from '../issue/TransitionMenu';
import Offline from '../Offline';
import PMFBBanner from '../pmfBanner';
import { WebviewComponent } from '../WebviewComponent';
import { BranchWarning } from './BranchWarning';
import { Commits } from './Commits';
import { CreatePRTitleSummary } from './CreatePRTitleSummary';
import DiffList from './DiffList';

type Emit = CreatePullRequest | FetchDetails | FetchIssue | FetchUsers | FetchDefaultReviewers | RefreshPullRequest | OpenJiraIssueAction | OpenBitbucketIssueAction | UpdateDiffAction | OpenDiffPreviewAction;
type Receive = CreatePRData | CommitsResult | DiffResult;

interface MyState {
    data: CreatePRData;
    repo: RepoData;
    sourceSiteRemote: SiteRemote;
    destinationSiteRemote: SiteRemote;
    defaultReviewers: User[];
    sourceBranch?: Branch;
    sourceRemoteBranchName?: string;
    destinationBranch?: Ref;
    issueSetupEnabled: boolean;
    issue?: MinimalIssue<DetailedSiteInfo> | BitbucketIssue;
    commits: Commit[];
    isCreateButtonLoading: boolean;
    fileDiffs: FileDiff[];
    fileDiffsLoading: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    isOnline: boolean;
    showPMF: boolean;
    isSomethingLoading: boolean;
}

const emptyRepoData: RepoData = { workspaceRepo: { rootUri: '', mainSiteRemote: { site: emptyBitbucketSite, remote: { name: '', isReadOnly: true } }, siteRemotes: [] }, localBranches: [], remoteBranches: [], branchTypes: [], isCloud: true };

const emptyState = {
    data: {
        type: 'createPullRequest',
        repositories: []
    },
    repo: emptyRepoData,
    sourceSiteRemote: emptyRepoData.workspaceRepo.mainSiteRemote,
    destinationSiteRemote: emptyRepoData.workspaceRepo.mainSiteRemote,
    issueSetupEnabled: true,
    defaultReviewers: [],
    commits: [],
    isCreateButtonLoading: false,
    fileDiffs: [],
    fileDiffsLoading: false,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
    showPMF: false,
    isSomethingLoading: false
};

const UserOption = (props: any) => {
    return (
        <components.Option {...props}>
            <div ref={props.innerRef} {...props.innerProps} className='ac-flex'><Avatar size='medium' borderColor='var(--vscode-dropdown-foreground)!important' src={props.data.avatarUrl} /><span style={{ marginLeft: '4px' }}>{props.data.displayName}</span></div>
        </components.Option>
    );
};

const UserValue = (props: any) => {
    return (
        <components.MultiValueLabel {...props}>
            <div ref={props.innerRef} {...props.innerProps} className='ac-flex'><Avatar size='xsmall' borderColor='var(--vscode-dropdown-foreground)!important' src={props.data.avatarUrl} /><span style={{ marginLeft: '4px' }}>{props.data.displayName}</span></div>
        </components.MultiValueLabel>
    );
};

export default class CreatePullRequestPage extends WebviewComponent<Emit, Receive, {}, MyState> {
    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    handleRepoChange = (newValue: RepoData) => {
        this.resetRepoAndRemoteState(
            newValue,
            newValue.workspaceRepo.mainSiteRemote,
            newValue.workspaceRepo.mainSiteRemote
        );
    };

    handleSourceRemoteChange = (newValue: SiteRemote) => {
        this.resetRepoAndRemoteState(this.state.repo, newValue, this.state.destinationSiteRemote);
    };

    handleDestinationRemoteChange = (newValue: SiteRemote) => {
        this.resetRepoAndRemoteState(this.state.repo, this.state.sourceSiteRemote, newValue);
    };

    resetRepoAndRemoteState = (repo: RepoData, sourceSiteRemote: SiteRemote, destinationSiteRemote: SiteRemote) => {
        const remoteBranches = repo.remoteBranches.filter(branch => branch.remote === destinationSiteRemote.remote.name);

        const sourceBranch = repo.localBranches[0];
        let destinationBranch = remoteBranches[0];
        if (repo.developmentBranch) {
            const mainRemoteBranch = repo.remoteBranches.find(b => b.remote === destinationSiteRemote.remote.name && b.name !== undefined && b.name.indexOf(repo.developmentBranch!) !== -1);
            destinationBranch = mainRemoteBranch ? mainRemoteBranch : destinationBranch;
        }

        this.setState({
            repo: repo,
            sourceSiteRemote: sourceSiteRemote,
            destinationSiteRemote: destinationSiteRemote,
            sourceBranch: sourceBranch,
            destinationBranch: destinationBranch
        }, this.handleBranchChange);
    };

    handleSourceBranchChange = (newValue: any) => {
        this.setState({ sourceBranch: newValue }, this.handleBranchChange);
    };

    handleDestinationBranchChange = (newValue: any) => {
        this.setState({ destinationBranch: newValue }, this.handleBranchChange);
    };

    openDiffViewForFile = (fileDiff: FileDiff) => {
        this.postMessage(
            {
                action: 'openDiffPreview',
                lhsQuery: fileDiff.lhsQueryParams!,
                rhsQuery: fileDiff.rhsQueryParams!,
                fileDisplayName: fileDiff.file
            }
        );
    };

    handleBranchChange = () => {
        const sourceRemoteBranchName = this.state.sourceBranch
            ? this.state.sourceBranch.upstream && this.state.sourceBranch.upstream.remote === this.state.sourceSiteRemote.remote.name
                ? `${this.state.sourceSiteRemote.remote.name}/${this.state.sourceBranch.upstream.name}`
                : `${this.state.sourceSiteRemote.remote.name}/${this.state.sourceBranch.name}`
            : undefined;

        let newState: Partial<MyState> = {
            commits: [],
            defaultReviewers: [],
            issue: undefined,
            sourceRemoteBranchName: sourceRemoteBranchName
        };

        this.setState(newState as any);

        if (this.state.sourceBranch) {
            this.postMessage({
                action: 'fetchIssue',
                repoUri: this.state.repo.workspaceRepo.rootUri,
                sourceBranch: this.state.sourceBranch
            });
        }

        this.postMessage({ action: 'fetchDefaultReviewers', site: this.state.destinationSiteRemote.site! });

        this.setState({ fileDiffsLoading: true, fileDiffs: [] }); //Activates spinner for file diff panel and resets data
        if (this.state.repo && this.state.sourceBranch && this.state.destinationBranch && this.state.sourceBranch !== this.state.destinationBranch) {
            this.postMessage(
                {
                    action: 'updateDiff',
                    repoData: this.state.repo,
                    sourceBranch: this.state.sourceBranch!,
                    destinationBranch: this.state.destinationBranch!
                }
            );

            if (this.state.destinationSiteRemote && this.state.repo.remoteBranches.find(remoteBranch => sourceRemoteBranchName === remoteBranch.name)) {
                this.postMessage({
                    action: 'fetchDetails',
                    site: this.state.destinationSiteRemote.site!,
                    sourceBranch: this.state.sourceBranch!,
                    destinationBranch: this.state.destinationBranch!
                });
            }
        } else {
            this.setState({ fileDiffsLoading: false, fileDiffs: [] });
        }
    };

    toggleIssueSetupEnabled = (e: any) => {
        this.setState({ issueSetupEnabled: e.target.checked });
    };

    handleJiraIssueStatusChange = (item: Transition) => {
        this.setState({
            issueSetupEnabled: true,
            // there must be a better way to update the transition dropdown!!
            issue: { ...this.state.issue as MinimalIssue<DetailedSiteInfo>, status: { ...(this.state.issue as MinimalIssue<DetailedSiteInfo>).status, id: item.to.id, name: item.to.name } }
        });
    };

    handleBitbucketIssueStatusChange = (item: string) => {
        const issue = this.state.issue as BitbucketIssue;
        const newIssueData = { ...issue.data, state: item };
        this.setState({
            issue: { ...issue, data: newIssueData }
        });
    };

    loadUserOptions = (input: string): Promise<any> => {
        if (!this.state.destinationSiteRemote || !this.state.repo) {
            return Promise.resolve([]);
        }
        return new Promise(resolve => {
            const nonce = uuid.v4();
            (async () => {
                const result = await this.postMessageWithEventPromise(
                    { action: 'fetchUsers', query: input, site: this.state.destinationSiteRemote.site!, nonce: nonce },
                    'fetchUsersResult',
                    ConnectionTimeout,
                    nonce
                );
                resolve(result.users);
            })();
        });
    };

    handleCreatePR = (e: any) => {
        this.setState({ isCreateButtonLoading: true });
        this.postMessage({
            action: 'createPullRequest',
            workspaceRepo: this.state.repo.workspaceRepo,
            destinationSite: this.state.destinationSiteRemote.site!,
            reviewers: e.reviewers || [],
            title: e.title,
            summary: e.summary,
            sourceSiteRemote: this.state.sourceSiteRemote,
            sourceBranch: this.state.sourceBranch!,
            destinationBranch: this.state.destinationBranch!,
            pushLocalChanges: e.pushLocalChanges,
            closeSourceBranch: e.closeSourceBranch,
            issue: this.state.issueSetupEnabled ? this.state.issue : undefined
        });
    };

    onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isCreateButtonLoading: false, fileDiffsLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'createPullRequestData': {
                if (isCreatePRData(e)) {
                    this.setState({ data: e, isCreateButtonLoading: false });

                    if (this.state.repo === emptyRepoData && e.repositories.length > 0) {
                        const firstRepo = e.repositories[0];
                        this.resetRepoAndRemoteState(firstRepo, firstRepo.workspaceRepo.mainSiteRemote, firstRepo.workspaceRepo.mainSiteRemote);
                    }
                }
                break;
            }
            case 'commitsResult': {
                if (isCommitsResult(e)) {
                    this.setState({
                        isCreateButtonLoading: false,
                        commits: e.commits
                    });
                }
                break;
            }
            case 'fetchDefaultReviewersResult': {
                this.setState({
                    defaultReviewers: e.users
                });
                break;
            }
            case 'diffResult': {
                if (isDiffResult(e)) {
                    this.setState({
                        fileDiffs: e.fileDiffs,
                        fileDiffsLoading: false
                    });
                }
                break;
            }
            case 'fetchIssueResult': {
                this.setState({ issue: e.issue });
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

    diffPanelHeader = () => {
        return <h3>
            Files Changed {this.state.fileDiffsLoading ? '' : `(${this.state.fileDiffs.length})`}
        </h3>;
    };

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    render() {
        if (this.state.repo === emptyRepoData && !this.state.isErrorBannerOpen && this.state.isOnline) {
            this.postMessage({ action: 'refreshPR' });
            return <AtlLoader />;
        }

        const repo = this.state.repo;

        let externalUrl = 'https://bitbucket.org/dashboard/overview';
        if (repo.href) {
            externalUrl = repo.isCloud
                ? `${repo.href}/pull-requests/new`
                : `${repo.href}/pull-requests?create`;
        }
        const actionsContent = (
            <ButtonGroup>
                <Button className='ac-button' href={externalUrl}>Create in browser...</Button>
            </ButtonGroup>
        );

        const issueDetails = <React.Fragment>
            {this.state.issue &&
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Checkbox isChecked={this.state.issueSetupEnabled} onChange={this.toggleIssueSetupEnabled} name='setup-jira-checkbox' />

                    {isMinimalIssue(this.state.issue)
                        ? <div className='ac-flex'>
                            <h4>Transition Jira issue - </h4>
                            <NavItem text={`${this.state.issue.key} ${this.state.issue.summary}`} iconUrl={this.state.issue.issuetype.iconUrl} onItemClick={() => this.postMessage({ action: 'openJiraIssue', issueOrKey: (this.state.issue as MinimalIssue<DetailedSiteInfo>) })} />
                        </div>
                        : <div className='ac-flex'>
                            <h4>Transition Bitbucket issue - </h4>
                            <NavItem text={`#${this.state.issue.data.id} ${this.state.issue.data.title}`} onItemClick={() => this.postMessage({ action: 'openBitbucketIssue', issue: this.state.issue as BitbucketIssueData })} />
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
                                ? <TransitionMenu transitions={(this.state.issue as MinimalIssue<DetailedSiteInfo>).transitions} currentStatus={(this.state.issue as MinimalIssue<DetailedSiteInfo>).status} isStatusButtonLoading={false} onStatusChange={this.handleJiraIssueStatusChange} />
                                : <StatusMenu issueData={this.state.issue.data} isStatusButtonLoading={false} onHandleStatusChange={this.handleBitbucketIssueStatusChange} />
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
                                        <PMFBBanner onPMFOpen={() => this.onPMFOpen()} onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
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
                                                options={this.state.data.repositories}
                                                getOptionLabel={(repo: RepoData) => path.basename(repo.workspaceRepo.rootUri)}
                                                getOptionValue={(repo: RepoData) => repo}
                                                onChange={this.handleRepoChange}
                                                placeholder='Loading...'
                                                value={repo}
                                                className="ac-select-container"
                                                classNamePrefix="ac-select" />
                                        </div>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <div className='ac-compare-widget-container'>
                                            <div className='ac-compare-widget'>
                                                <div className='ac-compare-widget-item'>
                                                    <div className='ac-flex'>
                                                        <Avatar src={repo.avatarUrl} />
                                                        <p style={{ marginLeft: '8px' }}>Source branch (local)</p>
                                                    </div>
                                                    <div className='ac-compare-widget-break' />
                                                    {repo.workspaceRepo.siteRemotes.length > 1 &&
                                                        <div className='ac-flex-space-between'>
                                                            <div style={{ padding: '8px' }}><BitbucketBranchesIcon label='branch' size='medium' /></div>
                                                            <Select
                                                                options={repo.workspaceRepo.siteRemotes.filter(r => !r.remote.name.endsWith('(parent repo)'))}
                                                                getOptionLabel={(s: SiteRemote) => s.remote.name}
                                                                getOptionValue={(s: SiteRemote) => s}
                                                                onChange={this.handleSourceRemoteChange}
                                                                value={this.state.sourceSiteRemote}
                                                                className="ac-compare-widget-select-container"
                                                                classNamePrefix="ac-select" />
                                                        </div>
                                                    }
                                                    <div className='ac-compare-widget-break' />
                                                    <div className='ac-flex-space-between'>
                                                        <div style={{ padding: '8px' }}><BitbucketBranchesIcon label='branch' size='medium' /></div>
                                                        <Select
                                                            options={repo.localBranches}
                                                            getOptionLabel={(branch: Branch) => branch.name}
                                                            getOptionValue={(branch: Branch) => branch}
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
                                                        <Avatar src={repo.avatarUrl} />
                                                        <p style={{ marginLeft: '8px' }}>{this.state.destinationSiteRemote ? `${this.state.destinationSiteRemote.site!.ownerSlug} / ${this.state.destinationSiteRemote.site!.repoSlug}` : 'No bitbucket remotes found'}</p>
                                                    </div>
                                                    <div className='ac-compare-widget-break' />
                                                    {repo.workspaceRepo.siteRemotes.length > 1 &&
                                                        <div className='ac-flex-space-between'>
                                                            <div style={{ padding: '8px' }}><BitbucketBranchesIcon label='branch' size='medium' /></div>
                                                            <Select
                                                                options={repo.workspaceRepo.siteRemotes}
                                                                getOptionLabel={(s: SiteRemote) => s.remote.name}
                                                                getOptionValue={(s: SiteRemote) => s}
                                                                onChange={this.handleDestinationRemoteChange}
                                                                value={this.state.destinationSiteRemote}
                                                                className="ac-compare-widget-select-container"
                                                                classNamePrefix="ac-select" />
                                                        </div>
                                                    }
                                                    <div className='ac-compare-widget-break' />
                                                    <div className='ac-flex-space-between'>
                                                        <div style={{ padding: '8px' }}><BitbucketBranchesIcon label='branch' size='medium' /></div>
                                                        <Select
                                                            options={repo.remoteBranches.filter(branch => branch.remote === this.state.destinationSiteRemote.remote.name)}
                                                            getOptionLabel={(branch: Branch) => branch.name}
                                                            getOptionValue={(branch: Branch) => branch}
                                                            onChange={this.handleDestinationBranchChange}
                                                            value={this.state.destinationBranch}
                                                            className="ac-compare-widget-select-container"
                                                            classNamePrefix="ac-select" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <CheckboxField
                                            name='pushLocalChanges'
                                            id='pushLocalChanges'
                                            defaultIsChecked>
                                            {
                                                (fieldArgs: any) => {
                                                    return (
                                                        <Checkbox {...fieldArgs.fieldProps}
                                                            label='Push latest changes from local to remote branch'
                                                        />
                                                    );
                                                }
                                            }
                                        </CheckboxField>

                                        <BranchWarning sourceBranch={this.state.sourceBranch ? this.state.sourceBranch : undefined} sourceRemoteBranchName={this.state.sourceRemoteBranchName} remoteBranches={repo.remoteBranches} hasLocalChanges={repo.hasLocalChanges} />
                                        <CreatePRTitleSummary sourceBranchName={this.state.sourceBranch?.name ?? ''} commits={this.state.commits} />
                                        <div className='ac-vpadding'>
                                            <Field label='Reviewers'
                                                id='reviewers'
                                                name='reviewers'
                                                defaultValue={this.state.defaultReviewers}
                                            >
                                                {
                                                    (fieldArgs: any) => {
                                                        return (
                                                            <AsyncSelect
                                                                {...fieldArgs.fieldProps}
                                                                className="ac-select-container"
                                                                classNamePrefix="ac-select"
                                                                loadOptions={this.loadUserOptions}
                                                                getOptionLabel={(option: any) => option.displayName}
                                                                getOptionValue={(option: any) => option.accountId}
                                                                placeholder={repo.isCloud
                                                                    ? "Enter the user's full name (partial matches are not supported)"
                                                                    : "Start typing to search for reviewers"
                                                                }
                                                                noOptionsMessage={() => repo.isCloud
                                                                    ? "No results (enter the user's full name; partial matches are not supported)"
                                                                    : "No results"
                                                                }
                                                                defaultOptions={this.state.defaultReviewers}
                                                                isMulti
                                                                components={{ Option: UserOption, MultiValueLabel: UserValue }}
                                                                isDisabled={this.state.isSomethingLoading}
                                                                isLoading={this.state.isSomethingLoading} />
                                                        );
                                                    }
                                                }
                                            </Field>
                                        </div>

                                        <div className='ac-vpadding'>
                                            <CheckboxField
                                                name='closeSourceBranch'
                                                id='closeSourceBranch'>
                                                {
                                                    (fieldArgs: any) => {
                                                        return (
                                                            <Checkbox {...fieldArgs.fieldProps}
                                                                label='Close source branch after the pull request is merged'
                                                            />
                                                        );
                                                    }
                                                }
                                            </CheckboxField>
                                        </div>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        {issueDetails}
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <div className='ac-vpadding'>
                                            <Button className='ac-button' type='submit' isLoading={this.state.isCreateButtonLoading}>Create pull request</Button>
                                        </div>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <Panel style={{ marginBottom: 5, marginLeft: 10 }} isDefaultExpanded header={this.diffPanelHeader()}>
                                            <DiffList
                                                fileDiffsLoading={this.state.fileDiffsLoading}
                                                fileDiffs={this.state.fileDiffs}
                                                openDiffHandler={this.openDiffViewForFile}
                                            />
                                        </Panel>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        {this.state.destinationSiteRemote && this.state.sourceBranch && this.state.destinationBranch && this.state.commits.length > 0 &&
                                            <Panel isDefaultExpanded header={<div className='ac-flex-space-between'><h3>Commits</h3><p>{this.state.destinationSiteRemote.remote.name}/{this.state.sourceBranch?.name} <Arrow label="" size="small" /> {this.state.destinationBranch?.name}</p></div>}>
                                                <Commits commits={this.state.commits} />
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
