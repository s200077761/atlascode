import * as React from 'react';
import * as ReactDOM from 'react-dom';
import DynamicApp from './webviews/components/DynamicApp';

// @ts-ignore
// __webpack_public_path__ is used to set the public path for the js files - https://webpack.js.org/guides/public-path/
declare var __webpack_public_path__: string;
__webpack_public_path__ = `${document.baseURI!}build/`;

const view = document.getElementById('reactView') as HTMLElement;

ReactDOM.render(
    <DynamicApp view={view.getAttribute('content')} />,
    document.getElementById('root') as HTMLElement
);
