import { Box, darken, lighten, makeStyles, Tooltip, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { ToggleButton } from '@material-ui/lab';
import React, { useCallback } from 'react';

const useStyles = makeStyles((theme) => ({
    box: {
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
    },
    icon: {
        fontSize: 100,
        color: theme.palette.type === 'dark' ? 'white' : '#47525c',
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
                : darken(theme.palette.background.paper, 0.05),
    },
    buttonSubtext: {
        marginBottom: 30,
        paddingLeft: theme.spacing(1),
        paddingRight: theme.spacing(1),
        color: theme.palette.type === 'dark' ? 'gray' : '#5b6469',
    },
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
    ProductIcon,
}) => {
    const classes = useStyles();

    const handleToggle = useCallback(() => {
        onToggle(!enabled);
    }, [enabled, onToggle]);

    return (
        <Tooltip title={enabled ? `Disable ${label} features` : `Enable ${label} features`}>
            <ToggleButton className={classes.button} onClick={handleToggle} selected={enabled}>
                <Box className={classes.box}>
                    <div className={classes.icon}>
                        {label} {ProductIcon}
                    </div>
                    <Typography variant="h2" className={classes.buttonSubtext}>
                        {subtext}
                    </Typography>
                </Box>
                {enabled && (
                    <CheckCircleIcon
                        fontSize={'large'}
                        htmlColor={'#07b82b'}
                        style={{ top: '0px', right: '0px', position: 'absolute', margin: '7px' }}
                    />
                )}
            </ToggleButton>
        </Tooltip>
    );
};
