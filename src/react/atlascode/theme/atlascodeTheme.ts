import { createMuiTheme, Theme } from '@material-ui/core';

export const atlascodeTheme = (baseTheme: Theme, usedefault?: boolean): Theme => {
    if (usedefault) {
        return createMuiTheme();
    }

    return createMuiTheme({
        ...baseTheme,
        typography: {
            ...baseTheme.typography,
            h1: {
                fontSize: baseTheme.typography.pxToRem(52),
                fontWeight: 400,
            },
            h2: {
                fontSize: baseTheme.typography.pxToRem(36),
                fontWeight: 400,
            },
            h3: {
                fontSize: baseTheme.typography.pxToRem(24),
                fontWeight: 400,
            },
            h4: {
                fontSize: baseTheme.typography.pxToRem(20),
                fontWeight: 400,
            },
            h5: {
                fontSize: baseTheme.typography.pxToRem(14),
                fontWeight: 400,
            },
            h6: {
                fontSize: baseTheme.typography.pxToRem(12),
                fontWeight: 400,
            },
        },
        mixins: {
            ...baseTheme.mixins,
            toolbar: {
                minHeight: 50,
            },
        },
        overrides: {
            ...baseTheme.overrides,
            MuiDialog: {
                container: {
                    alignItems: 'flex-start',
                    paddingTop: baseTheme.spacing(10),
                },
            },
        },
        props: {
            ...baseTheme.props,
            MuiTextField: {
                variant: 'outlined',
            },
        },
        zIndex: {
            ...baseTheme.zIndex,
            appBar: 9999,
        },
    });
};
