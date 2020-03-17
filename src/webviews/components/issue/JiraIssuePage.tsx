import Button, { ButtonGroup } from '@atlaskit/button';
import BitbucketBranchesIcon from '@atlaskit/icon/glyph/bitbucket/branches';
import EditorAttachmentIcon from '@atlaskit/icon/glyph/editor/attachment';
import EmojiFrequentIcon from '@atlaskit/icon/glyph/emoji/frequent';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';
import WatchIcon from '@atlaskit/icon/glyph/watch';
import WatchFilledIcon from '@atlaskit/icon/glyph/watch-filled';
import InlineDialog from '@atlaskit/inline-dialog';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import Tooltip from '@atlaskit/tooltip';
import WidthDetector from '@atlaskit/width-detector';
import { CommentVisibility, Transition } from '@atlassianlabs/jira-pi-common-models';
import { Comment as JiraComment } from '@atlassianlabs/jira-pi-common-models/entities';
import { FieldUI, InputFieldUI, UIType, ValueType } from '@atlassianlabs/jira-pi-meta-models/ui-meta';
import { distanceInWordsToNow, format } from 'date-fns';
import * as React from 'react';
// NOTE: for now we have to use react-collapsible and NOT Panel because panel uses display:none
// which totally screws up react-select when select boxes are in an initially hidden panel.
import Collapsible from 'react-collapsible';
import uuid from 'uuid';
import { EditIssueAction, IssueCommentAction } from '../../../ipc/issueActions';
import { EditIssueData, emptyEditIssueData, isIssueCreated } from '../../../ipc/issueMessaging';
import { PMFData } from '../../../ipc/messaging';
import { ConnectionTimeout } from '../../../util/time';
import { AtlLoader } from '../AtlLoader';
import ErrorBanner from '../ErrorBanner';
import Offline from '../Offline';
import PMFBBanner from '../pmfBanner';
import {
    AbstractIssueEditorPage,
    CommonEditorPageAccept,
    CommonEditorPageEmit,
    CommonEditorViewState,
    emptyCommonEditorState
} from './AbstractIssueEditorPage';
import { AttachmentList } from './AttachmentList';
import { AttachmentsModal } from './AttachmentsModal';
import { CommentComponent } from './CommentComponent';
import IssueList from './IssueList';
import { LinkedIssues } from './LinkedIssues';
import NavItem from './NavItem';
import PullRequests from './PullRequests';
import { TransitionMenu } from './TransitionMenu';
import VotesForm from './VotesForm';
import WatchesForm from './WatchesForm';
import WorklogForm from './WorklogForm';
import Worklogs from './Worklogs';

type Emit = CommonEditorPageEmit | EditIssueAction | IssueCommentAction;
type Accept = CommonEditorPageAccept | EditIssueData;

interface ViewState extends CommonEditorViewState, EditIssueData {
    showMore: boolean;
    currentInlineDialog: string;
}

const emptyState: ViewState = {
    ...emptyCommonEditorState,
    ...emptyEditIssueData,
    showMore: false,
    currentInlineDialog: ''
};

export default class JiraIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {
    private advancedSidebarFields: FieldUI[] = [];
    private advancedMainFields: FieldUI[] = [];

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    getProjectKey = (): string => {
        return this.state.key.substring(0, this.state.key.indexOf('-'));
    };

    onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    const issueData = e as EditIssueData;
                    this.updateInternals(issueData);
                    this.setState({
                        ...issueData,
                        ...{
                            isErrorBannerOpen: false,
                            errorDetails: undefined,
                            isSomethingLoading: false,
                            loadingField: ''
                        }
                    });
                    break;
                }
                case 'epicChildrenUpdate': {
                    this.setState({ isSomethingLoading: false, loadingField: '', epicChildren: e.epicChildren });
                    break;
                }
                case 'pullRequestUpdate': {
                    this.setState({ recentPullRequests: e.recentPullRequests });
                    break;
                }
                case 'currentUserUpdate': {
                    this.setState({ currentUser: e.currentUser });
                    break;
                }
                case 'issueCreated': {
                    if (isIssueCreated(e)) {
                        this.setState({ isSomethingLoading: false, loadingField: '' });
                    }
                    break;
                }
            }
        }
        return handled;
    }

    updateInternals(data: EditIssueData) {
        const orderedValues: FieldUI[] = this.sortFieldValues(data.fields);
        this.advancedMainFields = [];
        this.advancedSidebarFields = [];

        orderedValues.forEach(field => {
            if (field.advanced) {
                if (field.uiType === UIType.Input && (field as InputFieldUI).isMultiline) {
                    this.advancedMainFields.push(field);
                } else {
                    this.advancedSidebarFields.push(field);
                }
            }
        });
    }

    handleCopyIssueLink = () => {
        this.postMessage({
            action: 'copyJiraIssueLink'
        });
    };

    handleStartWorkOnIssue = () => {
        this.postMessage({
            action: 'openStartWorkPage',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails }
        });
    };

    fetchUsers = (input: string) => {
        return this.loadSelectOptions(
            input,
            `${this.state.siteDetails.baseApiUrl}/api/${this.state.apiVersion}/user/search?${
                this.state.siteDetails.isCloud ? 'query' : 'username'
            }=`
        );
    };

    protected handleInlineEdit = async (field: FieldUI, newValue: any) => {
        switch (field.uiType) {
            case UIType.Subtasks: {
                this.setState({ isSomethingLoading: true, loadingField: field.key });
                const payload: any = newValue;
                payload.project = { key: this.getProjectKey() };
                payload.parent = { key: this.state.key };
                this.postMessage({
                    action: 'createIssue',
                    site: this.state.siteDetails,
                    issueData: { fields: payload }
                });

                break;
            }
            case UIType.IssueLinks: {
                this.setState({ isSomethingLoading: true, loadingField: 'issuelinks' });

                this.postMessage({
                    action: 'createIssueLink',
                    site: this.state.siteDetails,
                    issueLinkData: {
                        type: {
                            id: newValue.type.id
                        },
                        inwardIssue:
                            newValue.type.type === 'inward' ? { key: newValue.issueKey } : { key: this.state.key },
                        outwardIssue:
                            newValue.type.type === 'outward' ? { key: newValue.issueKey } : { key: this.state.key }
                    },
                    issueLinkType: newValue.type
                });
                break;
            }
            case UIType.Timetracking: {
                let newValObject = this.state.fieldValues[field.key];
                if (newValObject) {
                    newValObject.originalEstimate = newValue;
                } else {
                    newValObject = {
                        originalEstimate: newValue
                    };
                }
                this.setState({
                    loadingField: field.key,
                    isSomethingLoading: true,
                    fieldValues: { ...this.state.fieldValues, ...{ [field.key]: newValObject } }
                });
                await this.handleEditIssue(`${field.key}`, { originalEstimate: newValue });
                break;
            }
            case UIType.Worklog: {
                this.setState({ isSomethingLoading: true, loadingField: field.key });
                this.postMessage({
                    action: 'createWorklog',
                    site: this.state.siteDetails,
                    worklogData: newValue,
                    issueKey: this.state.key
                });
                break;
            }

            default: {
                let typedVal = newValue;

                if (typedVal && field.valueType === ValueType.Number && typeof newValue !== 'number') {
                    typedVal = parseFloat(newValue);
                }
                //NOTE: we need to update the state here so if there's an error we will detect the change and re-render with the old value
                this.setState({
                    loadingField: field.key,
                    fieldValues: { ...this.state.fieldValues, ...{ [field.key]: typedVal } }
                });
                if (typedVal === undefined) {
                    typedVal = null;
                }
                await this.handleEditIssue(field.key, typedVal);
                break;
            }
        }
    };

    handleEditIssue = async (fieldKey: string, newValue: any) => {
        this.setState({ isSomethingLoading: true, loadingField: fieldKey });
        const nonce = uuid.v4();
        await this.postMessageWithEventPromise(
            {
                action: 'editIssue',
                fields: {
                    [fieldKey]: newValue
                },
                nonce: nonce
            },
            'editIssueDone',
            ConnectionTimeout,
            nonce
        );
    };

    protected handleCreateComment = (commentBody: string, restriction?: CommentVisibility) => {
        this.setState({ isSomethingLoading: true, loadingField: 'comment' });
        let commentAction: IssueCommentAction = {
            action: 'comment',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            commentBody: commentBody,
            restriction: restriction
        };

        this.postMessage(commentAction);
    };

    protected handleUpdateComment = (commentBody: string, commentId: string, restriction?: CommentVisibility) => {
        const commentAction: IssueCommentAction = {
            action: 'comment',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            commentBody: commentBody,
            commentId: commentId,
            restriction: restriction
        };

        this.postMessage(commentAction);
    };

    handleDeleteComment = (commentId: string) => {
        this.postMessage({
            action: 'deleteComment',
            issue: { key: this.state.key, siteDetails: this.state.siteDetails },
            commentId: commentId
        });
    };

    handleStatusChange = (transition: Transition) => {
        this.setState({ isSomethingLoading: true, loadingField: 'status' });
        this.postMessage({
            action: 'transitionIssue',
            transition: transition,
            issue: { key: this.state.key, siteDetails: this.state.siteDetails }
        });
    };

    handleOpenWorklogEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'worklog') {
            this.setState({ currentInlineDialog: 'worklog', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleOpenWatchesEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'watches') {
            this.setState({ currentInlineDialog: 'watches', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleOpenVotesEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'votes') {
            this.setState({ currentInlineDialog: 'votes', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleOpenAttachmentEditor = () => {
        // Note: we set isSomethingLoading: true to disable all fields while the form is open
        if (this.state.currentInlineDialog !== 'attachment') {
            this.setState({ currentInlineDialog: 'attachment', isSomethingLoading: true });
        } else {
            this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        }
    };

    handleInlineDialogClose = () => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: false });
    };

    handleInlineDialogSave = (field: FieldUI, value: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: false });
        this.handleInlineEdit(field, value);
    };

    handleAddWatcher = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'watches' });
        this.postMessage({
            action: 'addWatcher',
            site: this.state.siteDetails,
            issueKey: this.state.key,
            watcher: user
        });
    };

    handleRemoveWatcher = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'watches' });
        this.postMessage({
            action: 'removeWatcher',
            site: this.state.siteDetails,
            issueKey: this.state.key,
            watcher: user
        });
    };

    handleAddVote = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'votes' });
        this.postMessage({ action: 'addVote', site: this.state.siteDetails, issueKey: this.state.key, voter: user });
    };

    handleRemoveVote = (user: any) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: true, loadingField: 'votes' });
        this.postMessage({ action: 'removeVote', site: this.state.siteDetails, issueKey: this.state.key, voter: user });
    };

    handleAddAttachments = (files: any[]) => {
        this.setState({ currentInlineDialog: '', isSomethingLoading: false, loadingField: 'attachment' });
        const serFiles = files.map((file: any) => {
            return {
                lastModified: file.lastModified,
                lastModifiedDate: file.lastModifiedDate,
                name: file.name,
                size: file.size,
                type: file.type,
                path: file.path
            };
        });
        this.postMessage({
            action: 'addAttachments',
            site: this.state.siteDetails,
            issueKey: this.state.key,
            files: serFiles
        });
    };

    handleDeleteAttachment = (file: any) => {
        this.setState({ isSomethingLoading: true, loadingField: 'attachment' });
        this.postMessage({ action: 'deleteAttachment', site: this.state.siteDetails, objectWithId: file });
    };

    handleRefresh = () => {
        this.setState({ isSomethingLoading: true, loadingField: 'refresh' });
        this.postMessage({ action: 'refreshIssue' });
    };

    handleDeleteIssuelink = (issuelink: any) => {
        this.setState({ isSomethingLoading: true, loadingField: 'issuelinks' });
        this.postMessage({ action: 'deleteIssuelink', site: this.state.siteDetails, objectWithId: issuelink });
    };

    getMainPanelMarkup(includeCommonSidebar: boolean): any {
        const epicLinkValue = this.state.fieldValues[this.state.epicFieldInfo.epicLink.id];
        let epicLinkKey: string = '';

        if (epicLinkValue) {
            if (typeof epicLinkValue === 'object' && epicLinkValue.value) {
                epicLinkKey = epicLinkValue.value;
            } else if (typeof epicLinkValue === 'string') {
                epicLinkKey = epicLinkValue;
            }
        }

        const parentIconUrl =
            this.state.fieldValues['parent'] && this.state.fieldValues['parent'].issuetype
                ? this.state.fieldValues['parent'].issuetype.iconUrl
                : undefined;
        const itIconUrl = this.state.fieldValues['issuetype'] ? this.state.fieldValues['issuetype'].iconUrl : undefined;
        return (
            <div>
                {this.state.showPMF && (
                    <PMFBBanner
                        onPMFOpen={() => this.onPMFOpen()}
                        onPMFVisiblity={(visible: boolean) => this.setState({ showPMF: visible })}
                        onPMFLater={() => this.onPMFLater()}
                        onPMFNever={() => this.onPMFNever()}
                        onPMFSubmit={(data: PMFData) => this.onPMFSubmit(data)}
                    />
                )}
                <div className="ac-page-header">
                    <div className="ac-breadcrumbs">
                        {epicLinkValue && epicLinkKey !== '' && (
                            <React.Fragment>
                                <NavItem
                                    text={epicLinkKey}
                                    onItemClick={() =>
                                        this.handleOpenIssue({ siteDetails: this.state.siteDetails, key: epicLinkKey })
                                    }
                                />
                                <span className="ac-breadcrumb-divider">/</span>
                            </React.Fragment>
                        )}
                        {this.state.fieldValues['parent'] && (
                            <React.Fragment>
                                <NavItem
                                    text={this.state.fieldValues['parent'].key}
                                    iconUrl={parentIconUrl}
                                    onItemClick={() =>
                                        this.handleOpenIssue({
                                            siteDetails: this.state.siteDetails,
                                            key: this.state.fieldValues['parent']
                                        })
                                    }
                                />
                                <span className="ac-breadcrumb-divider">/</span>
                            </React.Fragment>
                        )}

                        <Tooltip
                            content={`Created on ${format(this.state.fieldValues['created'], 'YYYY-MM-DD h:mm A')}`}
                        >
                            <NavItem
                                text={`${this.state.key}`}
                                href={`${this.state.siteDetails.baseLinkUrl}/browse/${this.state.key}`}
                                iconUrl={itIconUrl}
                                onCopy={this.handleCopyIssueLink}
                            />
                        </Tooltip>
                    </div>
                    <h2>{this.getInputMarkup(this.state.fields['summary'], true)}</h2>
                </div>
                {this.state.isErrorBannerOpen && (
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                )}
                {includeCommonSidebar && this.commonSidebar()}
                {this.state.fields['description'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['description'].name}</label>
                        {this.getInputMarkup(this.state.fields['description'], true)}
                    </div>
                )}
                {this.state.fields['attachment'] &&
                    this.state.fieldValues['attachment'] &&
                    this.state.fieldValues['attachment'].length > 0 && (
                        <div className="ac-vpadding">
                            <label className="ac-field-label">{this.state.fields['attachment'].name}</label>
                            <AttachmentList
                                onDelete={this.handleDeleteAttachment}
                                attachments={this.state.fieldValues['attachment']}
                            />
                        </div>
                    )}

                {this.state.fields['environment'] &&
                    this.state.fieldValues['environment'] &&
                    this.state.fieldValues['environment'].trim() !== '' && (
                        <div className="ac-vpadding">
                            <label className="ac-field-label">{this.state.fields['environment'].name}</label>
                            {this.getInputMarkup(this.state.fields['environment'], true)}
                        </div>
                    )}

                {this.state.isEpic && this.state.epicChildren.length > 0 && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">Issues in this epic</label>
                        <IssueList issues={this.state.epicChildren} onIssueClick={this.handleOpenIssue} />
                    </div>
                )}

                {this.state.fields['subtasks'] &&
                    this.state.fieldValues['subtasks'] &&
                    !this.state.isEpic &&
                    !this.state.fieldValues['issuetype'].subtask && (
                        <div className="ac-vpadding">
                            {this.getInputMarkup(this.state.fields['subtasks'], true)}
                            <IssueList
                                issues={this.state.fieldValues['subtasks']}
                                onIssueClick={this.handleOpenIssue}
                            />
                        </div>
                    )}
                {this.state.fields['issuelinks'] && (
                    <div className="ac-vpadding">
                        {this.getInputMarkup(this.state.fields['issuelinks'], true)}
                        <LinkedIssues
                            issuelinks={this.state.fieldValues['issuelinks']}
                            onIssueClick={this.handleOpenIssue}
                            onDelete={this.handleDeleteIssuelink}
                        />
                    </div>
                )}
                {this.state.fields['worklog'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['worklog'].name}</label>
                        <Worklogs worklogs={this.state.fieldValues['worklog']} />
                    </div>
                )}
                {this.advancedMain()}
                {this.state.fields['comment'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['comment'].name}</label>
                        {this.state.fieldValues['comment'].comments.map((comment: JiraComment) => (
                            <CommentComponent
                                key={`${comment.id}::${comment.updated}`}
                                siteDetails={this.state.siteDetails}
                                isServiceDeskProject={
                                    this.state.fieldValues['project'] &&
                                    this.state.fieldValues['project'].projectTypeKey === 'service_desk'
                                }
                                comment={comment}
                                fetchUsers={this.fetchUsers}
                                onSave={this.handleUpdateComment}
                                onDelete={this.handleDeleteComment}
                            />
                        ))}
                        {this.getInputMarkup(this.state.fields['comment'], true)}
                    </div>
                )}
            </div>
        );
    }

    commonSidebar(): any {
        const originalEstimate: string = this.state.fieldValues['timetracking']
            ? this.state.fieldValues['timetracking'].originalEstimate
            : '';
        const numWatches: string =
            this.state.fieldValues['watches'] && this.state.fieldValues['watches'].watchCount > 0
                ? this.state.fieldValues['watches'].watchCount
                : '';

        const numVotes: string =
            this.state.fieldValues['votes'] && this.state.fieldValues['votes'].votes > 0
                ? this.state.fieldValues['votes'].votes
                : '';

        const allowVoting: boolean =
            this.state.fieldValues['reporter'] &&
            this.state.currentUser &&
            this.state.fieldValues['reporter'].accountId !== this.state.currentUser.accountId;

        return (
            <React.Fragment>
                <ButtonGroup>
                    <Tooltip content="Refresh">
                        <Button
                            className="ac-button-secondary"
                            onClick={this.handleRefresh}
                            iconBefore={<RefreshIcon label="refresh" />}
                            isLoading={this.state.loadingField === 'refresh'}
                        />
                    </Tooltip>
                    {this.state.fields['worklog'] && (
                        <div className="ac-inline-dialog">
                            <InlineDialog
                                content={
                                    <WorklogForm
                                        onSave={(val: any) =>
                                            this.handleInlineDialogSave(this.state.fields['worklog'], val)
                                        }
                                        onCancel={this.handleInlineDialogClose}
                                        originalEstimate={originalEstimate}
                                    />
                                }
                                isOpen={this.state.currentInlineDialog === 'worklog'}
                                onClose={this.handleInlineDialogClose}
                                placement="left-start"
                            >
                                <Tooltip content="Log work">
                                    <Button
                                        className="ac-button-secondary"
                                        onClick={this.handleOpenWorklogEditor}
                                        iconBefore={<EmojiFrequentIcon label="Log Work" />}
                                        isLoading={this.state.loadingField === 'worklog'}
                                    />
                                </Tooltip>
                            </InlineDialog>
                        </div>
                    )}
                    {this.state.fields['attachment'] && (
                        <div className="ac-inline-dialog">
                            <Tooltip content="Add Attachment">
                                <Button
                                    className="ac-button-secondary"
                                    onClick={this.handleOpenAttachmentEditor}
                                    iconBefore={<EditorAttachmentIcon label="Add Attachment" />}
                                    isLoading={this.state.loadingField === 'attachment'}
                                />
                            </Tooltip>

                            <AttachmentsModal
                                isOpen={this.state.currentInlineDialog === 'attachment'}
                                onCancel={this.handleInlineDialogClose}
                                onSave={this.handleAddAttachments}
                            />
                        </div>
                    )}
                    {this.state.fields['watches'] && (
                        <div className="ac-inline-dialog">
                            <InlineDialog
                                content={
                                    <WatchesForm
                                        onFetchUsers={async (input: string) => await this.fetchUsers(input)}
                                        onAddWatcher={this.handleAddWatcher}
                                        onRemoveWatcher={this.handleRemoveWatcher}
                                        currentUser={this.state.currentUser}
                                        onClose={this.handleInlineDialogClose}
                                        watches={this.state.fieldValues['watches']}
                                    />
                                }
                                isOpen={this.state.currentInlineDialog === 'watches'}
                                onClose={this.handleInlineDialogClose}
                                placement="left-start"
                            >
                                <Tooltip content="Watch options">
                                    <Button
                                        className="ac-button-secondary"
                                        onClick={this.handleOpenWatchesEditor}
                                        iconBefore={
                                            this.state.fieldValues['watches'].isWatching ? (
                                                <WatchFilledIcon label="Watches" />
                                            ) : (
                                                <WatchIcon label="Watches" />
                                            )
                                        }
                                        isLoading={this.state.loadingField === 'watches'}
                                    >
                                        {numWatches}
                                    </Button>
                                </Tooltip>
                            </InlineDialog>
                        </div>
                    )}
                    {this.state.fields['votes'] && (
                        <div className="ac-inline-dialog">
                            <InlineDialog
                                content={
                                    <VotesForm
                                        onAddVote={this.handleAddVote}
                                        onRemoveVote={this.handleRemoveVote}
                                        currentUser={this.state.currentUser}
                                        onClose={this.handleInlineDialogClose}
                                        allowVoting={allowVoting}
                                        votes={this.state.fieldValues['votes']}
                                    />
                                }
                                isOpen={this.state.currentInlineDialog === 'votes'}
                                onClose={this.handleInlineDialogClose}
                                placement="left-start"
                            >
                                <Tooltip content="Vote options">
                                    <Button
                                        className="ac-button-secondary"
                                        onClick={this.handleOpenVotesEditor}
                                        iconBefore={
                                            this.state.fieldValues['votes'].hasVoted ? (
                                                <StarFilledIcon label="Votes" />
                                            ) : (
                                                <StarIcon label="Votes" />
                                            )
                                        }
                                        isLoading={this.state.loadingField === 'votes'}
                                    >
                                        {numVotes}
                                    </Button>
                                </Tooltip>
                            </InlineDialog>
                        </div>
                    )}
                    <Tooltip content="Create a branch and transition this issue">
                        <Button
                            className="ac-button"
                            onClick={this.handleStartWorkOnIssue}
                            iconBefore={<BitbucketBranchesIcon label="Start work" />}
                            isLoading={false}
                        >
                            Start work
                        </Button>
                    </Tooltip>
                </ButtonGroup>
                {this.state.fields['status'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['status'].name}</label>
                        <TransitionMenu
                            transitions={this.state.selectFieldOptions['transitions']}
                            currentStatus={this.state.fieldValues['status']}
                            isStatusButtonLoading={this.state.loadingField === 'status'}
                            onStatusChange={this.handleStatusChange}
                        />
                    </div>
                )}
                {this.state.fields['assignee'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['assignee'].name}</label>
                        {this.getInputMarkup(this.state.fields['assignee'], true)}
                    </div>
                )}
                {this.state.fields['reporter'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['reporter'].name}</label>
                        {this.getInputMarkup(this.state.fields['reporter'], true)}
                    </div>
                )}
                {this.state.fields['labels'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['labels'].name}</label>
                        {this.getInputMarkup(this.state.fields['labels'], true)}
                    </div>
                )}
                {this.state.fields['priority'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['priority'].name}</label>
                        {this.getInputMarkup(this.state.fields['priority'], true)}
                    </div>
                )}
                {this.state.fields['components'] && (
                    <div className="ac-vpadding" onClick={(e: any) => e.stopPropagation()}>
                        <label className="ac-field-label">{this.state.fields['components'].name}</label>
                        {this.getInputMarkup(this.state.fields['components'], true)}
                    </div>
                )}
                {this.state.fields['fixVersions'] && (
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{this.state.fields['fixVersions'].name}</label>
                        {this.getInputMarkup(this.state.fields['fixVersions'], true)}
                    </div>
                )}
            </React.Fragment>
        );
    }

    advancedSidebar(): any {
        let markups: any[] = [];

        this.advancedSidebarFields.forEach(field => {
            if (field.advanced && field.uiType !== UIType.NonEditable) {
                if (field.uiType === UIType.Timetracking) {
                    field.name = 'Original estimate';
                }
                markups.push(
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{field.name}</label>
                        {this.getInputMarkup(field, true)}
                    </div>
                );
            }
        });

        if (this.state.recentPullRequests && this.state.recentPullRequests.length > 0) {
            markups.push(
                <div className="ac-vpadding">
                    <label className="ac-field-label">Recent pull requests</label>
                    {this.state.recentPullRequests.map(pr => {
                        return (
                            <PullRequests
                                pullRequests={this.state.recentPullRequests}
                                onClick={(pr: any) => this.postMessage({ action: 'openPullRequest', prHref: pr.url })}
                            />
                        );
                    })}
                </div>
            );
        }

        return markups;
    }

    advancedMain(): any {
        let markups: any[] = [];

        this.advancedMainFields.forEach(field => {
            if (field.advanced && field.uiType !== UIType.NonEditable) {
                markups.push(
                    <div className="ac-vpadding">
                        <label className="ac-field-label">{field.name}</label>
                        {this.getInputMarkup(field, true)}
                    </div>
                );
            }
        });

        return markups;
    }

    public render() {
        if (
            (Object.keys(this.state.fields).length < 1 || Object.keys(this.state.fieldValues).length < 1) &&
            !this.state.isErrorBannerOpen &&
            this.state.isOnline
        ) {
            this.postMessage({ action: 'refreshIssue' });
            return <AtlLoader />;
        }

        if (!this.state.isOnline) {
            return <Offline />;
        }

        return (
            <Page>
                <WidthDetector>
                    {(width?: number) => {
                        if (width && width < 800) {
                            return (
                                <div style={{ margin: '20px 16px 0px 16px' }}>
                                    {this.getMainPanelMarkup(true)}
                                    <Collapsible
                                        trigger="show more"
                                        triggerWhenOpen="show less"
                                        triggerClassName="ac-collapsible-trigger"
                                        triggerOpenedClassName="ac-collapsible-trigger"
                                        triggerTagName="label"
                                        easing="ease-out"
                                        transitionTime={150}
                                        overflowWhenOpen="visible"
                                    >
                                        {this.advancedSidebar()}
                                    </Collapsible>
                                    <div className="ac-issue-created-updated">
                                        {this.state.fieldValues['created'] && (
                                            <div>Created {this.state.fieldValues['created']}</div>
                                        )}
                                        {this.state.fieldValues['updated'] && (
                                            <div>Updated {this.state.fieldValues['updated']}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div style={{ maxWidth: '1200px', margin: '20px auto 0 auto' }}>
                                <Grid layout="fluid">
                                    <GridColumn medium={8}>{this.getMainPanelMarkup(false)}</GridColumn>
                                    <GridColumn medium={4}>
                                        {this.commonSidebar()}
                                        <Collapsible
                                            trigger="show more"
                                            triggerWhenOpen="show less"
                                            triggerClassName="ac-collapsible-trigger"
                                            triggerOpenedClassName="ac-collapsible-trigger"
                                            triggerTagName="label"
                                            easing="ease-out"
                                            transitionTime={150}
                                            overflowWhenOpen="visible"
                                        >
                                            {this.advancedSidebar()}
                                        </Collapsible>
                                        <div className="ac-issue-created-updated">
                                            {this.state.fieldValues['created'] && (
                                                <div>
                                                    Created{' '}
                                                    {`${distanceInWordsToNow(this.state.fieldValues['created'])} ago`}
                                                </div>
                                            )}
                                            {this.state.fieldValues['updated'] && (
                                                <div>
                                                    Updated{' '}
                                                    {`${distanceInWordsToNow(this.state.fieldValues['updated'])} ago`}
                                                </div>
                                            )}
                                        </div>
                                    </GridColumn>
                                </Grid>
                            </div>
                        );
                    }}
                </WidthDetector>
            </Page>
        );
    }
}
