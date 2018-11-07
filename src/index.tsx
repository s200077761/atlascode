import * as React from 'react';
import * as ReactDOM from 'react-dom';
import DynamicApp from './webviews/components/DynamicApp';

const view = document.getElementById('reactView') as HTMLElement;

ReactDOM.render(
    <DynamicApp view={view.getAttribute('content')}/>,
    document.getElementById('root') as HTMLElement
);
