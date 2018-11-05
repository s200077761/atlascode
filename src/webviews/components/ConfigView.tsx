import * as React from 'react';
//import { State } from './App';

declare var acquireVsCodeApi: any;
const vscode = acquireVsCodeApi();

export default class ConfigView extends React.Component<{}, {}> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        return <div>Config View!</div>;
    }
}