import { Box, Button, darken, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import React, { useCallback } from 'react';

const useStyles = makeStyles((theme: Theme) => ({
    demoBox: {
        padding: theme.spacing(2),
        paddingBottom: theme.spacing(3),
        color: theme.palette.type === 'dark' ? 'white' : '#47525c',
    },
    button: {
        textTransform: 'none',
        backgroundColor:
            theme.palette.type === 'dark'
                ? lighten(theme.palette.background.paper, 0.02)
                : darken(theme.palette.background.paper, 0.02),
    },
    gifBox: {
        maxWidth: '100%',
        maxHeight: 'auto',
    },
}));

export type DemoButtonProps = {
    gifLink: string;
    description: string;
    productIcon: React.ReactNode;
    onClick: () => void;
};

export const DemoButton: React.FunctionComponent<DemoButtonProps> = ({
    gifLink,
    description,
    productIcon,
    onClick,
}) => {
    const classes = useStyles();

    const handleClick = useCallback((): void => {
        onClick();
    }, [onClick]);

    return (
        <Button className={classes.button} onClick={handleClick}>
            <Box className={classes.demoBox}>
                <img className={classes.gifBox} src={gifLink} />
                <Typography variant="h3" align="left" style={{ marginTop: '20px' }}>
                    {description} {productIcon}
                </Typography>
            </Box>
        </Button>
    );
};

export default DemoButton;
