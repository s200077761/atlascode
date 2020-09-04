import { Box, CircularProgress, ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useState } from 'react';
import { PanelTitle } from '../common/PanelTitle';
import { PanelSubtitle } from './PanelSubtitle';
type BasicPanelProps = {
    title: string;
    subtitle?: string;
    isDefaultExpanded?: boolean;
    hidden?: boolean;
    isLoading: boolean;
};

export const BasicPanel: React.FunctionComponent<BasicPanelProps> = memo(
    ({ title, subtitle, isDefaultExpanded, isLoading, hidden, children }) => {
        const [internalExpanded, setInternalExpanded] = useState<boolean>(!!isDefaultExpanded);

        const expansionHandler = useCallback((event: React.ChangeEvent<{}>, expanded: boolean) => {
            setInternalExpanded(expanded);
        }, []);

        return (
            <Box hidden={!isLoading && hidden}>
                <ExpansionPanel square={false} expanded={internalExpanded} onChange={expansionHandler}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                        <PanelTitle>{title}</PanelTitle>
                        <PanelSubtitle>{subtitle ?? ''}</PanelSubtitle>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails>{isLoading ? <CircularProgress /> : children}</ExpansionPanelDetails>
                </ExpansionPanel>
            </Box>
        );
    }
);
