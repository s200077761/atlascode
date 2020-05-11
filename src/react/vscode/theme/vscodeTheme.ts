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
            htmlFontSize: 14,
            fontSize: 11,
            fontFamily: vscStyles.fontFamily,
        },
        overrides: {
            MuiIconButton: {
                sizeSmall: {
                    // Adjust spacing to reach minimal touch target hitbox
                    marginLeft: 4,
                    marginRight: 4,
                    padding: 12,
                },
            },
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
                root: {
                    marginTop: 4,
                },
                colorDefault: {
                    backgroundColor: vscStyles.sideBarBackground,
                    color: vscStyles.sideBarTitleForeground,
                },
                colorPrimary: {
                    backgroundColor: vscStyles.sideBarBackground,
                    color: vscStyles.sideBarTitleForeground,
                },
            },
            MuiExpansionPanelSummary: {
                root: {
                    backgroundColor: vscStyles.sideBarSectionHeaderBackground,
                    color: vscStyles.sideBarTitleForeground,
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
