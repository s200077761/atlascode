import React from 'react';
import TableTree from '@atlaskit/table-tree';
import filesize from 'filesize';
import TrashIcon from '@atlaskit/icon/glyph/trash';

type ItemData = {
    attachment: any;
    delfunc: (attachment: any) => void;
};

interface AttachmentListProps {
    attachments: any[];
    onDelete: (attachment: any) => void;
}

const Delete = (data: ItemData) => {
    return (<div className='ac-delete' onClick={() => data.delfunc(data.attachment)}>
        <TrashIcon label='trash' />
    </div>);
};

const Filename = (data: ItemData) => <p style={{ display: "inline" }}>{data.attachment.filename}</p>;
const Size = (data: ItemData) => {
    const numSize = (typeof data.attachment.size === 'number') ? data.attachment.size : parseFloat(data.attachment.size);
    const size = filesize(numSize);
    return (<p style={{ display: "inline" }}>{size}</p>);
};

export const AttachmentList: React.FunctionComponent<AttachmentListProps> = ({ attachments, onDelete }) => {

    return (
        <TableTree
            columns={[Filename, Size, Delete]}
            columnWidths={['100%', '150px', '50px']}
            items={attachments.map(attachment => {
                return {
                    id: attachment.id,
                    content: {
                        attachment: attachment,
                        delfunc: onDelete,
                    }
                };
            })}
        />
    );

};