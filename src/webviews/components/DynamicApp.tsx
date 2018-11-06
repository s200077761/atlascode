import * as React from 'react';
import './App.css';
import * as Loadable from 'react-loadable';


const LoadableConfigView = Loadable({
    loader: () => import(/* webpackChunkName: "configView" */ './ConfigView'),
    loading: Loading,
  });

  const LoadablePullRequestView = Loadable({
    loader: () => import(/* webpackChunkName: "pullRequestView" */ './pullrequest/PullRequestPage'),
    loading: Loading,
  });

function Loading(props:Loadable.LoadingComponentProps) {
    if (props.error) {
        return <div>Error! { props.error }</div>;
    } else {
        return <div>Loading...</div>;
    }
}

class DynamicApp extends React.Component<{view:string|null}>  {
    constructor(props: any) {
        super(props);

    }

    public render() {
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
            default: {
                return (
                    <div>Unknown AtlasCode View</div>
                );
            }
        }
    }
}

export default DynamicApp;

