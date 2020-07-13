import { InlineTextEditor } from '@atlassianlabs/guipi-core-components';
import { ExpansionPanel, ExpansionPanelDetails, ExpansionPanelSummary } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import React, { memo, useCallback, useState } from 'react';
import { PanelTitle } from '../common/PanelTitle';
type SummaryPanelProps = {
    rawSummary: string;
    htmlSummary: string;
    fetchUsers: (input: string) => Promise<any[]>;
    summaryChange: (text: string) => Promise<void>;
};

export const SummaryPanel: React.FunctionComponent<SummaryPanelProps> = memo(
    ({ rawSummary, htmlSummary, fetchUsers, summaryChange }) => {
        const [internalExpanded, setInternalExpanded] = useState(true);

        const expansionHandler = useCallback((event: React.ChangeEvent<{}>, expanded: boolean) => {
            setInternalExpanded(expanded);
        }, []);

        //TODO: Add this back in when @mentions are added
        // const handleFetchUsers = useCallback(
        //     async (input: string) => {
        //         return await fetchUsers(input);
        //     },
        //     [fetchUsers]
        // );

        const handleSummaryChange = useCallback(
            async (text: string) => {
                await summaryChange(text);
            },
            [summaryChange]
        );

        return (
            <ExpansionPanel square={false} expanded={internalExpanded} onChange={expansionHandler}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                    <PanelTitle>Summary</PanelTitle>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails>
                    <InlineTextEditor
                        fullWidth
                        multiline
                        rows={7}
                        defaultValue={rawSummary}
                        onSave={handleSummaryChange}
                    />
                </ExpansionPanelDetails>
            </ExpansionPanel>
        );
    }
);
