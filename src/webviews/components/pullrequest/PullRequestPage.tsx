import * as React from 'react';
import Button from '@atlaskit/button';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Panel from '@atlaskit/panel';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import InlineDialog from '@atlaskit/inline-dialog';
import { Checkbox } from '@atlaskit/checkbox';
import Select from '@atlaskit/select';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import CheckCircleOutlineIcon from '@atlaskit/icon/glyph/check-circle-outline';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import Reviewers from './Reviewers';
import { Commits } from './Commits';
import Comments from './Comments';
import { WebviewComponent } from '../WebviewComponent';
import { PRData, CheckoutResult, isPRData } from '../../../ipc/prMessaging';
import { UpdateApproval, Merge, Checkout, PostComment, CopyPullRequestLink, RefreshPullRequest, DeleteComment, EditComment, FetchUsers } from '../../../ipc/prActions';
import { OpenJiraIssueAction } from '../../../ipc/issueActions';
import CommentForm from './CommentForm';
import BranchInfo from './BranchInfo';
import IssueList from '../issue/IssueList';
import BuildStatus from './BuildStatus';
import NavItem from '../issue/NavItem';
import { OpenBuildStatusAction } from '../../../ipc/prActions';
import { HostErrorMessage, PMFData } from '../../../ipc/messaging';
import ErrorBanner from '../ErrorBanner';
import Offline from '../Offline';
import BitbucketIssueList from '../bbissue/BitbucketIssueList';
import { OpenBitbucketIssueAction } from '../../../ipc/bitbucketIssueActions';
import { TransitionMenu } from '../issue/TransitionMenu';
import { StatusMenu } from '../bbissue/StatusMenu';
import MergeChecks from './MergeChecks';
import PMFBBanner from '../pmfBanner';
import { BitbucketIssueData } from '../../../bitbucket/model';
import { MinimalIssue, Transition, isMinimalIssue, MinimalIssueOrKeyAndSiteOrKey } from '../../../jira/jira-client/model/entities';
import { AtlLoader } from '../AtlLoader';

type Emit = UpdateApproval | Merge | Checkout | PostComment | DeleteComment | EditComment | CopyPullRequestLink | OpenJiraIssueAction | OpenBitbucketIssueAction | OpenBuildStatusAction | RefreshPullRequest | FetchUsers;
type Receive = PRData | CheckoutResult | HostErrorMessage;

interface ViewState {
    pr: PRData;
    isApproveButtonLoading: boolean;
    isMergeButtonLoading: boolean;
    isCheckoutButtonLoading: boolean;
    isAnyCommentLoading: boolean;
    mergeDialogOpen: boolean;
    issueSetupEnabled: boolean;
    mergeStrategy: { label: string, value: 'merge_commit' | 'squash' | 'fast_forward' | undefined };
    closeSourceBranch?: boolean;
    isErrorBannerOpen: boolean;
    errorDetails: any;
    isOnline: boolean;
    showPMF: boolean;
}

const emptyPR = {
    type: '',
    remote: { name: 'dummy_remote', isReadOnly: true },
    currentBranch: '',
    relatedJiraIssues: [],
    relatedBitbucketIssues: []
};

const emptyState: ViewState = {
    pr: emptyPR,
    isApproveButtonLoading: false,
    isMergeButtonLoading: false,
    isCheckoutButtonLoading: false,
    isAnyCommentLoading: false,
    mergeDialogOpen: false,
    issueSetupEnabled: false,
    mergeStrategy: { label: 'Default merge strategy', value: undefined },
    closeSourceBranch: undefined,
    isErrorBannerOpen: false,
    errorDetails: undefined,
    isOnline: true,
    showPMF: false,

};

export default class PullRequestPage extends WebviewComponent<Emit, Receive, {}, ViewState> {
    private userSuggestions: any;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    handleApprove = (approved: boolean) => {
        this.setState({ isApproveButtonLoading: true });
        this.postMessage({
            action: 'updateApproval',
            approved: approved
        });
    }

    handleMerge = () => {
        this.setState({ isMergeButtonLoading: true });
        this.postMessage({
            action: 'merge',
            mergeStrategy: this.state.mergeStrategy.value,
            closeSourceBranch: this.state.closeSourceBranch,
            issue: this.state.issueSetupEnabled ? this.state.pr.mainIssue : undefined
        });
    }

    handleDeleteComment = (commentId: number) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({
            action: 'deleteComment',
            commentId: commentId
        });
    }

    handleEditComment = (content: string, commentId: number) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({
            action: 'editComment',
            content: content,
            commentId: commentId
        });
    }

    handlePostComment = (content: string, parentCommentId?: number) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({
            action: 'comment',
            content: content,
            parentCommentId: parentCommentId
        });
    }

    handleIssueClicked = (issueOrKey: MinimalIssueOrKeyAndSiteOrKey) => {
        this.postMessage({
            action: 'openJiraIssue',
            issueOrKey: issueOrKey
        });
    }

    handleCheckout = (branchName: string) => {
        this.setState({ isCheckoutButtonLoading: true });
        this.postMessage({
            action: 'checkout',
            branch: branchName,
            isSourceBranch: true
        });
    }

    handleCopyLink = () => {
        this.postMessage({
            action: 'copyPullRequestLink'
        });
    }

    loadUserOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.userSuggestions = undefined;
            this.postMessage({ action: 'fetchUsers', query: input, remote: this.state.pr.remote });

            const start = Date.now();
            let timer = setInterval(() => {
                const end = Date.now();
                if (this.userSuggestions !== undefined || (end - start) > 2000) {
                    if (this.userSuggestions === undefined) {
                        this.userSuggestions = [];
                    }

                    clearInterval(timer);
                    resolve(this.userSuggestions);
                }
            }, 100);
        });
    }

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
                        isApproveButtonLoading: false,
                        isMergeButtonLoading: false,
                        isCheckoutButtonLoading: false,
                        isAnyCommentLoading: false,
                        closeSourceBranch: this.state.closeSourceBranch === undefined ? e.pr!.closeSourceBranch : this.state.closeSourceBranch
                    });
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
    }

    handleJiraIssueStatusChange = (item: Transition) => {
        this.setState({
            issueSetupEnabled: true,
            // there must be a better way to update the transition dropdown!!
            pr: { ...this.state.pr, mainIssue: { ...this.state.pr.mainIssue as MinimalIssue, status: { ...(this.state.pr.mainIssue as MinimalIssue).status, id: item.to.id, name: item.to.name } } }
        });
    }

    handleBitbucketIssueStatusChange = (item: string) => {
        this.setState({
            issueSetupEnabled: true,
            // there must be a better way to update the transition dropdown!!
            pr: { ...this.state.pr, mainIssue: { ...this.state.pr.mainIssue, state: item } as BitbucketIssueData }
        });
    }

    toggleMergeDialog = () => this.setState({ mergeDialogOpen: !this.state.mergeDialogOpen });
    closeMergeDialog = () => this.setState({ mergeDialogOpen: false });

    toggleIssueSetupEnabled = () => this.setState({ issueSetupEnabled: !this.state.issueSetupEnabled });

    toggleCloseSourceBranch = () => this.setState({ closeSourceBranch: !this.state.closeSourceBranch });

    handleMergeStrategyChange = (item: any) => this.setState({ mergeStrategy: item });

    render() {
        const pr = this.state.pr.pr!;

        if (!pr && !this.state.isErrorBannerOpen && this.state.isOnline) {
            return <AtlLoader />;
        } else if (!pr && !this.state.isOnline) {
            return (
                <div className='bitbucket-page'>
                    <Offline />
                </div>
            );
        }

        const isPrOpen = pr.state === "OPEN";

        let currentUserApproved = false;
        if (pr.participants) {
            currentUserApproved = pr.participants!
                .filter((participant) => participant.accountId === this.state.pr.currentUser!.accountId)
                .reduce((acc, curr) => !!acc || !!curr.approved, false as boolean);
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
                                <TransitionMenu transitions={(issue as MinimalIssue).transitions} currentStatus={(issue as MinimalIssue).status} isStatusButtonLoading={false} onStatusChange={this.handleJiraIssueStatusChange} />
                            </div>
                        </div>
                    </div>
                    : <div>
                        <div className='ac-flex'>
                            <Checkbox isChecked={this.state.issueSetupEnabled} onChange={this.toggleIssueSetupEnabled} name='setup-jira-checkbox' label='Update Bitbucket issue status after merge' />
                            <NavItem text={`#${issue.id}`} onItemClick={() => this.postMessage({ action: 'openBitbucketIssue', issue: issue as BitbucketIssueData })} />
                        </div>
                        <div style={{ marginLeft: 20, borderLeftWidth: 'initial', borderLeftStyle: 'solid', borderLeftColor: 'var(--vscode-settings-modifiedItemIndicator)' }}>
                            <div style={{ marginLeft: 10 }}>
                                <StatusMenu issue={issue as BitbucketIssueData} isStatusButtonLoading={false} onHandleStatusChange={this.handleBitbucketIssueStatusChange} />
                            </div>
                        </div>
                    </div>
                }
            </React.Fragment>
            : null;

        const actionsContent = (
            <div className='ac-inline-grid'>
                <Reviewers {...this.state.pr} />
                <Button className='ac-button' iconBefore={<CheckCircleOutlineIcon label='approve' />}
                    isLoading={this.state.isApproveButtonLoading}
                    onClick={() => this.handleApprove(!currentUserApproved)}>
                    {currentUserApproved ? 'Unapprove' : 'Approve'}
                </Button>

                <div className='ac-inline-dialog'>
                    <InlineDialog placement='bottom-end'
                        content={
                            <div>
                                <MergeChecks {...this.state.pr} />
                                <div className='ac-vpadding'>
                                    <label>Select merge strategy <Button className='ac-link-button' appearance='link' iconBefore={<ShortcutIcon size='small' label='merge-strategies-link' />} href={`${this.state.pr.pr!.destination!.repo.url}/admin/merge-strategies`} /></label>
                                    <Select
                                        options={[
                                            { label: 'Default merge strategy', value: undefined },
                                            { label: 'Merge commit', value: 'merge_commit' },
                                            { label: 'Squash', value: 'squash' },
                                            { label: 'Fast forward', value: 'fast_forward' }
                                        ]}
                                        className="ac-select-container"
                                        classNamePrefix="ac-select"
                                        value={this.state.mergeStrategy}
                                        onChange={this.handleMergeStrategyChange} />
                                </div>
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
                {
                    this.state.pr.errors && <Tooltip content={this.state.pr.errors}><WarningIcon label='pr-warning' /></Tooltip>
                }
            </div>
        );
        const breadcrumbs = (
            <BreadcrumbsStateless onExpand={() => { }}>
                <BreadcrumbsItem component={() => <NavItem text={this.state.pr.pr!.destination!.repo.displayName} href={this.state.pr.pr!.destination!.repo.url} />} />
                <BreadcrumbsItem component={() => <NavItem text='Pull requests' href={`${this.state.pr.pr!.destination!.repo.url}/pull-requests`} />} />
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
                                <PMFBBanner onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })} onPMFLater={() => this.onPMFLater()} onPMFNever={() => this.onPMFNever()} onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)} />
                            }
                            <PageHeader
                                actions={actionsContent}
                                breadcrumbs={breadcrumbs}
                            >
                                <p>{pr.title}</p>
                            </PageHeader>
                            <div className='ac-flex-space-between'>
                                <BranchInfo prData={this.state.pr} postMessage={(e: Emit) => this.postMessage(e)} />
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
                                            <Commits {...this.state.pr} />
                                        </Panel>
                                        <Panel isDefaultExpanded header={<h3>Comments</h3>}>
                                            <Comments
                                                comments={this.state.pr.comments!}
                                                currentUser={this.state.pr.currentUser!}
                                                isAnyCommentLoading={this.state.isAnyCommentLoading}
                                                onComment={this.handlePostComment}
                                                onEdit={this.handleEditComment}
                                                onDelete={this.handleDeleteComment}
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
            </div>
        );
    }
}
