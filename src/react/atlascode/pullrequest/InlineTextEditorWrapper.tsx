import { InlineTextEditor } from '@atlassianlabs/guipi-core-components';
import { Box, ClickAwayListener, darken, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import React, { useCallback, useState } from 'react';

const useStyles = makeStyles((theme: Theme) => ({
    titleDisplay: {
        height: 35,
        borderRadius: 5,
        '&:hover': {
            color: theme.palette.type === 'dark' ? lighten(theme.palette.text.primary, 1) : 'white',
            backgroundColor:
                theme.palette.type === 'dark'
                    ? lighten(theme.palette.background.paper, 0.2)
                    : darken(theme.palette.background.paper, 0.2),
        },
    },
}));
type InlineTextEditorWrapperProps = {
    title: string;
    onSave: (text: string) => void;
};

export const InlineTextEditorWrapper: React.FunctionComponent<InlineTextEditorWrapperProps> = ({ title, onSave }) => {
    const classes = useStyles();
    const [editMode, setEditMode] = useState(false);

    const handleClickAway = useCallback(() => {
        setEditMode(false);
    }, []);

    const handleTitleChange = useCallback(
        (text: string) => {
            onSave(text);
            setEditMode(false);
        },
        [onSave],
    );

    const handleClick = useCallback(() => {
        setEditMode(true);
    }, []);

    return (
        <ClickAwayListener onClickAway={handleClickAway}>
            {editMode ? (
                <Box hidden={!editMode}>
                    <InlineTextEditor fullWidth defaultValue={title} onSave={handleTitleChange} />
                </Box>
            ) : (
                <Box className={classes.titleDisplay} padding={1}>
                    <Typography onClick={handleClick} variant="body1">
                        {title}
                    </Typography>
                </Box>
            )}
        </ClickAwayListener>
    );
};
