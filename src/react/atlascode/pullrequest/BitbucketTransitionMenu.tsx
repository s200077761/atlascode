import { Checkbox, TableCell, TableRow, Typography } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { BitbucketIssue } from '../../../bitbucket/model';
import StatusMenu from '../bbissue/StatusMenu';

type BitbucketTransitionMenuProps = {
    issue: BitbucketIssue;
    handleIssueTransition: (issueToTransition: BitbucketIssue, transition: string) => void;
    onShouldTransitionChange: (issueId: string, shouldChange: boolean) => void;
};

export const BitbucketTransitionMenu: React.FC<BitbucketTransitionMenuProps> = ({
    issue,
    handleIssueTransition,
    onShouldTransitionChange,
}) => {
    const [transitionIssueEnabled, setTransitionIssueEnabled] = useState(true);

    const toggleTransitionIssueEnabled = useCallback(() => {
        setTransitionIssueEnabled(!transitionIssueEnabled);
    }, [transitionIssueEnabled]);

    const handleIssueTransitionChange = useCallback(
        async (value: string) => {
            setTransitionIssueEnabled(true);
            handleIssueTransition(issue, value);
        },
        [issue, handleIssueTransition]
    );

    useEffect(() => {
        onShouldTransitionChange(issue.data.id, transitionIssueEnabled);
    }, [issue.data.id, transitionIssueEnabled, onShouldTransitionChange]);

    return (
        <TableRow key={issue.data.id}>
            <TableCell>
                <Checkbox color={'primary'} checked={transitionIssueEnabled} onChange={toggleTransitionIssueEnabled} />
            </TableCell>
            <TableCell>
                <Typography>
                    <Typography>
                        <strong>#{issue.data.id}</strong>: {issue.data.title}
                    </Typography>
                </Typography>
            </TableCell>
            <TableCell>
                <StatusMenu
                    fullWidth
                    variant="outlined"
                    status={issue.data.state}
                    onChange={handleIssueTransitionChange}
                />
            </TableCell>
        </TableRow>
    );
};
