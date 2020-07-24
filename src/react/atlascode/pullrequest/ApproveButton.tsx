import { Box, Button, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useCallback } from 'react';
import { ApprovalStatus } from '../../../bitbucket/model';

type ApproveButtonProps = {
    hidden?: boolean;
    status: ApprovalStatus;
    onApprove: (status: ApprovalStatus) => void;
};

export const ApproveButton: React.FunctionComponent<ApproveButtonProps> = ({ hidden, status, onApprove }) => {
    const handleOnApprove = useCallback(() => {
        onApprove(status === 'APPROVED' ? 'UNAPPROVED' : 'APPROVED');
    }, [onApprove, status]);

    return (
        <Box hidden={hidden}>
            <Button
                onClick={() => handleOnApprove()}
                startIcon={<CheckCircleIcon htmlColor={status === 'APPROVED' ? '#07b82b' : 'gray'} />}
            >
                <Typography variant={'button'}>{status === 'APPROVED' ? 'Unapprove' : 'Approve'}</Typography>
            </Button>
        </Box>
    );
};
