import * as React from 'react';
import './App.css';
import * as Loadable from 'react-loadable';

// These Loadables dynamically load chunks as needed so we don't need ALL js on every page.
// The special comment tells webpack what to name the chunks. This should match the id() returned
// by the associated vscode webview.
//
// Note: ALL loadables can reuse the same Loading function.

const LoadableConfigView = Loadable({
    loader: () => import(/* webpackChunkName: "configView" */ './ConfigView'),
    loading: Loading,
  });

  const LoadablePullRequestView = Loadable({
    loader: () => import(/* webpackChunkName: "pullRequestView" */ './pullrequest/PullRequestPage'),
    loading: Loading,
  });

  const LoadableIssuewView = Loadable({
    loader: () => import(/* webpackChunkName: "jiraIssueView" */ './issue/JiraIssuePage'),
    loading: Loading,
  });

function Loading(props:Loadable.LoadingComponentProps) {
    if (props.error) {
        return <div>Error! { props.error }</div>;
    } else {
        return <div>Loading...</div>;
    }
}

// DynamicApp is the entry point for ALL webviews.
// Each React component should be dynamically loaded above and then called within this component's render method.
// As we create new webviews, they need to be added here.
class DynamicApp extends React.Component<{view:string|null}>  {
    constructor(props: any) {
        super(props);

    }

    public render() {
        // props.view must match the webChunkName above AND the id() returned by the vscode webview component.
        switch(this.props.view) {
            case 'configView': {
                return(
                    <div>
                        <LoadableConfigView />
                    </div>
                );
            }
            case 'pullRequestView': {
                return(
                    <div>
                        <LoadablePullRequestView />
                    </div>
                );
            }
            case 'jiraIssueView': {
                return(
                    <div>
                        <LoadableIssuewView />
                    </div>
                );
            }
            default: {
                return (
                    <div>Unknown AtlasCode View</div>
                );
            }
        }
    }
}

export default DynamicApp;

