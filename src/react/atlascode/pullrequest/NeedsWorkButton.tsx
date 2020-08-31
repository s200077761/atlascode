import { Box, Button, Typography } from '@material-ui/core';
import React, { useCallback } from 'react';
import { ApprovalStatus } from '../../../bitbucket/model';

type NeedsWorkButtonProps = {
    hidden?: boolean;
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
};

export const NeedsWorkButton: React.FunctionComponent<NeedsWorkButtonProps> = ({ hidden, status, onApprove }) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'NEEDS_WORK' ? 'UNAPPROVED' : 'NEEDS_WORK');
    }, [onApprove, status]);

    return (
        <Box hidden={hidden}>
            <Button color={'primary'} variant={'contained'} onClick={handleOnApprove}>
                <Typography variant={'button'} noWrap>
                    {status === 'NEEDS_WORK' ? 'Remove Needs work' : 'Mark as Needs work'}
                </Typography>
            </Button>
        </Box>
    );
};
