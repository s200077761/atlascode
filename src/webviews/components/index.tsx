import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './reset.css';
import './App.css';
import { ResourceContext } from './context';

// @ts-ignore
// __webpack_public_path__ is used to set the public path for the js files - https://webpack.js.org/guides/public-path/
declare var __webpack_public_path__: string;
__webpack_public_path__ = `${document.baseURI!}build/`;

const routes = {
    'atlascodeSettings': React.lazy(() => import(/* webpackChunkName: "atlascodeSettings" */'./config/ConfigPage')),
    'atlascodeWelcomeScreen': React.lazy(() => import(/* webpackChunkName: "atlascodeWelcomeScreen" */'./config/Welcome')),
    'pullRequestDetailsScreen': React.lazy(() => import(/* webpackChunkName: "pullRequestDetailsScreen" */'./pullrequest/PullRequestPage')),
    'createPullRequestScreen': React.lazy(() => import(/* webpackChunkName: "createPullRequestScreen" */'./pullrequest/CreatePullRequestPage')),
    'viewIssueScreen': React.lazy(() => import(/* webpackChunkName: "viewIssueScreen" */'./issue/JiraIssuePage')),
    'atlascodeCreateIssueScreen': React.lazy(() => import(/* webpackChunkName: "atlascodeCreateIssueScreen" */'./issue/CreateIssuePage')),
    'startWorkOnIssueScreen': React.lazy(() => import(/* webpackChunkName: "startWorkOnIssueScreen" */'./issue/StartWorkPage')),
    'pipelineSummaryScreen': React.lazy(() => import(/* webpackChunkName: "pipelineSummaryScreen" */'./pipelines/PipelineSummaryPage')),
    'bitbucketIssueScreen': React.lazy(() => import(/* webpackChunkName: "bitbucketIssueScreen" */'./bbissue/BitbucketIssuePage')),
    'createBitbucketIssueScreen': React.lazy(() => import(/* webpackChunkName: "createBitbucketIssueScreen" */'./bbissue/CreateBitbucketIssuePage')),
};


const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;


window.addEventListener("error", (ee: ErrorEvent) => {
    const targetEL = ee.target as HTMLElement;
    if (ee && targetEL && targetEL.nodeName === 'IMG') {
        const origianlSrc = targetEL.getAttribute('src');
        targetEL.setAttribute('src', 'vscode-resource:images/atlassian-icon.svg');
        targetEL.setAttribute('alt', `Unable to load image: ${origianlSrc}`);
        targetEL.setAttribute('title', `Unable to load image: ${origianlSrc}`);
        targetEL.setAttribute('class', 'ac-broken-img');
        targetEL.setAttribute('width', '24');
        targetEL.setAttribute('height', '24');
    }
}, { capture: true });

const App = () => {
    const Page = routes[view.getAttribute('content')!];
    return (
        <React.Suspense fallback={<div className="loading-spinner" />}>
            <ResourceContext.Provider value="vscode-resource:">
                <Page />
            </ResourceContext.Provider>
        </React.Suspense>
    );
};

ReactDOM.render(<App />, root);

