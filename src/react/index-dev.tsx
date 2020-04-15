import { CssBaseline } from '@material-ui/core';
import { default as MuiThemeProvider } from '@material-ui/styles/ThemeProvider';
import React, { useCallback, useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useConstant from 'use-constant';
import { UIWSPort } from '../lib/ipc/models/ports';
import AtlGlobalStyles from './atlascode/common/AtlGlobalStyles';
import { AtlLoader } from './atlascode/common/AtlLoader';
import { ErrorControllerContext, ErrorStateContext, useErrorController } from './atlascode/common/errorController';
import { atlascodeTheme } from './atlascode/theme/atlascodeTheme';
import { ResourceContext } from './resourceContext';
import { computeStyles, VSCodeStylesContext } from './vscode/theme/styles';
import { createVSCodeTheme } from './vscode/theme/vscodeTheme';

// @ts-ignore
// __webpack_public_path__ is used to set the public path for the js files - https://webpack.js.org/guides/public-path/
declare var __webpack_public_path__: string;
__webpack_public_path__ = `${document.baseURI!}build/`;

const routes = {
    atlascodeSettingsV2: React.lazy(() =>
        import(/* webpackChunkName: "atlascodeSettingsV2" */ './atlascode/config/ConfigPage')
    ),
};

const ports = {
    atlascodeSettingsV2: UIWSPort.Settings,
};

class VsCodeApi {
    private conn: WebSocket;
    constructor(callback: () => void, wsport: number) {
        this.conn = new WebSocket(`ws://127.0.0.1:${wsport}`);
        this.conn.onopen = function (): void {
            callback();
        };
        this.conn.onerror = function (error): void {
            console.error('websocket error', error);
        };
        // most important part - incoming messages
        this.conn.onmessage = function (message): void {
            try {
                var json = JSON.parse(message.data);
                window.postMessage(json.data, '*');
            } catch (e) {
                console.error('Invalid JSON: ', message.data);
                return;
            }
        };
    }
    public postMessage(msg: {}): void {
        this.conn.send(JSON.stringify(msg));
    }
    public setState(state: {}): void {}
    public getState(): {} {
        return {};
    }
}

const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;

const App = (): JSX.Element => {
    const Page = routes[view.getAttribute('content')!];
    const [errorState, errorController] = useErrorController();
    const [vscStyles, setVscStyles] = useState(computeStyles());
    const [currentTheme, setCurrentTheme] = useState(atlascodeTheme(createVSCodeTheme(vscStyles), false));
    const onColorThemeChanged = useCallback(() => {
        const newStyles = computeStyles();
        setVscStyles(newStyles);
        setCurrentTheme(atlascodeTheme(createVSCodeTheme(newStyles), false));
    }, []);
    const themeObserver = useConstant<MutationObserver>(() => {
        const observer = new MutationObserver(onColorThemeChanged);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return observer;
    });

    useEffect(() => {
        return () => {
            themeObserver.disconnect();
        };
    }, [themeObserver]);

    return (
        <ResourceContext.Provider value="http://localhost:8080/">
            <React.Suspense fallback={<AtlLoader />}>
                <VSCodeStylesContext.Provider value={vscStyles}>
                    <MuiThemeProvider theme={currentTheme}>
                        <ErrorControllerContext.Provider value={errorController}>
                            <ErrorStateContext.Provider value={errorState}>
                                <CssBaseline />
                                <AtlGlobalStyles />
                                <Page />
                            </ErrorStateContext.Provider>
                        </ErrorControllerContext.Provider>
                    </MuiThemeProvider>
                </VSCodeStylesContext.Provider>
            </React.Suspense>
        </ResourceContext.Provider>
    );
};

const _vscapi = new VsCodeApi(() => {
    ReactDOM.render(<App />, root);
}, ports[view.getAttribute('content')!]);

window['acquireVsCodeApi'] = (): VsCodeApi => {
    return _vscapi;
};
