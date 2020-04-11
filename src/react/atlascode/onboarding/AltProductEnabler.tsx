import { Box, darken, lighten, makeStyles, Tooltip, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { ToggleButton } from '@material-ui/lab';
import React from 'react';

const useStyles = makeStyles(theme => ({
    box: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit'
    },
    icon: {
        fontSize: 100,
        color: 'white'
    },
    button: {
        padding: 0,
        textTransform: 'none',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        backgroundColor:
            theme.palette.type === 'dark'
                ? lighten(theme.palette.background.paper, 0.02)
                : darken(theme.palette.background.paper, 0.02)
    },
    buttonSubtext: {
        marginBottom: 30,
        color: 'gray'
    }
}));

export type AltProductEnablerProps = {
    label: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    subtext: string;
    ProductIcon: React.ReactNode;
};

export const AltProductEnabler: React.FunctionComponent<AltProductEnablerProps> = ({
    label,
    enabled,
    onToggle,
    subtext,
    ProductIcon
}) => {
    const classes = useStyles();

    return (
        <Tooltip title={enabled ? `Disable ${label} features` : `Enable ${label} features`}>
            <ToggleButton className={classes.button} onClick={() => onToggle(!enabled)} selected={enabled}>
                <Box className={classes.box}>
                    {enabled && (
                        <CheckCircleIcon
                            fontSize={'large'}
                            htmlColor={'#07b82b'}
                            style={{ float: 'right', margin: '7px' }}
                        />
                    )}
                    <div className={classes.icon}>
                        {label} {ProductIcon}
                    </div>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Box>
            </ToggleButton>
        </Tooltip>
    );
};
