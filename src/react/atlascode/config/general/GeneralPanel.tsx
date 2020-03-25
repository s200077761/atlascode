import { Fade, Grid } from '@material-ui/core';
import React from 'react';
import { ConfigSubSection } from '../../../../lib/ipc/models/config';
import { CommonPanelProps } from '../../common/commonPanelProps';
import { GenConnectPanel } from './subpanels/GenConnectPanel';
import { GenDebugPanel } from './subpanels/GenDebugPanel';
import { GenMiscPanel } from './subpanels/GenMiscPanel';

type GeneralPanelProps = CommonPanelProps & {
    config: { [key: string]: any };
    onSubsectionChange: (subSection: ConfigSubSection, expanded: boolean) => void;
};

export const GeneralPanel: React.FunctionComponent<GeneralPanelProps> = ({
    visible,
    selectedSubSections,
    onSubsectionChange,
    config
}) => {
    return (
        <>
            <Fade in={visible}>
                <div hidden={!visible || !config['bitbucket.enabled']} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <GenMiscPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                showWelcome={config['showWelcomeOnInstall']}
                                outputLevel={config['outputLevel']}
                            />
                        </Grid>
                        <Grid item>
                            <GenConnectPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                enableHttpsTunnel={config['enableHttpsTunnel']}
                                onlineCheckerUrls={config['onlineCheckerUrls']}
                            />
                        </Grid>
                        <Grid item>
                            <GenDebugPanel
                                visible={visible}
                                expanded={selectedSubSections.includes(ConfigSubSection.Misc)}
                                onSubsectionChange={onSubsectionChange}
                                enableCurl={config['enableCurlLogging']}
                                enableCharles={config['enableCharles']}
                                charlesCertPath={config['charlesCertPath']}
                                charlesDebugOnly={config['charlesDebugOnly']}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </>
    );
};
