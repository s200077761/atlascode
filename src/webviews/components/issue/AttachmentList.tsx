import React from 'react';
import TableTree from '@atlaskit/table-tree';
import filesize from 'filesize';

type ItemData = { attachment: any };

interface AttachmentListProps {
    attachments: any[];
}

const Filename = (data: ItemData) => <p style={{ display: "inline" }}>{data.attachment.filename}</p>;
const Size = (data: ItemData) => {
    const numSize = (typeof data.attachment.size === 'number') ? data.attachment.size : parseFloat(data.attachment.size);
    const size = filesize(numSize);
    return (<p style={{ display: "inline" }}>{size}</p>);
};

export const AttachmentList: React.FunctionComponent<AttachmentListProps> = ({ attachments }) => {

    return (
        <TableTree
            columns={[Filename, Size]}
            columnWidths={['100%', '150px']}
            items={attachments.map(attachment => {
                return {
                    id: attachment.id,
                    content: {
                        attachment: attachment,
                    }
                };
            })}
        />
    );

};