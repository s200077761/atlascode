import { makeStyles, Theme } from '@material-ui/core';

export const useBorderBoxStyles = makeStyles(
    (theme: Theme) =>
        ({
            box: {
                borderWidth: 1,
                borderColor: theme.palette.divider,
                borderStyle: 'solid',
            },
        } as const)
);
