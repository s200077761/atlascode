import { Box, Typography } from '@material-ui/core';
import * as React from 'react';
import { PullRequestData } from '../../../bitbucket/model';

//This is similar to the existing MergeChecks component, but with hooks and MUI
type MergeChecksProps = {
    prData: PullRequestData;
};

export const MergeChecks: React.FC<MergeChecksProps> = ({ prData }) => {
    const { taskCount, participants, buildStatuses } = prData;
    const openTaskCount = taskCount;
    const approvalCount = participants.filter((p) => p.status === 'APPROVED').length;
    const needsWorkCount = participants.filter((p) => p.status === 'NEEDS_WORK').length;
    let unsuccessfulBuilds = false;
    if (Array.isArray(buildStatuses) && buildStatuses.length > 0) {
        const successes = buildStatuses.filter((status) => status.state === 'SUCCESSFUL');
        unsuccessfulBuilds = buildStatuses.length !== successes.length;
    }

    return (
        <Box>
            <Typography hidden={openTaskCount <= 0} variant="body1">
                ️⚠️&nbsp;&nbsp;Pull request has unresolved tasks
            </Typography>
            <Typography hidden={needsWorkCount <= 0} variant="body1">
                ️⚠️&nbsp;&nbsp;Pull request has been marked as - Needs work
            </Typography>
            {approvalCount === 0 ? (
                <Typography variant="body1">⚠️&nbsp;&nbsp;Pull request has no approvals</Typography>
            ) : (
                <Typography variant="body1">
                    Pull request has {approvalCount} {approvalCount === 1 ? 'approval' : 'approvals'}
                </Typography>
            )}
            <Typography hidden={!unsuccessfulBuilds} variant="body1">
                ️⚠️&nbsp;&nbsp;Pull request has unsuccessful builds
            </Typography>
        </Box>
    );
};
