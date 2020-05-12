import { darken, lighten, makeStyles, Theme } from '@material-ui/core';
import React, { useContext } from 'react';
import { VSCodeStyles, VSCodeStylesContext } from '../../vscode/theme/styles';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            '@global': {
                p: {
                    margin: 0,
                },
                pre: (props: VSCodeStyles) => ({
                    'overflow-x': 'auto',
                    background: props.textCodeBlockBackground,
                }),
                code: {
                    display: 'inline-block',
                    'overflow-x': 'auto',
                    'vertical-align': 'middle',
                },
                'img.emoji': {
                    'max-height': '1.5em',
                    'vertical-align': 'middle',
                },
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
    const vscStyles = useContext(VSCodeStylesContext);
    useStyles(vscStyles);
    return <></>;
};

export default AtlGlobalStyles;
