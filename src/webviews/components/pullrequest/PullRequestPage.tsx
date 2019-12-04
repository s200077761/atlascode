import { BreadcrumbsItem, BreadcrumbsStateless } from '@atlaskit/breadcrumbs';
import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import CheckCircleOutlineIcon from '@atlaskit/icon/glyph/check-circle-outline';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import InlineDialog from '@atlaskit/inline-dialog';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Panel from '@atlaskit/panel';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import { distanceInWordsToNow, format } from 'date-fns';
import { Transition } from 'jira-metaui-transformer';
import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite } from 'jira-pi-client';
import React from 'react';
import EdiText from 'react-editext';
import uuid from 'uuid';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { ApprovalStatus, BitbucketIssue, Comment, FileDiff, MergeStrategy, Task } from '../../../bitbucket/model';
import { OpenBitbucketIssueAction } from '../../../ipc/bitbucketIssueActions';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import { HostErrorMessage, PMFData } from '../../../ipc/messaging';
import { Checkout, CopyPullRequestLink, CreateTask, DeleteComment, DeleteTask, EditComment, EditTask, FetchUsers, Merge, OpenBuildStatusAction, OpenDiffViewAction, PostComment, RefreshPullRequest, UpdateApproval, UpdateTitle } from '../../../ipc/prActions';
import { CheckoutResult, isPRData, PRData } from '../../../ipc/prMessaging';
import { AtlLoader } from '../AtlLoader';
import BitbucketIssueList from '../bbissue/BitbucketIssueList';
import { StatusMenu } from '../bbissue/StatusMenu';
import ErrorBanner from '../ErrorBanner';
import { isValidString } from '../fieldValidators';
import IssueList from '../issue/IssueList';
import NavItem from '../issue/NavItem';
import { TransitionMenu } from '../issue/TransitionMenu';
import Offline from '../Offline';
import PMFBBanner from '../pmfBanner';
import { WebviewComponent } from '../WebviewComponent';
import BranchInfo from './BranchInfo';
import BuildStatus from './BuildStatus';
import CommentForm from './CommentForm';
import Comments from './Comments';
import { Commits } from './Commits';
import DiffList from './DiffList';
import MergeChecks from './MergeChecks';
import Reviewers from './Reviewers';

type Emit = CreateTask | 
    EditTask | DeleteTask | UpdateTitle | 
    UpdateApproval | Merge | Checkout | 
    PostComment | DeleteComment | EditComment | 
    CopyPullRequestLink | OpenJiraIssueAction | OpenBitbucketIssueAction | 
    OpenBuildStatusAction | RefreshPullRequest | FetchUsers | OpenDiffViewAction;
type Receive = PRData | CheckoutResult | HostErrorMessage;

interface ViewState {
    pr: PRData;
    isFileDiffsLoading: boolean;
    isApproveButtonLoading: boolean;
    isMergeButtonLoading: boolean;
    isCheckoutButtonLoading: boolean;
    isAnyCommentLoading: boolean;
    mergeDialogOpen: boolean;
    issueSetupEnabled: boolean;
    commitMessage: string;
    mergeStrategy: { label: string, value: string | undefined };
    closeSourceBranch?: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    isOnline: boolean;
    showPMF: boolean;
}

const emptyPR: PRData = {
    type: '',
    currentBranch: '',
    fileDiffs: [],
    mergeStrategies: [],
    relatedJiraIssues: [],
    relatedBitbucketIssues: []
};

const emptyState: ViewState = {
    pr: emptyPR,
    isFileDiffsLoading: true,
    isApproveButtonLoading: false,
    isMergeButtonLoading: false,
    isCheckoutButtonLoading: false,
    isAnyCommentLoading: false,
    mergeDialogOpen: false,
    issueSetupEnabled: false,
    commitMessage: '',
    mergeStrategy: { label: 'Default merge strategy', value: undefined },
    closeSourceBranch: undefined,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
    showPMF: false,

};

export default class PullRequestPage extends WebviewComponent<Emit, Receive, {}, ViewState> {
    private nonce: string;
    private userSuggestions: any;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    handleApprove = (status: ApprovalStatus) => {
        this.setState({ isApproveButtonLoading: true });
        this.postMessage({
            action: 'updateApproval',
            status: status
        });
    };

    handleMerge = () => {
        this.setState({ isMergeButtonLoading: true });
        this.postMessage({
            action: 'merge',
            mergeStrategy: this.state.mergeStrategy.value,
            commitMessage: this.state.commitMessage,
            closeSourceBranch: this.state.closeSourceBranch,
            issue: this.state.issueSetupEnabled ? this.state.pr.mainIssue : undefined
        });
    };

    handleDeleteComment = (commentId: number) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({
            action: 'deleteComment',
            commentId: commentId
        });
    };

    handleEditComment = (content: string, commentId: number) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({
            action: 'editComment',
            content: content,
            commentId: commentId
        });
    };

    handlePostComment = (content: string, parentCommentId?: number) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({
            action: 'comment',
            content: content,
            parentCommentId: parentCommentId
        });
    };

    handleIssueClicked = (issueOrKey: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => {
        this.postMessage({
            action: 'openJiraIssue',
            issueOrKey: issueOrKey
        });
    };

    handleCheckout = (branchName: string) => {
        this.setState({ isCheckoutButtonLoading: true });
        this.postMessage({
            action: 'checkout',
            branch: branchName,
            isSourceBranch: true
        });
    };

    handleCopyLink = () => {
        this.postMessage({
            action: 'copyPullRequestLink'
        });
    };

    handleTaskCreate = (task: Task, comment: Comment) => {
        this.postMessage({
            action: "createTask",
            task: task,
            comment: comment
        });
    };

    handleTaskEdit = (task: Task) => {
        this.postMessage({
            action: "editTask",
            task: task
        });
    };

    handleTaskDelete = (task: Task) => {
        this.postMessage({
            action: "deleteTask",
            task: task
        });
    };

    loadUserOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.userSuggestions = undefined;
            const nonce = uuid.v4();
            this.postMessage({ action: 'fetchUsers', nonce: nonce, query: input, site: this.state.pr.pr!.site });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if ((this.userSuggestions !== undefined && this.nonce === nonce) || (end - start) > 2000) {
                    if (this.userSuggestions === undefined) {
                        this.userSuggestions = [];
                    }

                    clearInterval(timer);
                    resolve(this.userSuggestions);
                }
            }, 100);

        });
    };

    onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isApproveButtonLoading: false, isMergeButtonLoading: false, isCheckoutButtonLoading: false, isAnyCommentLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'checkout': {
                this.setState({
                    isApproveButtonLoading: false,
                    isMergeButtonLoading: false,
                    isCheckoutButtonLoading: false,
                    pr: { ...this.state.pr, currentBranch: e.currentBranch }
                });
                break;
            }
            case 'fetchUsersResult': {
                this.userSuggestions = e.users;
                break;
            }
            case 'update': {
                if (isPRData(e)) {
                    this.setState({
                        pr: e,
                        isFileDiffsLoading: false,
                        isApproveButtonLoading: false,
                        isMergeButtonLoading: false,
                        isCheckoutButtonLoading: false,
                        isAnyCommentLoading: false,
                        closeSourceBranch: this.state.closeSourceBranch === undefined ? e.pr!.data.closeSourceBranch : this.state.closeSourceBranch
                    },
                        () => {
                            if (this.state.mergeStrategy.value === undefined) {
                                this.handleMergeStrategyChange(this.state.pr.mergeStrategies.find(strategy => strategy.isDefault === true));
                            }
                        }
                    );
                }
                break;
            }
            case 'onlineStatus': {
                this.setState({ isOnline: e.isOnline });

                if (e.isOnline) {
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
    };

    handleJiraIssueStatusChange = (item: Transition) => {
        this.setState({
            issueSetupEnabled: true,
            // there must be a better way to update the transition dropdown!!
            pr: { ...this.state.pr, mainIssue: { ...this.state.pr.mainIssue as MinimalIssue<DetailedSiteInfo>, status: { ...(this.state.pr.mainIssue as MinimalIssue<DetailedSiteInfo>).status, id: item.to.id, name: item.to.name } } }
        });
    };

    handleBitbucketIssueStatusChange = (item: string) => {
        const issue = this.state.pr.mainIssue as BitbucketIssue;
        const newIssueData = { ...issue.data, state: item };
        this.setState({
            issueSetupEnabled: true,
            // there must be a better way to update the transition dropdown!!
            pr: { ...this.state.pr, mainIssue: { ...issue, data: newIssueData } }
        });
    };

    diffPanelHeader = () => {
        return <h3>
            Files Changed {this.state.isFileDiffsLoading ? '' : `(${this.state.pr.fileDiffs!.length})`}
        </h3>;
    };

    handleTitleChange = (text: string) => this.postMessage({
        action: 'updateTitle',
        text: text
    });

    toggleMergeDialog = () => this.setState({ mergeDialogOpen: !this.state.mergeDialogOpen });
    closeMergeDialog = () => this.setState({ mergeDialogOpen: false });

    toggleIssueSetupEnabled = () => this.setState({ issueSetupEnabled: !this.state.issueSetupEnabled });

    toggleCloseSourceBranch = () => this.setState({ closeSourceBranch: !this.state.closeSourceBranch });

    handleCommitMessageChange = (text: string) => this.setState({ commitMessage: text });

    handleMergeStrategyChange = (item: any) => this.setState({ mergeStrategy: item }, this.resetCommitMessage);

    handleOpenDiffView = (fileDiff: FileDiff) => {
        this.postMessage({ action: 'openDiffView', fileChange: fileDiff.fileChange! });
    };

    resetCommitMessage = () => {
        const mergeStrategy = this.state.mergeStrategy.value;
        if (mergeStrategy === 'fast_forward') {
            this.setState({ commitMessage: '' });
        }

        const { id, source, title, participants } = this.state.pr.pr!.data;

        const branchInfo = `Merged in ${source && source.branchName}`;
        const pullRequestInfo = `(pull request #${id})`;

        let defaultCommitMessage = `${branchInfo} ${pullRequestInfo}\n\n${title}`;

        if (mergeStrategy === 'squash') {
            const commits = this.state.pr.commits || [];
            // Minor optimization: if there's exactly 1 commit, and the commit
            // message already matches the pull request title, no need to display the
            // same text twice.
            if (commits.length !== 1 || commits[0].message !== title) {
                const commitMessages = commits
                    .reverse()
                    .map(commit => `* ${commit.message}`)
                    .join('\n');
                defaultCommitMessage += `\n\n${commitMessages}`;
            }
        }

        const approvers = participants.filter(p => p.status === 'APPROVED');
        if (approvers.length > 0) {
            const approverInfo = approvers
                .map(approver => `Approved-by: ${approver.displayName}`)
                .join('\n');
            defaultCommitMessage += `\n\n${approverInfo}`;
        }

        this.setState({ commitMessage: defaultCommitMessage });
    };

    render() {
        if (!this.state.pr.pr && !this.state.isErrorBannerOpen && this.state.isOnline) {
            this.postMessage({ action: 'refreshPR' });
            return <AtlLoader />;
        } else if (!this.state.pr.pr && !this.state.isOnline) {
            return (
                <div className='bitbucket-page'>
                    <Offline />
                </div>
            );
        }

        const pr = this.state.pr.pr!.data;
        const isPrOpen = pr.state === "OPEN";

        let currentUserApprovalStatus: ApprovalStatus = 'UNAPPROVED';
        if (pr.participants) {
            const foundCurrentUser = pr.participants!.find((participant) => participant.accountId === this.state.pr.currentUser!.accountId);
            if (foundCurrentUser) {
                currentUserApprovalStatus = foundCurrentUser.status;
            }
        }
        const issue = this.state.pr.mainIssue;
        const issueDetails = issue ?
            <React.Fragment>
                {isMinimalIssue(issue)
                    ? <div>
                        <div className='ac-flex'>
                            <Checkbox isChecked={this.state.issueSetupEnabled} onChange={this.toggleIssueSetupEnabled} name='setup-jira-checkbox' label='Update Jira issue status after merge' />
                            <NavItem text={`${issue.key}`} iconUrl={issue.issuetype.iconUrl} onItemClick={() => this.postMessage({ action: 'openJiraIssue', issueOrKey: issue })} />
                        </div>
                        <div style={{ marginLeft: 20, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                            <div style={{ marginLeft: 10 }}>
                                <TransitionMenu transitions={(issue as MinimalIssue<DetailedSiteInfo>).transitions} currentStatus={(issue as MinimalIssue<DetailedSiteInfo>).status} isStatusButtonLoading={false} onStatusChange={this.handleJiraIssueStatusChange} />
                            </div>
                        </div>
                    </div>
                    : <div>
                        <div className='ac-flex'>
                            <Checkbox isChecked={this.state.issueSetupEnabled} onChange={this.toggleIssueSetupEnabled} name='setup-jira-checkbox' label='Update Bitbucket issue status after merge' />
                            <NavItem text={`#${issue.data.id}`} onItemClick={() => this.postMessage({ action: 'openBitbucketIssue', issue: issue })} />
                        </div>
                        <div style={{ marginLeft: 20, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                            <div style={{ marginLeft: 10 }}>
                                <StatusMenu issueData={issue.data} isStatusButtonLoading={false} onHandleStatusChange={this.handleBitbucketIssueStatusChange} />
                            </div>
                        </div>
                    </div>
                }
            </React.Fragment>
            : null;

        const actionsContent = (
            <div className='ac-inline-grid'>
                <Reviewers {...this.state.pr} />
                {!pr.siteDetails.isCloud &&
                    <Tooltip content={currentUserApprovalStatus === 'NEEDS_WORK' ? 'Remove Needs work' : 'Mark as Needs work'}>
                        <Button className={currentUserApprovalStatus === 'NEEDS_WORK' ? undefined : 'ac-button'}
                            appearance={currentUserApprovalStatus === 'NEEDS_WORK' ? 'warning' : 'default'}
                            isLoading={this.state.isApproveButtonLoading}
                            onClick={() => this.handleApprove(currentUserApprovalStatus === 'NEEDS_WORK' ? 'UNAPPROVED' : 'NEEDS_WORK')}>
                            Needs work
                        </Button>
                    </Tooltip>
                }
                <Button className='ac-button' iconBefore={<CheckCircleOutlineIcon label='approve' />}
                    isLoading={this.state.isApproveButtonLoading}
                    onClick={() => this.handleApprove(currentUserApprovalStatus === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED')}>
                    {currentUserApprovalStatus === 'APPROVED' ? 'Unapprove' : 'Approve'}
                </Button>

                <div className='ac-inline-dialog'>
                    <InlineDialog placement='bottom-end'
                        content={
                            <div style={{ width: '400px' }}>
                                <MergeChecks {...this.state.pr} />
                                <div className='ac-vpadding'>
                                    <label>Select merge strategy <Button className='ac-link-button' appearance='link' iconBefore={<ShortcutIcon size='small' label='merge-strategies-link' />} href={`${pr.destination!.repo.url}/admin/merge-strategies`} /></label>
                                    <Select
                                        options={this.state.pr.mergeStrategies}
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        getOptionLabel={(option: MergeStrategy) => `${option.label}${option.isDefault ? ' (default)' : ''}`}
                                        getOptionValue={(option: MergeStrategy) => option.value}
                                        value={this.state.mergeStrategy}
                                        onChange={this.handleMergeStrategyChange} />
                                </div>
                                {this.state.mergeStrategy.value !== 'fast_forward' &&
                                    <div className='ac-vpadding'>
                                        <Tooltip content={this.state.commitMessage}>
                                            <EdiText
                                                type='textarea'
                                                value={this.state.commitMessage}
                                                onSave={this.handleCommitMessageChange}
                                                validation={isValidString}
                                                validationMessage='Commit message is required'
                                                inputProps={{ className: 'ac-inputField', rows: 4 }}
                                                viewProps={{ id: 'commit-message', className: 'ac-inline-input-view-p' }}
                                                editButtonClassName='ac-inline-edit-button'
                                                cancelButtonClassName='ac-inline-cancel-button'
                                                saveButtonClassName='ac-inline-save-button'
                                                editOnViewClick={true}
                                            />
                                        </Tooltip>
                                    </div>
                                }
                                {issueDetails}
                                <div className='ac-vpadding'>
                                    <div className='ac-flex-space-between'>
                                        <Checkbox isChecked={this.state.closeSourceBranch} onChange={this.toggleCloseSourceBranch} name='setup-jira-checkbox' label='Close source branch' />
                                        <Button className='ac-button' isLoading={this.state.isMergeButtonLoading} isDisabled={!isPrOpen} onClick={this.handleMerge}>{isPrOpen ? 'Merge' : pr.state}</Button>
                                    </div>
                                </div>
                            </div>
                        }
                        isOpen={this.state.mergeDialogOpen}
                        onClose={this.closeMergeDialog}>
                        <Button className='ac-button' iconAfter={<ChevronDownIcon label='merge-options' />} isLoading={this.state.isMergeButtonLoading} isDisabled={!isPrOpen} onClick={this.toggleMergeDialog}>{isPrOpen ? 'Merge' : pr.state}</Button>
                    </InlineDialog>
                </div>
                <Button className='ac-button' style={{ float: "right" }} onClick={() => this.postMessage({ action: 'refreshPR' })}>
                    <RefreshIcon label="refresh" size="small"></RefreshIcon>
                </Button>
            </div>
        );
        const breadcrumbs = (
            <BreadcrumbsStateless onExpand={() => { }}>
                <BreadcrumbsItem component={() => <NavItem text={pr.destination!.repo.displayName} href={pr.destination!.repo.url} />} />
                <BreadcrumbsItem component={() => <NavItem text='Pull requests' href={`${pr.destination!.repo.url}/pull-requests`} />} />
                <BreadcrumbsItem component={() => <NavItem text={`Pull request #${pr.id}`} href={pr.url} onCopy={this.handleCopyLink} />} />
            </BreadcrumbsStateless>
        );

        return (
            <div className='bitbucket-page'>
                {!this.state.isOnline &&
                    <Offline />
                }
                <Page>
                    <Grid>
                        <GridColumn>
                            {this.state.isErrorBannerOpen &&
                                <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                            }
                            {this.state.showPMF &&
                                <PMFBBanner onPMFOpen={() => this.onPMFOpen()} onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
                            }
                            <PageHeader
                                actions={actionsContent}
                                breadcrumbs={breadcrumbs}
                            >
                                <React.Fragment>
                                    <EdiText
                                        type='text'
                                        value={pr.title}
                                        onSave={this.handleTitleChange}
                                        validation={isValidString}
                                        validationMessage='Title is required'
                                        inputProps={{ className: 'ac-inputField' }}
                                        viewProps={{ id: 'title', className: 'ac-inline-input-view-p' }}
                                        editButtonClassName='ac-hidden'
                                        cancelButtonClassName='ac-inline-cancel-button'
                                        saveButtonClassName='ac-inline-save-button'
                                        editOnViewClick={true}
                                    />
                                    <Tooltip content={`Created on ${format(pr.ts, 'YYYY-MM-DD h:mm A')}`} position='mouse'>
                                        <p style={{ fontSize: 13, color: 'silver' }}>{`Created ${distanceInWordsToNow(pr.ts)} ago`}</p>
                                    </Tooltip>
                                </React.Fragment>
                            </PageHeader>
                            <div className='ac-flex-space-between'>
                                {this.state.pr.currentBranch.length > 0 && <BranchInfo prData={this.state.pr} postMessage={(e: Emit) => this.postMessage(e)} />}
                                <div className='ac-flex'>
                                    <Button className='ac-button' spacing='compact' isDisabled={this.state.isCheckoutButtonLoading || pr.source!.branchName === this.state.pr.currentBranch} isLoading={this.state.isCheckoutButtonLoading} onClick={() => this.handleCheckout(pr.source!.branchName)}>
                                        {pr.source!.branchName === this.state.pr.currentBranch ? 'Source branch checked out' : 'Checkout source branch'}
                                    </Button>
                                    <BuildStatus buildStatuses={this.state.pr.buildStatuses} postMessage={(e: OpenBuildStatusAction) => this.postMessage(e)} />
                                </div>
                            </div>
                            <Panel isDefaultExpanded header={<h3>Summary</h3>}>
                                <p dangerouslySetInnerHTML={{ __html: pr.htmlSummary! }} />
                            </Panel>
                            {
                                !this.state.pr.commits && !this.state.pr.comments
                                    ? <div className='ac-block-centered'><Spinner size="large" /></div>
                                    : <React.Fragment>
                                        {
                                            this.state.pr.relatedJiraIssues && this.state.pr.relatedJiraIssues.length > 0 &&
                                            <Panel isDefaultExpanded header={<h3>Related Jira Issues</h3>}>
                                                <IssueList issues={this.state.pr.relatedJiraIssues} onIssueClick={this.handleIssueClicked} />
                                            </Panel>
                                        }
                                        {
                                            this.state.pr.relatedBitbucketIssues && this.state.pr.relatedBitbucketIssues.length > 0 &&
                                            <Panel isDefaultExpanded header={<h3>Related Bitbucket Issues</h3>}>
                                                <BitbucketIssueList issues={this.state.pr.relatedBitbucketIssues} postMessage={(e: OpenBitbucketIssueAction) => this.postMessage(e)} />
                                            </Panel>
                                        }
                                        <Panel isDefaultExpanded header={<h3>Commits</h3>}>
                                            <Commits commits={this.state.pr.commits || []} />
                                        </Panel>
                                        <Panel style={{ marginBottom: 5, marginLeft: 10 }} isDefaultExpanded header={this.diffPanelHeader()}>
                                            <DiffList fileDiffs={this.state.pr.fileDiffs ? this.state.pr.fileDiffs : []} fileDiffsLoading={this.state.isFileDiffsLoading} openDiffHandler={this.handleOpenDiffView} ></DiffList>
                                        </Panel>
                                        <Panel isDefaultExpanded header={<h3>Comments</h3>}>
                                            <Comments
                                                comments={this.state.pr.comments!}
                                                currentUser={this.state.pr.currentUser!}
                                                isAnyCommentLoading={this.state.isAnyCommentLoading}
                                                onComment={this.handlePostComment}
                                                onEdit={this.handleEditComment}
                                                onDelete={this.handleDeleteComment}
                                                onTaskCreate={this.handleTaskCreate}
                                                onTaskEdit={this.handleTaskEdit}
                                                onTaskDelete={this.handleTaskDelete}
                                                loadUserOptions={this.loadUserOptions}
                                            />
                                            <CommentForm
                                                currentUser={this.state.pr.currentUser!}
                                                visible={true}
                                                isAnyCommentLoading={this.state.isAnyCommentLoading}
                                                onSave={this.handlePostComment}
                                                loadUserOptions={this.loadUserOptions}
                                            />
                                        </Panel>
                                    </React.Fragment>
                            }
                        </GridColumn>
                    </Grid>
                </Page>
            </div >
        );
    }
}
