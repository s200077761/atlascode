import { CssBaseline } from '@material-ui/core';
import { default as MuiThemeProvider } from '@material-ui/styles/ThemeProvider';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { AtlLoader } from './atlascode/common/AtlLoader';
import { ErrorControllerContext, ErrorStateContext, useErrorController } from './atlascode/common/errorController';
import { atlascodeTheme } from './atlascode/theme/atlascodeTheme';
import { attachImageErrorHandler } from './imageErrorHandler';
import { ResourceContext } from './resourceContext';
import { vscodeTheme } from './vscode/theme/vscodeTheme';

// @ts-ignore
// __webpack_public_path__ is used to set the public path for the js files - https://webpack.js.org/guides/public-path/
declare var __webpack_public_path__: string;
__webpack_public_path__ = `${document.baseURI!}build/`;

const routes = {
    atlascodeSettingsV2: React.lazy(() =>
        import(/* webpackChunkName: "atlascodeSettingsV2" */ './atlascode/config/ConfigPage')
    ),
    atlascodeOnboardingV2: React.lazy(() =>
        import(/* webpackChunkName: "atlascodeOnboardingV2" */ './atlascode/onboarding/OnboardingPage')
    )
};

const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;

attachImageErrorHandler();

const App = () => {
    const Page = routes[view.getAttribute('content')!];
    const [errorState, errorController] = useErrorController();

    return (
        <ResourceContext.Provider value="vscode-resource:">
            <React.Suspense fallback={<AtlLoader />}>
                <MuiThemeProvider theme={atlascodeTheme(vscodeTheme, false)}>
                    <ErrorControllerContext.Provider value={errorController}>
                        <ErrorStateContext.Provider value={errorState}>
                            <CssBaseline />
                            <Page />
                        </ErrorStateContext.Provider>
                    </ErrorControllerContext.Provider>
                </MuiThemeProvider>
            </React.Suspense>
        </ResourceContext.Provider>
    );
};

ReactDOM.render(<App />, root);
