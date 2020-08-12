import { InlineTextEditor } from '@atlassianlabs/guipi-core-components';
import { MinimalIssue, Transition } from '@atlassianlabs/jira-pi-common-models';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Grid,
    MenuItem,
    TextField,
    Typography,
} from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { DetailedSiteInfo } from '../../../atlclients/authInfo';
import { BitbucketIssue, Commit, MergeStrategy, PullRequestData } from '../../../bitbucket/model';
import { BitbucketTransitionMenu } from './BitbucketTransitionMenu';
import { JiraTransitionMenu } from './JiraTransitionMenu';
import { MergeChecks } from './MergeChecks';

const emptyMergeStrategy: MergeStrategy = {
    label: 'Default merge strategy',
    value: '',
    isDefault: false,
};

type MergeDialogProps = {
    prData: PullRequestData;
    commits: Commit[];
    relatedJiraIssues: MinimalIssue<DetailedSiteInfo>[];
    relatedBitbucketIssues: BitbucketIssue[];
    mergeStrategies: MergeStrategy[];
    merge: (
        mergeStrategy: MergeStrategy,
        commitMessage: string,
        closeSourceBranch: boolean,
        issues: (MinimalIssue<DetailedSiteInfo> | BitbucketIssue)[]
    ) => void;
};

export const MergeDialog: React.FC<MergeDialogProps> = ({
    prData,
    commits,
    relatedJiraIssues,
    relatedBitbucketIssues,
    mergeStrategies,
    merge,
}) => {
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [commitMessage, setCommitMessage] = useState<string>('');
    const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>(emptyMergeStrategy);
    const [transitionedJiraIssues, setTransitionedJiraIssues] = useState<MinimalIssue<DetailedSiteInfo>[]>(
        relatedJiraIssues
    );
    const [transitionedBitbucketIssues, setTransitionedBitbucketIssues] = useState<BitbucketIssue[]>(
        relatedBitbucketIssues
    );
    const [jiraIssuesToTransition] = useState<Map<string, boolean>>(new Map<string, boolean>());
    const [bitbucketIssuesToTransition] = useState<Map<string, boolean>>(new Map<string, boolean>());
    const [closeSourceBranch, setCloseSourceBranch] = useState<boolean>(true);

    const handleMerge = useCallback(() => {
        const jiraIssues = transitionedJiraIssues.filter((issue) => jiraIssuesToTransition.get(issue.id));
        const bitbucketIssues = transitionedBitbucketIssues.filter((issue) =>
            bitbucketIssuesToTransition.get(issue.data.id)
        );
        merge(mergeStrategy, commitMessage, closeSourceBranch, [...jiraIssues, ...bitbucketIssues]);
        setDialogOpen(false);
    }, [
        merge,
        setDialogOpen,
        mergeStrategy,
        commitMessage,
        closeSourceBranch,
        transitionedJiraIssues,
        transitionedBitbucketIssues,
        jiraIssuesToTransition,
        bitbucketIssuesToTransition,
    ]);

    const handleClose = useCallback(() => {
        setDialogOpen(false);
    }, [setDialogOpen]);

    const handleOpen = useCallback(() => {
        setDialogOpen(true);
    }, [setDialogOpen]);

    const handleMergeStrategyChange = useCallback(
        (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            setMergeStrategy(event.target.value);
        },
        []
    );

    const handleCommitMessageChange = useCallback((text: string) => {
        setCommitMessage(text);
    }, []);

    const isEmptyCommitMessage = useCallback((text: string) => {
        return text === '';
    }, []);

    const getDefaultCommitMessage = useCallback(
        (mergeStrategy: MergeStrategy) => {
            const mergeStrategyValue = mergeStrategy.value;
            if (mergeStrategyValue === 'fast_forward') {
                return '';
            }

            const { id, source, title, participants } = prData;

            const branchInfo = `Merged in ${source && source.branchName}`;
            const pullRequestInfo = `(pull request #${id})`;

            let defaultCommitMessage = `${branchInfo} ${pullRequestInfo}\n\n${title}`;

            if (mergeStrategyValue === 'squash') {
                // Minor optimization: if there's exactly 1 commit, and the commit
                // message already matches the pull request title, no need to display the
                // same text twice.
                if (commits.length !== 1 || commits[0].message !== title) {
                    const commitMessages = commits
                        .reverse()
                        .map((commit) => `* ${commit.message}`)
                        .join('\n');
                    defaultCommitMessage += `\n\n${commitMessages}`;
                }
            }

            const approvers = participants.filter((p) => p.status === 'APPROVED');
            if (approvers.length > 0) {
                const approverInfo = approvers.map((approver) => `Approved-by: ${approver.displayName}`).join('\n');
                defaultCommitMessage += `\n\n${approverInfo}`;
            }

            return defaultCommitMessage;
        },
        [commits, prData]
    );

    const handleJiraIssueTransition = useCallback(
        (issueToTransition: MinimalIssue<DetailedSiteInfo>, transition: Transition) => {
            const newTransitionedIssues = transitionedJiraIssues.map((issue) => {
                return issue.key === issueToTransition.key
                    ? {
                          ...issue,
                          status: {
                              ...issue.status,
                              id: transition.to.id,
                              name: transition.to.name,
                          },
                      }
                    : issue;
            });

            setTransitionedJiraIssues(newTransitionedIssues);
        },
        [transitionedJiraIssues]
    );

    const handleBitbucketIssueTransition = useCallback(
        (issueToTransition: BitbucketIssue, transition: string) => {
            const newTransitionedIssues = transitionedBitbucketIssues.map((issue) => {
                return issue.data.id === issueToTransition.data.id
                    ? {
                          ...issue,
                          data: { ...issue.data, state: transition },
                      }
                    : issue;
            });

            setTransitionedBitbucketIssues(newTransitionedIssues);
        },
        [transitionedBitbucketIssues]
    );

    const handleShouldTransitionChangeJira = useCallback(
        (issueId: string, shouldTransition: boolean) => {
            jiraIssuesToTransition.set(issueId, shouldTransition);
        },
        [jiraIssuesToTransition]
    );

    const handleShouldTransitionChangeBitbucket = useCallback(
        (issueId: string, shouldTransition: boolean) => {
            bitbucketIssuesToTransition.set(issueId, shouldTransition);
        },
        [bitbucketIssuesToTransition]
    );

    const handleCloseSourceBranchChange = useCallback(() => setCloseSourceBranch(!closeSourceBranch), [
        closeSourceBranch,
    ]);

    useEffect(() => {
        relatedJiraIssues.forEach((issue) => jiraIssuesToTransition.set(issue.id, true));
        setTransitionedJiraIssues(relatedJiraIssues);
    }, [relatedJiraIssues, jiraIssuesToTransition]);

    useEffect(() => {
        relatedBitbucketIssues.forEach((issue) => bitbucketIssuesToTransition.set(issue.data.id, true));
        setTransitionedBitbucketIssues(relatedBitbucketIssues);
    }, [relatedBitbucketIssues, bitbucketIssuesToTransition]);

    useEffect(() => {
        setCommitMessage(getDefaultCommitMessage(mergeStrategy));
    }, [getDefaultCommitMessage, setCommitMessage, mergeStrategy]);

    useEffect(() => {
        if (mergeStrategy.value === emptyMergeStrategy.value) {
            const defaultMergeStrategy = mergeStrategies.find((strategy) => strategy.isDefault === true);
            setMergeStrategy(defaultMergeStrategy ?? emptyMergeStrategy);
        }
    }, [mergeStrategies, mergeStrategy]);

    return (
        <Box>
            <Button color={'primary'} onClick={handleOpen} disabled={prData.state !== 'OPEN'}>
                <Typography variant={'button'} noWrap>
                    {prData.state === 'OPEN' ? 'Merge' : 'Merged'}
                </Typography>
            </Button>
            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                fullWidth
                maxWidth={'md'}
                aria-labelledby="merge-dialog-title"
            >
                <DialogTitle>
                    <Typography variant="h4">Merge Pull Request</Typography>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={1} direction="column" alignItems="flex-start">
                        <Grid item>
                            <MergeChecks prData={prData} />
                        </Grid>
                        <Grid item container direction="column">
                            <Grid item>
                                <TextField
                                    select
                                    value={mergeStrategy}
                                    onChange={handleMergeStrategyChange}
                                    fullWidth
                                    size="small"
                                    label="Merge Strategy"
                                >
                                    <MenuItem
                                        key={emptyMergeStrategy.label}
                                        //@ts-ignore
                                        value={emptyMergeStrategy}
                                        disabled
                                    >
                                        Select a merge strategy
                                    </MenuItem>
                                    {mergeStrategies.map((strategy) => (
                                        //@ts-ignore
                                        <MenuItem key={strategy.label} value={strategy}>
                                            {strategy.label}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                        </Grid>
                        <Grid item container direction="column">
                            <Grid item>
                                <InlineTextEditor
                                    fullWidth
                                    defaultValue={commitMessage}
                                    onSave={handleCommitMessageChange}
                                    placeholder={'Enter commit message'}
                                    saveDisabled={isEmptyCommitMessage}
                                    label={'Commit Message'}
                                />
                            </Grid>
                        </Grid>
                        <Grid item>
                            {transitionedJiraIssues.map((issue) => (
                                <JiraTransitionMenu
                                    issue={issue}
                                    handleIssueTransition={handleJiraIssueTransition}
                                    onShouldTransitionChange={handleShouldTransitionChangeJira}
                                    key={issue.key}
                                />
                            ))}
                            {transitionedBitbucketIssues.map((issue) => (
                                <BitbucketTransitionMenu
                                    issue={issue}
                                    handleIssueTransition={handleBitbucketIssueTransition}
                                    onShouldTransitionChange={handleShouldTransitionChangeBitbucket}
                                    key={issue.data.id}
                                />
                            ))}
                        </Grid>
                        <Grid item>
                            <FormControlLabel
                                value="Close source branch"
                                control={
                                    <Checkbox
                                        color="primary"
                                        checked={closeSourceBranch}
                                        onChange={handleCloseSourceBranchChange}
                                        name={'Close source branch'}
                                    />
                                }
                                label="Close source branch"
                                labelPlacement="end"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleMerge} color="primary">
                        Merge
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
