import React from 'react';

export const AtlLoader: React.FunctionComponent = (props) => {

    return (
        <div className='ac-atl-loader-container'>
            <img className='ac-atl-loader' src='vscode-resource:images/atlassian-icon.svg' />
            <div>Loading data...</div>
        </div>
    );

};