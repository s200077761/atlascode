import { Typography } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import * as React from 'react';
import { PullRequestData } from '../../../bitbucket/model';

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

    const allClear = approvalCount > 0 && openTaskCount === 0 && needsWorkCount === 0 && !unsuccessfulBuilds;

    return (
        <Alert variant="standard" severity={allClear ? 'success' : 'warning'}>
            <Typography>
                {approvalCount === 0
                    ? 'Pull request has no approvals'
                    : `Pull request has ${approvalCount} ${approvalCount === 1 ? 'approval' : 'approvals'}`}
            </Typography>

            {openTaskCount > 0 && <Typography>Pull request has unresolved tasks</Typography>}
            {needsWorkCount > 0 && <Typography>Pull request has been marked as - Needs work</Typography>}
            {unsuccessfulBuilds && <Typography>Pull request has unsuccessful builds</Typography>}
        </Alert>
    );
};
