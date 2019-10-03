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

class VsCodeApi {
    private conn: WebSocket;
    constructor(callback: () => void) {
        this.conn = new WebSocket('ws://127.0.0.1:13988');
        this.conn.onopen = function () {
            callback();
            console.log('opened dev connection');
        };
        this.conn.onerror = function (error) {
            // just in there were some problems with connection...
            console.log('websocket error', error);
        };
        // most important part - incoming messages
        this.conn.onmessage = function (message) {
            try {
                var json = JSON.parse(message.data);
                console.log('posting message', json.data);
                window.postMessage(json.data, "*");
            } catch (e) {
                console.log('Invalid JSON: ', message.data);
                return;
            }
        };
    }
    public postMessage(msg: {}): void {
        this.conn.send(JSON.stringify(msg));
    }
    public setState(state: {}): void { }
    public getState(): {} { return {}; }
}

const view = document.getElementById('reactView') as HTMLElement;
const root = document.getElementById('root') as HTMLElement;

const App = () => {
    const Page = routes[view.getAttribute('content')!];
    return (
        <React.Suspense fallback={<div className="loading-spinner" />}>
            <ResourceContext.Provider value="http://localhost:8080/">
                <Page />
            </ResourceContext.Provider>
        </React.Suspense>
    );
};

const _vscapi = new VsCodeApi(() => { ReactDOM.render(<App />, root); });

window['acquireVsCodeApi'] = (): VsCodeApi => {
    return _vscapi;
};






