import { Box, Button, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import Skeleton from '@material-ui/lab/Skeleton';
import React, { useCallback, useState } from 'react';

const useStyles = makeStyles((theme: Theme) => ({
    demoBox: {
        width: '100%',
        height: '100%',
        padding: theme.spacing(2),
        paddingBottom: theme.spacing(3),
    },
    button: {
        width: '100%',
        height: '100%',
        textTransform: 'none',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : theme.palette.text.primary,
        '&:hover': {
            color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
        },
    },
    gifBox: {
        maxWidth: '100%',
        maxHeight: 'auto',
    },
    description: {
        marginTop: '20px',
    },
}));

export type DemoButtonProps = {
    gifLink: string;
    description: string;
    productIcon: React.ReactNode;
    action: () => void;
    onClick: (gifLink: string, modalTitle: string, action: () => void) => void;
};

export const DemoButton: React.FunctionComponent<DemoButtonProps> = ({
    gifLink,
    description,
    productIcon,
    action,
    onClick,
}) => {
    const classes = useStyles();
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleClick = useCallback((): void => {
        onClick(gifLink, description, action);
    }, [onClick, description, gifLink, action]);

    const handleImageLoaded = useCallback((): void => {
        setImageLoaded(true);
    }, []);

    return (
        <Button className={classes.button} onClick={handleClick}>
            <Box className={classes.demoBox}>
                <Box hidden={imageLoaded}>
                    <Skeleton variant="rect" width="100%" height="200px" />
                </Box>
                <Box hidden={!imageLoaded}>
                    <img
                        aria-label={`Gif showing "${description}" action`}
                        className={classes.gifBox}
                        src={gifLink}
                        onLoad={handleImageLoaded}
                    />
                </Box>
                <Typography variant="h3" align="left" className={classes.description}>
                    {description} {productIcon}
                </Typography>
            </Box>
        </Button>
    );
};

export default DemoButton;
