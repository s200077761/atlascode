import { InlineTextEditor, InlineTextEditorList } from '@atlassianlabs/guipi-core-components';
import { Box, Grid, Link, Typography } from '@material-ui/core';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useBorderBoxStyles } from '../common/useBorderBoxStyles';
import { ConfigControllerContext } from './configController';

type StartWorkSettings = {
    customTemplate: string;
    customPrefixes: string[];
};

export const StartWorkSettings: React.FunctionComponent<StartWorkSettings> = ({ customTemplate, customPrefixes }) => {
    const controller = useContext(ConfigControllerContext);
    const boxClass = useBorderBoxStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});

    const handlePrefixesChange = useCallback((newOptions: string[]) => {
        const changes = Object.create(null);
        changes['jira.startWorkBranchTemplate.customPrefixes'] = newOptions;
        setChanges(changes);
    }, []);

    const handleTemplateChange = useCallback((template: string) => {
        const changes = Object.create(null);
        changes['jira.startWorkBranchTemplate.customTemplate'] = template;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <Grid container direction="column">
            <Grid item>
                <Box margin={2}>
                    <Typography variant="h4">Custom Branch Template</Typography>

                    <Typography variant="caption">
                        Branch names will be generated based on the template. Use the keywords <code>prefix</code>,{' '}
                        <code>issueKey</code>, and <code>summary</code> surrounded by double curly brackets to build a
                        template. Any of the keywords can be excluded if they are not needed, but do not put a
                        non-keyword in double curly brackets. E.g. <code>{'{{prefix}}/{{issueKey}}-{{summary}}'}</code>{' '}
                        will generate something of the format{' '}
                        <code>{'BUGFIX/VSCODE-1005-allow-users-to-configure-the-way-branch-name-is-co'}</code>
                    </Typography>

                    <Box marginTop={1} paddingBottom={2}>
                        <InlineTextEditor
                            fullWidth
                            label="Custom Template Text"
                            defaultValue={customTemplate}
                            onSave={handleTemplateChange}
                        />
                    </Box>
                </Box>
            </Grid>
            <Grid item>
                <Box margin={2}>
                    <Typography variant="h4">Custom Prefixes</Typography>

                    <Typography variant="caption">
                        <p>For repos with no branching model, custom prefixes can be created here.</p>
                        <p>
                            <b>Bitbucket Users:</b> Prefixes are part of your branching model and can be configured on
                            the{' '}
                            <Link href="https://bitbucket.org/blog/introducing-bitbucket-branching-model-support">
                                Bitbucket Website
                            </Link>
                        </p>
                    </Typography>

                    <Box className={boxClass.box} marginTop={1} paddingBottom={2}>
                        <InlineTextEditorList
                            options={customPrefixes}
                            reverseButtons={true}
                            addOptionButtonContent="Add Custom Prefix"
                            inputLabel="Custom Prefix Text"
                            onChange={handlePrefixesChange}
                            disabled={false}
                            emptyComponent={
                                <Box width="100%">
                                    <Typography align="center">No prefixes found.</Typography>
                                </Box>
                            }
                        />
                    </Box>
                </Box>
            </Grid>
        </Grid>
    );
};
