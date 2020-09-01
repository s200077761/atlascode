import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    AppBar,
    Avatar,
    Box,
    Breadcrumbs,
    Button,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Link,
    makeStyles,
    Paper,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
} from '@material-ui/core';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useEffect, useState } from 'react';
import { ApprovalStatus, User } from '../../../bitbucket/model';
import { BasicPanel } from '../common/BasicPanel';
import CommentForm from '../common/CommentForm';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ApproveButton } from './ApproveButton';
import { BranchInfo } from './BranchInfo';
import { PRBuildStatus } from './BuildStatus';
import { Commits } from './Commits';
import { DiffList } from './DiffList';
import { InlineTextEditorWrapper } from './InlineTextEditorWrapper';
import { MergeDialog } from './MergeDialog';
import { NeedsWorkButton } from './NeedsWorkButton';
import { NestedCommentList } from './NestedCommentList';
import { PageTaskList } from './PageTaskList';
import { PullRequestDetailsControllerContext, usePullRequestDetailsController } from './pullRequestDetailsController';
import { RelatedBitbucketIssues } from './RelatedBitbucketIssues';
import { RelatedJiraIssues } from './RelatedJiraIssues';
import { Reviewers } from './Reviewers';
import { SummaryPanel } from './SummaryPanel';

const useStyles = makeStyles((theme: Theme) => ({
    grow: {
        flexGrow: 1,
    },
    title: {
        flexGrow: 0,
        marginRight: theme.spacing(3),
        marginLeft: theme.spacing(1),
    },
    paper100: {
        overflow: 'hidden',
        height: '100%',
    },
    paperOverflow: {
        overflow: 'hidden',
    },
}));

export const PullRequestDetailsPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = usePullRequestDetailsController();
    const [currentUserApprovalStatus, setCurrentUserApprovalStatus] = useState<ApprovalStatus>('UNAPPROVED');

    const handleFetchUsers = async (input: string, abortSignal?: AbortSignal): Promise<any> => {
        AwesomeDebouncePromise(
            async (input: string, abortSignal?: AbortSignal): Promise<User[]> => {
                //TODO: Fix this this
                //return await controller.fetchUsers(input, abortSignal);
                return [];
            },
            300,
            { leading: false }
        );
    };

    const isSomethingLoading = useCallback(() => {
        for (const [, value] of Object.entries(state.loadState)) {
            if (value) {
                return true;
            }
        }
        return false;
    }, [state.loadState]);

    useEffect(() => {
        const foundCurrentUser = state.pr.data.participants.find(
            (participant) => participant.accountId === state.currentUser.accountId
        );
        if (foundCurrentUser) {
            setCurrentUserApprovalStatus(foundCurrentUser.status);
        }
    }, [state.pr.data.participants, state.currentUser.accountId]);

    return (
        <PullRequestDetailsControllerContext.Provider value={controller}>
            <Container maxWidth="xl">
                <AppBar position="relative">
                    <Toolbar>
                        <Box flexGrow={1}>
                            <InlineTextEditorWrapper title={state.pr.data.title} onSave={controller.updateTitle} />
                        </Box>

                        <Box marginLeft={1}>
                            <NeedsWorkButton
                                hidden={
                                    state.pr.site.details.isCloud ||
                                    state.currentUser.accountId === state.pr.data.author.accountId
                                }
                                status={currentUserApprovalStatus}
                                onApprove={controller.updateApprovalStatus}
                            />
                        </Box>
                        <Box marginLeft={1}>
                            <ApproveButton
                                hidden={
                                    !state.pr.site.details.isCloud &&
                                    state.currentUser.accountId === state.pr.data.author.accountId
                                }
                                status={currentUserApprovalStatus}
                                onApprove={controller.updateApprovalStatus}
                            />
                        </Box>
                        <RefreshButton loading={isSomethingLoading()} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1} direction="row">
                    <Grid item xs={12} md={9} lg={9} xl={9}>
                        <Paper className={classes.paper100}>
                            <Box margin={2}>
                                <Grid container spacing={3} direction="column" justify="center">
                                    <ErrorDisplay />

                                    <Grid item>
                                        <SummaryPanel
                                            rawSummary={state.pr.data.rawSummary}
                                            htmlSummary={state.pr.data.htmlSummary}
                                            fetchUsers={handleFetchUsers}
                                            summaryChange={controller.updateSummary}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            title={'Related Jira Issues'}
                                            subtitle={`${state.relatedJiraIssues.length} issues`}
                                            isLoading={state.loadState.relatedJiraIssues}
                                            hideCondition={state.relatedJiraIssues.length === 0}
                                        >
                                            <RelatedJiraIssues
                                                relatedIssues={state.relatedJiraIssues}
                                                openJiraIssue={controller.openJiraIssue}
                                            />
                                        </BasicPanel>
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            title={'Related Bitbucket Issues'}
                                            subtitle={`${state.relatedBitbucketIssues.length} issues`}
                                            isLoading={state.loadState.relatedBitbucketIssues}
                                            hideCondition={state.relatedBitbucketIssues.length === 0}
                                        >
                                            <RelatedBitbucketIssues
                                                relatedIssues={state.relatedBitbucketIssues}
                                                openBitbucketIssue={controller.openBitbucketIssue}
                                            />
                                        </BasicPanel>
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            title={'Commits'}
                                            subtitle={`${state.commits.length} commits`}
                                            isDefaultExpanded
                                            isLoading={state.loadState.commits}
                                        >
                                            <Commits commits={state.commits} />
                                        </BasicPanel>
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            title={'Tasks'}
                                            subtitle={`${state.tasks.filter((task) => task.isComplete).length} of ${
                                                state.tasks.length
                                            } complete`}
                                            isDefaultExpanded
                                            isLoading={state.loadState.tasks}
                                        >
                                            <PageTaskList
                                                tasks={state.tasks}
                                                onEdit={controller.editTask}
                                                onDelete={controller.deleteTask}
                                            />
                                        </BasicPanel>
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            title={'Files Changed'}
                                            subtitle={'Click on file names to open diff in editor'}
                                            isDefaultExpanded
                                            isLoading={state.loadState.diffs}
                                        >
                                            <DiffList
                                                fileDiffs={state.fileDiffs}
                                                openDiffHandler={controller.openDiff}
                                            />
                                        </BasicPanel>
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            title={'Comments'}
                                            isDefaultExpanded
                                            isLoading={state.loadState.comments}
                                        >
                                            <Grid container spacing={2} direction="column">
                                                <Grid item>
                                                    <NestedCommentList
                                                        comments={state.comments}
                                                        currentUser={state.currentUser}
                                                        onDelete={controller.deleteComment}
                                                    />
                                                </Grid>
                                                <Grid item>
                                                    <CommentForm
                                                        currentUser={state.currentUser}
                                                        onSave={controller.postComment}
                                                    />
                                                </Grid>
                                            </Grid>
                                        </BasicPanel>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3} xl={3}>
                        <Paper className={classes.paperOverflow}>
                            <Box margin={2}>
                                <Grid container spacing={2} direction={'column'}>
                                    <Grid item>
                                        <Grid container spacing={1} direction={'row'}>
                                            <Grid item>
                                                <Button
                                                    color="primary"
                                                    disabled={
                                                        state.pr.data.source.branchName === state.currentBranchName
                                                    }
                                                    variant={'contained'}
                                                    onClick={controller.checkoutBranch}
                                                >
                                                    <Typography variant="button" noWrap>
                                                        {state.pr.data.source.branchName === state.currentBranchName
                                                            ? 'Source branch checked out'
                                                            : 'Checkout source branch'}
                                                    </Typography>
                                                </Button>
                                            </Grid>
                                            <Grid item>
                                                <MergeDialog
                                                    prData={state.pr.data}
                                                    commits={state.commits}
                                                    relatedJiraIssues={state.relatedJiraIssues}
                                                    relatedBitbucketIssues={state.relatedBitbucketIssues}
                                                    mergeStrategies={state.mergeStrategies}
                                                    loadState={{
                                                        basicData: state.loadState.basicData,
                                                        commits: state.loadState.commits,
                                                        mergeStrategies: state.loadState.mergeStrategies,
                                                        relatedJiraIssues: state.loadState.relatedJiraIssues,
                                                        relatedBitbucketIssues: state.loadState.relatedBitbucketIssues,
                                                    }}
                                                    merge={controller.merge}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Divider />
                                    </Grid>

                                    <Grid item>
                                        <Grid container spacing={3} direction="row" alignItems={'center'}>
                                            <Grid item>
                                                <Typography variant="body1">Author:</Typography>
                                            </Grid>
                                            <Grid item>
                                                <Box hidden={state.loadState.basicData}>
                                                    <Tooltip title={state.pr.data.author.displayName}>
                                                        <Avatar
                                                            alt={state.pr.data.author.displayName}
                                                            src={state.pr.data.author.avatarUrl}
                                                        />
                                                    </Tooltip>
                                                </Box>
                                                <Box hidden={!state.loadState.basicData}>
                                                    <CircularProgress />
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </Grid>

                                    <Grid item>
                                        <Divider />
                                    </Grid>
                                    <Grid item>
                                        <Grid container spacing={3} direction="row" alignItems={'center'}>
                                            <Grid item>
                                                <Typography variant="body1">Reviewers:</Typography>
                                            </Grid>
                                            <Grid item>
                                                <Reviewers
                                                    site={state.pr.site}
                                                    participants={state.pr.data.participants}
                                                    onUpdateReviewers={controller.updateReviewers}
                                                    isLoading={state.loadState.basicData}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Divider />
                                    </Grid>
                                    <Grid item>
                                        <Grid container spacing={3} direction="row" alignItems={'center'}>
                                            <Grid item>
                                                <Typography variant="body1">Branch:</Typography>
                                            </Grid>
                                            <Grid item>
                                                <BranchInfo
                                                    source={state.pr.data.source}
                                                    destination={state.pr.data.destination}
                                                    author={state.pr.data.author}
                                                    isLoading={state.loadState.basicData}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Divider />
                                    </Grid>
                                    <Grid item>
                                        <BasicPanel
                                            /*isLoading={state.loadState.buildStatuses}*/ isLoading={false}
                                            isDefaultExpanded
                                            hideCondition={state.buildStatuses.length === 0}
                                            title={`${
                                                state.buildStatuses.filter((status) => status.state === 'SUCCESSFUL')
                                                    .length
                                            } of ${state.buildStatuses.length} build${
                                                state.buildStatuses.length > 0 ? 's' : ''
                                            } passed`}
                                        >
                                            <PRBuildStatus
                                                buildStatuses={state.buildStatuses}
                                                openBuildStatus={controller.openBuildStatus}
                                            />
                                        </BasicPanel>
                                    </Grid>
                                    <Grid item>
                                        <Divider />
                                    </Grid>
                                    <Grid item>
                                        <Box hidden={state.loadState.basicData}>
                                            <Breadcrumbs aria-label="breadcrumb">
                                                <Link color="textSecondary" href={state.pr.data.destination!.repo.url}>
                                                    {state.pr.data.destination!.repo.displayName}
                                                </Link>
                                                <Link
                                                    color="textSecondary"
                                                    href={`${state.pr.data.destination!.repo.url}/pull-requests`}
                                                >
                                                    {'Pull request'}
                                                </Link>
                                                <Link
                                                    color="textPrimary"
                                                    href={state.pr.data.url}
                                                    //TODO: onCopy={handleCopyLink}
                                                >
                                                    {`Pull request #${state.pr.data.id}`}
                                                </Link>
                                            </Breadcrumbs>
                                        </Box>
                                        <Box hidden={!state.loadState.basicData}>
                                            <CircularProgress />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </PullRequestDetailsControllerContext.Provider>
    );
};

export default PullRequestDetailsPage;
