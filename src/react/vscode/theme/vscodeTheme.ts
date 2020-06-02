import { createMuiTheme } from '@material-ui/core';
import { darken, lighten } from './colors';
import { VSCodeStyles } from './styles';

const body = document.body;
const isDark: boolean = body.getAttribute('class') === 'vscode-dark';
//vscode-high-contrast

export const createVSCodeTheme = (vscStyles: VSCodeStyles): any => {
    // Colors that don't appear in vscode-high-contrast
    const buttonBackground = vscStyles.buttonBackground === '' ? '#0088ff' : vscStyles.buttonBackground; // buttons and switches
    const buttonHoverBackground = vscStyles.buttonHoverBackground === '' ? '#000000' : vscStyles.buttonHoverBackground; // nothing
    const sideBarTitleForeground =
        vscStyles.sideBarTitleForeground === '' ? '#ffffff' : vscStyles.sideBarTitleForeground; // labels in header / section headers
    const sideBarSectionHeaderBackground =
        vscStyles.sideBarSectionHeaderBackground === '' ? '#000000' : vscStyles.sideBarSectionHeaderBackground; // secthion backgrounds?
    const listActiveSelectionBackground =
        vscStyles.listActiveSelectionBackground === '' ? '#000000' : vscStyles.listActiveSelectionBackground; // nothing?

    return createMuiTheme({
        palette: {
            type: isDark ? 'dark' : 'light',
            primary: {
                contrastText: vscStyles.buttonForeground,
                main: buttonBackground,
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
                root: {},
                contained: {
                    '&:hover': {
                        color: vscStyles.buttonForeground,
                        backgroundColor: buttonHoverBackground,
                    },
                },
                text: {
                    color: buttonBackground,
                    '&:hover': {
                        backgroundColor: buttonHoverBackground,
                    },
                },
            },
            MuiAppBar: {
                root: {
                    marginTop: 4,
                },
                colorDefault: {
                    backgroundColor: vscStyles.sideBarBackground,
                    color: sideBarTitleForeground,
                },
                colorPrimary: {
                    backgroundColor: vscStyles.sideBarBackground,
                    color: sideBarTitleForeground,
                },
            },
            MuiExpansionPanelSummary: {
                root: {
                    backgroundColor: sideBarSectionHeaderBackground,
                    color: sideBarTitleForeground,
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
                        backgroundColor: listActiveSelectionBackground,
                    },
                },
            },
        },
    });
};
