import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './reset.css';
import './App.css';

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

class VsCodeApi {
    public postMessage(msg: {}): void { }
    public setState(state: {}): void { }
    public getState(): {} { return {}; }
}

window['acquireVsCodeApi'] = (): VsCodeApi => {
    return new VsCodeApi();
};


const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;
const App = () => {
    const Page = routes[view.getAttribute('content')!];
    return (
        <React.Suspense fallback={<div className="loading-spinner" />}>
            <Page />
        </React.Suspense>
    );
};

ReactDOM.render(<App />, root);

