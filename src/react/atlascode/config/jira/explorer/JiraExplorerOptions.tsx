import React from 'react';
type JiraExplorerOptionsProps = {
    enableItem: React.ReactElement;
    groupItem: React.ReactElement;
    fetchAllItem: React.ReactElement;
    notifyItem: React.ReactElement;
    intervalItem: React.ReactElement;
};

export const JiraExplorerOptions: React.FunctionComponent<JiraExplorerOptionsProps> = ({
    enableItem,
    groupItem,
    fetchAllItem,
    notifyItem,
    intervalItem
}) => {
    return (
        <>
            {enableItem}
            {groupItem}
            {fetchAllItem}
            {notifyItem}
            {intervalItem}
        </>
    );
};
