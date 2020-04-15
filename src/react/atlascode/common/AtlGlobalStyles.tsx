import { darken, lighten, makeStyles, Theme } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            '@global': {
                '.ap-mention': {
                    'background-color':
                        theme.palette.type === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
                '.user-mention': {
                    'background-color':
                        theme.palette.type === 'dark'
                            ? lighten(theme.palette.background.default, 0.15)
                            : darken(theme.palette.background.default, 0.15),
                },
            },
        } as const)
);

const AtlGlobalStyles: React.FC = () => {
    useStyles();
    return <></>;
};

export default AtlGlobalStyles;
