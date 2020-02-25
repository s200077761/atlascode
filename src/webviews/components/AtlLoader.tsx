import React, { useContext } from 'react';
import { ResourceContext } from './context';

export const AtlLoader: React.FunctionComponent = props => {
    const scheme: string = useContext(ResourceContext);
    return (
        <div className="ac-atl-loader-container">
            <img className="ac-atl-loader" src={`${scheme}images/atlassian-icon.svg`} />
            <div>Loading data...</div>
        </div>
    );
};
