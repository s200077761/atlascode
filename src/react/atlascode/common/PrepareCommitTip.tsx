import { Box, Link, Typography } from '@material-ui/core';
import React, { memo } from 'react';

type PrepareCommitTipProps = {
    className?: string;
};

export const PrepareCommitTip: React.FC<PrepareCommitTipProps> = memo(({ className }) => {
    return (
        <Typography component="div" variant="body1" className={className}>
            <Box display="inline" fontWeight="fontWeightBold">
                Tip:{' '}
            </Box>{' '}
            You can have issue keys auto-added to your commit messages using{' '}
            <Link href="https://bitbucket.org/snippets/atlassian/qedp7d">our prepare-commit-msg hook</Link>
        </Typography>
    );
});
