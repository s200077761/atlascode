import { AppBar, Container } from '@material-ui/core';
import React, { useCallback, useEffect, useState } from 'react';
import { ConfigControllerContext, useConfigController } from '../config/configController';
import { ProductEnabler } from '../config/ProductEnabler';

const OnboardingPage: React.FunctionComponent = () => {
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [state, controller] = useConfigController();

    const handleJiraToggle = useCallback((enabled: boolean): void => {
        const changes = Object.create(null);
        changes['jira.enabled'] = enabled;
        setChanges(changes);
    }, []);

    const handleBitbucketToggle = useCallback((enabled: boolean): void => {
        const changes = Object.create(null);
        changes['bitbucket.enabled'] = enabled;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    return (
        <ConfigControllerContext.Provider value={controller}>
            <Container maxWidth="xl">
                <AppBar position="relative"></AppBar>
                <ProductEnabler
                    label="Bitbucket"
                    enabled={state.config['bitbucket.enabled']}
                    onToggle={handleBitbucketToggle}
                />
                <ProductEnabler label="Jira" enabled={state.config['jira.enabled']} onToggle={handleJiraToggle} />
            </Container>
        </ConfigControllerContext.Provider>
    );
};

export default OnboardingPage;
