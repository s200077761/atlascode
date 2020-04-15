import { createMuiTheme } from '@material-ui/core';
import { darken, lighten } from './colors';
import { VSCodeStyles } from './styles';

const body = document.body;
const isDark: boolean = body.getAttribute('class') === 'vscode-dark';

export const createVSCodeTheme = (vscStyles: VSCodeStyles): any => {
    return createMuiTheme({
        palette: {
            type: isDark ? 'dark' : 'light',
            primary: {
                contrastText: vscStyles.buttonForeground,
                main: vscStyles.buttonBackground,
            },
            text: {
                primary: vscStyles.foreground,
            },
            background: {
                default: vscStyles.editorBackground,
                paper: isDark ? lighten(vscStyles.editorBackground, 3) : darken(vscStyles.editorBackground, 3),
            },
        },
        typography: {
            fontFamily: vscStyles.fontFamily,
        },
        overrides: {
            MuiChip: {
                root: {
                    backgroundColor: isDark
                        ? lighten(vscStyles.editorBackground, 20)
                        : darken(vscStyles.editorBackground, 3),
                    color: vscStyles.editorForeground,
                },
            },
            MuiButton: {
                root: {
                    color: vscStyles.buttonForeground,
                },
                contained: {
                    '&:hover': {
                        backgroundColor: vscStyles.buttonHoverBackground,
                    },
                },
                text: {
                    '&:hover': {
                        backgroundColor: vscStyles.buttonHoverBackground,
                    },
                },
            },
            MuiAppBar: {
                colorDefault: {
                    backgroundColor: vscStyles.activityBarBackground,
                    color: vscStyles.activityBarForeground,
                },
                colorPrimary: {
                    backgroundColor: vscStyles.activityBarBackground,
                    color: vscStyles.activityBarForeground,
                },
            },
            MuiExpansionPanelSummary: {
                root: {
                    backgroundColor: vscStyles.titleBarActiveBackground,
                    color: vscStyles.titleBarActiveForeground,
                },
            },
            MuiFilledInput: {
                root: {
                    backgroundColor: vscStyles.dropdownBackground,
                    color: vscStyles.dropdownForeground,
                },
            },
            MuiLink: {
                root: {
                    color: vscStyles.textLinkForeground,
                },
            },
            MuiTableRow: {
                root: {
                    '&$selected, &$selected:hover': {
                        backgroundColor: vscStyles.listActiveSelectionBackground,
                    },
                },
            },
        },
    });
};
