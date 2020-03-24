import { createMuiTheme } from '@material-ui/core';
import { darken, lighten } from './colors';
import {
    activityBarBackground,
    activityBarForeground,
    buttonBackground,
    buttonForeground,
    buttonHoverBackground,
    dropdownBackground,
    dropdownForeground,
    editorBackground,
    editorForeground,
    fontFamily,
    fontSize,
    foreground,
    listActiveSelectionBackground,
    sideBarSectionHeaderBackground,
    textLinkForeground
} from './styles';

const body = document.body;
const isDark: boolean = body.getAttribute('class') === 'vscode-dark';

export const vscodeTheme = createMuiTheme({
    palette: {
        type: isDark ? 'dark' : 'light',
        primary: {
            contrastText: buttonForeground,
            main: buttonBackground
        },
        text: {
            primary: foreground
        },
        background: {
            default: editorBackground,
            paper: isDark ? lighten(editorBackground, 3) : darken(editorBackground, 3)
        }
    },
    typography: {
        fontFamily: fontFamily
    },
    overrides: {
        MuiChip: {
            root: {
                backgroundColor: isDark ? lighten(editorBackground, 20) : darken(editorBackground, 3),
                color: editorForeground
            }
        },
        MuiButton: {
            root: {
                color: buttonForeground
            },
            contained: {
                '&:hover': {
                    backgroundColor: buttonHoverBackground
                }
            },
            text: {
                '&:hover': {
                    backgroundColor: buttonHoverBackground
                }
            }
        },
        MuiAppBar: {
            colorDefault: {
                backgroundColor: activityBarBackground,
                color: activityBarForeground
            },
            colorPrimary: {
                backgroundColor: activityBarBackground,
                color: activityBarForeground
            }
        },
        MuiExpansionPanelSummary: {
            root: {
                backgroundColor: sideBarSectionHeaderBackground
            }
        },
        MuiFilledInput: {
            root: {
                backgroundColor: dropdownBackground,
                color: dropdownForeground
            }
        },
        MuiLink: {
            root: {
                color: textLinkForeground
            }
        },
        MuiTableRow: {
            root: {
                '&$selected, &$selected:hover': {
                    backgroundColor: listActiveSelectionBackground
                }
            }
        }
    }
});
export const vscodeTheme2 = createMuiTheme({
    palette: {
        type: isDark ? 'dark' : 'light',
        primary: {
            contrastText: buttonForeground,
            main: buttonBackground
        },
        text: {
            primary: foreground
        },
        background: {
            default: editorBackground,
            paper: isDark ? lighten(editorBackground, 3) : darken(editorBackground, 3)
        }
    },
    typography: {
        fontFamily: fontFamily,
        fontSize: fontSize,
        htmlFontSize: fontSize,
        h1: {
            fontFamily: fontFamily
        },
        h2: {
            fontFamily: fontFamily
        },
        h3: {
            fontFamily: fontFamily
        },
        h4: {
            fontFamily: fontFamily
        },
        h5: {
            fontFamily: fontFamily
        },
        h6: {
            fontFamily: fontFamily
        },
        subtitle1: {
            fontFamily: fontFamily
        },
        subtitle2: {
            fontFamily: fontFamily
        },
        body1: {
            fontFamily: fontFamily,
            fontSize: '1rem'
        },
        body2: {
            fontFamily: fontFamily
        },
        button: {
            fontFamily: fontFamily
        },
        caption: {
            fontFamily: fontFamily
        },
        overline: {
            fontFamily: fontFamily
        }
    },
    overrides: {
        MuiChip: {
            root: {
                backgroundColor: isDark ? lighten(editorBackground, 20) : darken(editorBackground, 3),
                color: editorForeground
            }
        },
        MuiButton: {
            root: {
                color: buttonForeground
            },
            contained: {
                '&:hover': {
                    backgroundColor: buttonHoverBackground
                }
            },
            text: {
                '&:hover': {
                    backgroundColor: buttonHoverBackground
                }
            }
        },
        MuiAppBar: {
            colorDefault: {
                backgroundColor: activityBarBackground,
                color: activityBarForeground
            },
            colorPrimary: {
                backgroundColor: activityBarBackground,
                color: activityBarForeground
            }
        },
        MuiExpansionPanelSummary: {
            root: {
                backgroundColor: sideBarSectionHeaderBackground
            }
        },
        MuiFilledInput: {
            root: {
                backgroundColor: dropdownBackground,
                color: dropdownForeground
            }
        },
        MuiLink: {
            root: {
                color: textLinkForeground
            }
        },
        MuiTableRow: {
            root: {
                '&$selected, &$selected:hover': {
                    backgroundColor: listActiveSelectionBackground
                }
            }
        }
    }
});
