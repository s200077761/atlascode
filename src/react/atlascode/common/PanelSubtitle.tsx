import { makeStyles, Theme, Typography } from '@material-ui/core';
import clsx from 'clsx';
import React, { memo } from 'react';

type PanelSubtitleProps = {
    children?: React.ReactNode;
    className?: string;
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            root: {
                fontSize: theme.typography.pxToRem(14),
                fontStyle: 'italic'
            }
        } as const)
);

export const PanelSubtitle: React.FC<PanelSubtitleProps> = memo(({ children, className, ...other }) => {
    const classes = useStyles();

    return (
        <Typography variant="subtitle1" className={clsx(classes.root, className)} {...other}>
            {children || 'class names'}
        </Typography>
    );
});
