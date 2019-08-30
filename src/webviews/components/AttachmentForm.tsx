import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileWithPreview extends File {
    preview: string;
}

const previewableTypes: string[] = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];

export function AttachmentForm(props: any) {
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles: File[]) => {
            setFiles(acceptedFiles.map(file => {
                if (previewableTypes.includes(file.type)) {
                    return Object.assign(file, { preview: URL.createObjectURL(file) });
                } else {
                    return Object.assign(file, { preview: 'vscode-resource://../resources/coin.jpg' });
                }

            }));

            if (props.onFilesAdded) {
                props.onFilesAdded(files);
            }
        }
    });

    const thumbs = files.map(file => (
        <div className='ac-attachment-thumb' key={file.name}>
            <div className='ac-attachment-thumb-inner'>
                <img
                    src={file.preview}
                    className='ac-attachment-thumb-item'
                />
            </div>
        </div>
    ));

    useEffect(() => () => {
        // Make sure to revoke the data uris to avoid memory leaks
        files.forEach(file => URL.revokeObjectURL(file.preview));
    }, [files]);

    return (
        <section className="container">
            <div {...getRootProps({ className: 'dropzone' })}>
                <input {...getInputProps()} />
                <p>Drag 'n' drop some files here, or click to select files</p>
            </div>
            <aside className='ac-attachment-thumbs-container'>
                {thumbs}
            </aside>
        </section>
    );
}
