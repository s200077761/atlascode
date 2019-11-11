import Avatar, { AvatarItem } from "@atlaskit/avatar";
import { BreadcrumbsItem, BreadcrumbsStateless } from '@atlaskit/breadcrumbs';
import Button, { ButtonGroup } from "@atlaskit/button";
import Bug16Icon from '@atlaskit/icon-object/glyph/bug/16';
import Improvement16Icon from '@atlaskit/icon-object/glyph/improvement/16';
import PriorityBlockerIcon from '@atlaskit/icon-priority/glyph/priority-blocker';
import PriorityCriticalIcon from '@atlaskit/icon-priority/glyph/priority-critical';
import PriorityMajorIcon from '@atlaskit/icon-priority/glyph/priority-major';
import PriorityMinorIcon from '@atlaskit/icon-priority/glyph/priority-minor';
import PriorityTrivialIcon from '@atlaskit/icon-priority/glyph/priority-trivial';
import LightbulbFilledIcon from '@atlaskit/icon/glyph/lightbulb-filled';
import OpenIcon from '@atlaskit/icon/glyph/open';
import RefreshIcon from '@atlaskit/icon/glyph/refresh';
import StarIcon from '@atlaskit/icon/glyph/star';
import TaskIcon from '@atlaskit/icon/glyph/task';
import VidPlayIcon from '@atlaskit/icon/glyph/vid-play';
import VidRaisedHandIcon from '@atlaskit/icon/glyph/vid-raised-hand';
import WatchIcon from '@atlaskit/icon/glyph/watch';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Panel from '@atlaskit/panel';
import SizeDetector from "@atlaskit/size-detector";
import Tooltip from '@atlaskit/tooltip';
import { distanceInWordsToNow, format } from "date-fns";
import React from "react";
import uuid from "uuid";
import { BitbucketIssue, BitbucketIssueData, emptyBitbucketSite, UnknownUser } from "../../../bitbucket/model";
import { AssignToMe, CopyBitbucketIssueLink, CreateJiraIssueAction, OpenStartWorkPageAction, PostChange, PostComment } from "../../../ipc/bitbucketIssueActions";
import { BitbucketIssueMessageData } from "../../../ipc/bitbucketIssueMessaging";
import { RefreshIssueAction } from "../../../ipc/issueActions";
import { HostErrorMessage } from "../../../ipc/messaging";
import { FetchUsers } from "../../../ipc/prActions";
import { FetchUsersResult } from "../../../ipc/prMessaging";
import { AtlLoader } from "../AtlLoader";
import ErrorBanner from "../ErrorBanner";
import NavItem from "../issue/NavItem";
import Offline from "../Offline";
import CommentForm from "../pullrequest/CommentForm";
import Comments from "../pullrequest/Comments";
import { WebviewComponent } from "../WebviewComponent";
import { StatusMenu } from "./StatusMenu";

type SizeMetrics = {
    width: number;
    height: number;
};

const priorityIcon = {
    trivial: <PriorityTrivialIcon label='trivial' />,
    minor: <PriorityMinorIcon label='minor' />,
    major: <PriorityMajorIcon label='major' />,
    critical: <PriorityCriticalIcon label='critical' />,
    blocker: <PriorityBlockerIcon label='blocker' />
};

const typeIcon = {
    bug: <Bug16Icon label='bug' />,
    enhancement: <Improvement16Icon label='enhancement' />,
    proposal: <LightbulbFilledIcon label='proposal' primaryColor='0xFFAB00' />,
    task: <TaskIcon label='task' primaryColor='0x2684FF' />
};

type Emit = PostComment
    | PostChange
    | CopyBitbucketIssueLink
    | AssignToMe
    | RefreshIssueAction
    | OpenStartWorkPageAction
    | CreateJiraIssueAction
    | FetchUsers;

type Receive = BitbucketIssueMessageData | FetchUsersResult | HostErrorMessage;

type MyState = {
    data: BitbucketIssueMessageData;
    isStatusButtonLoading: boolean;
    isAnyCommentLoading: boolean;
    isErrorBannerOpen: boolean;
    isOnline: boolean;
    errorDetails: any;
};

const emptyIssueData: BitbucketIssueMessageData = {
    type: "updateBitbucketIssue",
    issue: { site: emptyBitbucketSite, data: {} },
    currentUser: UnknownUser,
    comments: [],
    hasMore: false,
    showJiraButton: false,
};

const emptyState = {
    data: emptyIssueData,
    isStatusButtonLoading: false,
    isAnyCommentLoading: false,
    isErrorBannerOpen: false,
    isOnline: true,
    errorDetails: undefined
};

export default class BitbucketIssuePage extends WebviewComponent<Emit, Receive, {}, MyState> {
    private nonce: string;
    private userSuggestions: any;

    constructor(props: any) {
        super(props);
        this.state = emptyState;
    }

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isStatusButtonLoading: false, isAnyCommentLoading: false, isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'updateBitbucketIssue': {
                this.setState({ data: e, isStatusButtonLoading: false, isAnyCommentLoading: false });
                break;
            }
            case 'fetchUsersResult': {
                this.userSuggestions = e.users;
                break;
            }
            case 'onlineStatus': {
                this.setState({ isOnline: e.isOnline });

                if (e.isOnline) {
                    this.postMessage({ action: 'refreshIssue' });
                }

                break;
            }
        }
        return true;
    }

    handleCopyLink = () => this.postMessage({ action: 'copyBitbucketIssueLink' });

    handleAssign = () => this.postMessage({ action: 'assign' });

    handleStatusChange = (newStatus: string, content?: string) => {
        this.setState({ isStatusButtonLoading: true });
        this.postMessage({ action: 'change', newStatus: newStatus, content: content });
    };
    handlePostComment = (content: string) => {
        this.setState({ isAnyCommentLoading: true });
        this.postMessage({ action: 'comment', content: content });
    };

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    loadUserOptions = (input: string): Promise<any> => {
        return new Promise(resolve => {
            this.userSuggestions = undefined;
            const nonce = uuid.v4();
            this.postMessage({ action: 'fetchUsers', nonce: nonce, query: input, site: this.state.data.issue.site });

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

    renderDetails(issueData: BitbucketIssueData) {
        return <div style={{ padding: '2em' }}>
            <ButtonGroup>
                <Tooltip content='Watches'>
                    <Button className='ac-button' iconBefore={<WatchIcon label="Watches" />}>
                        {issueData.watches}
                    </Button>
                </Tooltip>
                <Tooltip content='Votes'>
                    <Button className='ac-button' iconBefore={<StarIcon label="Votes" />}>
                        {issueData.votes}
                    </Button>
                </Tooltip>
                <Button className='ac-button' iconBefore={<VidPlayIcon label="Start work" />} onClick={() => this.postMessage({ action: 'openStartWorkPage' })}>Start work</Button>
                <Button className='ac-button' onClick={() => this.postMessage({ action: 'refreshIssue' })}>
                    <RefreshIcon label="refresh" size="small"></RefreshIcon>
                </Button>
            </ButtonGroup>
            {this.state.data.showJiraButton &&
                <div className='ac-vpadding'>
                    <Button className='ac-button' onClick={() => this.postMessage({ action: 'createJiraIssue' })}>Create Jira Issue</Button>
                </div>
            }
            <div className='ac-vpadding'>
                <label className='ac-field-label'>Status</label>
                <StatusMenu issueData={issueData} isStatusButtonLoading={this.state.isStatusButtonLoading} onHandleStatusChange={(newStatus: string) => this.handleStatusChange(newStatus)} />
            </div>
            <div className='ac-vpadding'>
                <label className='ac-field-label'>Type</label>
                <div className='ac-icon-with-text'>{typeIcon[issueData.kind!]}<span style={{ paddingLeft: '1em' }}>{issueData.kind}</span></div>
            </div>
            <div className='ac-vpadding'>
                <label className='ac-field-label'>Priority</label>
                <div className='ac-icon-with-text'>{priorityIcon[issueData.priority!]}<span style={{ paddingLeft: '1em' }}>{issueData.priority}</span></div>
            </div>
            <div className='ac-vpadding'>
                <label className='ac-field-label'>Assignee</label>
                <Tooltip content={issueData.assignee ? issueData.assignee.display_name : 'Unassigned'}>
                    <AvatarItem
                        avatar={<Avatar size='small' src={issueData.assignee ? issueData.assignee.links!.avatar!.href! : null} />}
                        primaryText={issueData.assignee ? issueData.assignee.display_name : 'Unassigned'}
                    />
                </Tooltip>
                {!(issueData.assignee && issueData.assignee!.account_id === this.state.data!.currentUser.accountId) &&
                    <Button appearance='subtle' onClick={this.handleAssign} iconBefore={<VidRaisedHandIcon label='assign-to-me' />}>Assign to me</Button>}
            </div>
            <div className='ac-vpadding'>
                <label className='ac-field-label'>Reporter</label>
                <Tooltip content={issueData.reporter ? issueData.reporter.display_name : 'Unknown'}>
                    <AvatarItem
                        avatar={<Avatar size='small' src={issueData.reporter ? issueData.reporter.links!.avatar!.href! : null} />}
                        primaryText={issueData.reporter ? issueData.reporter.display_name : 'Unknown'}
                    />
                </Tooltip>
            </div>
        </div >;
    }

    render() {
        const issue: BitbucketIssue = this.state.data.issue;

        if (!issue.data.repository && !this.state.isErrorBannerOpen && this.state.isOnline) {
            this.postMessage({ action: 'refreshIssue' });
            return <AtlLoader />;
        } else if (!issue.data.repository && !this.state.isOnline) {
            return <div><Offline /></div>;
        }

        const issueData = issue.data;


        return (
            <Page>
                {!this.state.isOnline &&
                    <Offline />
                }
                <SizeDetector>
                    {({ width }: SizeMetrics) => {
                        return <Grid>
                            <GridColumn medium={width > 800 ? 8 : 12}>
                                {this.state.isErrorBannerOpen &&
                                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                                }
                                <PageHeader
                                    breadcrumbs={<BreadcrumbsStateless onExpand={() => { }}>
                                        <BreadcrumbsItem component={() => <NavItem text={issueData.repository!.name!} href={issueData.repository!.links!.html!.href} />} />
                                        <BreadcrumbsItem component={() => <NavItem text='Issues' href={`${issueData.repository!.links!.html!.href}/issues`} />} />
                                        <BreadcrumbsItem component={() => <NavItem text={`Issue #${issueData.id}`} href={issueData.links!.html!.href} onCopy={this.handleCopyLink} />} />
                                    </BreadcrumbsStateless>}
                                >
                                    <Tooltip content={`Created on ${format(issueData.created_on, 'YYYY-MM-DD h:mm A')}`}>
                                        <React.Fragment>
                                            <p>{issueData.title}</p>
                                            <p style={{ fontSize: 13, color: 'silver' }}>{`Created ${distanceInWordsToNow(issueData.created_on)} ago`}</p>
                                        </React.Fragment>
                                    </Tooltip>
                                </PageHeader>
                                <p dangerouslySetInnerHTML={{ __html: issueData.content!.html! }} />

                                {width <= 800 && this.renderDetails(issueData)}

                                <Panel isDefaultExpanded header={<h3>Comments</h3>} >
                                    {this.state.data!.hasMore &&
                                        <div className='ac-vpadding' style={{ textAlign: 'center' }}>
                                            <Button appearance='subtle' href={issueData.links!.html!.href} iconAfter={<OpenIcon label='open-previous' />}>See previous comments</Button>
                                        </div>
                                    }
                                    <Comments comments={this.state.data!.comments} currentUser={this.state.data!.currentUser} isAnyCommentLoading={this.state.isAnyCommentLoading} onComment={undefined} />
                                    <CommentForm
                                        currentUser={this.state.data!.currentUser!}
                                        visible={true}
                                        isAnyCommentLoading={this.state.isAnyCommentLoading}
                                        onSave={this.handlePostComment}
                                        loadUserOptions={this.loadUserOptions} />
                                </Panel>
                            </GridColumn>

                            {width > 800 &&
                                <GridColumn medium={4}>
                                    {this.renderDetails(issueData)}
                                </GridColumn>
                            }
                        </Grid>;
                    }}
                </SizeDetector>
            </Page>
        );
    }
}
