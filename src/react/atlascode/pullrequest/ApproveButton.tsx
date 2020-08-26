import { Box, Button, Typography } from '@material-ui/core';
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
            <Button color={'primary'} variant={'contained'} onClick={() => handleOnApprove()}>
                <Typography variant={'button'} noWrap>
                    {status === 'APPROVED' ? 'Unapprove' : 'Approve'}
                </Typography>
            </Button>
        </Box>
    );
};
