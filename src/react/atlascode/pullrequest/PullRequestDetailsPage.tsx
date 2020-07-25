import { InlineTextEditor, RefreshButton } from '@atlassianlabs/guipi-core-components';
import { AppBar, Box, Breadcrumbs, Button, Container, Grid, Link, makeStyles, Theme, Toolbar } from '@material-ui/core';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useEffect, useState } from 'react';
import { ApprovalStatus, User } from '../../../bitbucket/model';
import { ApproveButton } from './ApproveButton';
import { BranchInfo } from './BranchInfo';
import { NeedsWorkButton } from './NeedsWorkButton';
import { PullRequestDetailsControllerContext, usePullRequestDetailsController } from './pullRequestDetailsController';
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

    const handleUpdateReviewers = useCallback(
        async (newReviewers: User[]) => {
            await controller.updateReviewers(newReviewers);
        },
        [controller]
    );

    const handleSummaryChange = useCallback(
        async (text: string): Promise<void> => {
            await controller.updateSummary(text);
        },
        [controller]
    );

    const handleTitleChange = useCallback(
        async (text: string): Promise<void> => {
            await controller.updateTitle(text);
        },
        [controller]
    );

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
                        <Breadcrumbs aria-label="breadcrumb">
                            <Link color="textSecondary" href={state.pr.data.destination!.repo.url}>
                                {state.pr.data.destination!.repo.displayName}
                            </Link>
                            <Link color="textSecondary" href={`${state.pr.data.destination!.repo.url}/pull-requests`}>
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

                        <InlineTextEditor fullWidth defaultValue={state.pr.data.title} onSave={handleTitleChange} />

                        <Box className={classes.grow} />
                        <NeedsWorkButton
                            hidden={
                                state.pr.site.details.isCloud ||
                                state.currentUser.accountId === state.pr.data.author.accountId
                            }
                            status={currentUserApprovalStatus}
                            onApprove={controller.updateApprovalStatus}
                        />
                        <ApproveButton
                            hidden={
                                !state.pr.site.details.isCloud &&
                                state.currentUser.accountId === state.pr.data.author.accountId
                            }
                            status={currentUserApprovalStatus}
                            onApprove={controller.updateApprovalStatus}
                        />
                        <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={3} direction="column" justify="center">
                    <Grid item>
                        <Box margin={5}>
                            <Reviewers
                                site={state.pr.site}
                                participants={state.pr.data.participants}
                                onUpdateReviewers={handleUpdateReviewers}
                            />
                        </Box>
                        <BranchInfo
                            source={state.pr.data.source}
                            destination={state.pr.data.destination}
                            author={state.pr.data.author}
                        />
                        <Button
                            disabled={state.pr.data.source.branchName === state.currentBranchName}
                            onClick={controller.checkoutBranch}
                        >
                            {state.pr.data.source.branchName === state.currentBranchName
                                ? 'Source branch checked out'
                                : 'Checkout source branch'}
                        </Button>
                    </Grid>

                    <Grid item>
                        <SummaryPanel
                            rawSummary={state.pr.data.rawSummary}
                            htmlSummary={state.pr.data.htmlSummary}
                            fetchUsers={handleFetchUsers}
                            summaryChange={handleSummaryChange}
                        />
                    </Grid>
                </Grid>
            </Container>
        </PullRequestDetailsControllerContext.Provider>
    );
};

export default PullRequestDetailsPage;
