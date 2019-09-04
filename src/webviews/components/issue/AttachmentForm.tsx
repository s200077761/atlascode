import React, { useEffect, useReducer } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import FileIcon from '@atlaskit/icon/glyph/file';
import TrashIcon from '@atlaskit/icon/glyph/trash';

interface FileWithPreview extends FileWithPath {
    preview: string;
    isImage: boolean;
}

const previewableTypes: string[] = ['image/gif', 'image/jpeg', 'image/png', 'image/webp'];

type ActionType = {
    type: 'addFiles' | 'removeFile' | 'reset';
    payload?: any;
};

interface AttachmentFormProps {
    onFilesChanged(files: FileWithPath[]): void;
}

const initialState: FileWithPreview[] = [];

const filesReducer = (state: FileWithPreview[], action: ActionType) => {
    switch (action.type) {
        case 'addFiles': {
            return [...state, ...action.payload];
        }
        case 'removeFile': {
            return state.filter((file: FileWithPath) => {
                if (file.path) {
                    return file.path !== action.payload.path;
                }
                return file.name !== action.payload.name;
            });
        }
        case 'reset': {
            return [];
        }
    }
};

export const AttachmentForm: React.FunctionComponent<AttachmentFormProps> = ({ onFilesChanged }) => {
    const [files, dispatch] = useReducer(filesReducer, initialState);
    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles: File[]) => {
            const newFiles = acceptedFiles.map(file => {
                if (previewableTypes.includes(file.type)) {
                    return Object.assign(file, { preview: URL.createObjectURL(file), isImage: true });
                } else {
                    return Object.assign(file, { preview: '', isImage: false });
                }

            });

            dispatch({ type: 'addFiles', payload: newFiles });
        }
    });

    useEffect(() => () => {
        // Make sure to revoke the data uris to avoid memory leaks
        files.forEach(file => URL.revokeObjectURL(file.preview));
    }, [files]);

    useEffect(() => { onFilesChanged(files); }, [files]);

    return (
        <div className="ac-attachment-container">
            <div {...getRootProps({ className: 'ac-attachment-dropzone' })}>
                <div className='ac-attachment-instructions'>
                    <img className='ac-attachment-filesbg' src='vscode-resource:images/files-bg.png' />
                    <div className='ac-attachment-drag-and-button'>
                        <div className='ac-attachment-drag-text'>
                            <span>Drag and drop your files anywhere or</span>
                        </div>
                        <input {...getInputProps()} />
                        <p className='ac-attachment-upload-button'>Click to upload</p>
                    </div>
                </div>
            </div>
            <div className='ac-attachment-thumbs-container'>
                {
                    files.map(file => (
                        <div className='ac-attachment-thumb' key={file.name}>
                            <div className='ac-attachment-thumb-item'>
                                <div className='ac-attachment-thumb-inner'>
                                    <div className='ac-attachment-thumb-img-wrapper'>
                                        {file.isImage &&
                                            <img
                                                src={file.preview}
                                                className='ac-attachment-thumb-img'
                                            />
                                        }
                                        {!file.isImage &&
                                            <FileIcon label="no preview" />
                                        }
                                        <div className='ac-attachment-overlay-container'>
                                            <div className='ac-attachment-overlay'>
                                                <div className='ac-attachment-filename-container'>
                                                    <div className='ac-attachment-filename'>
                                                        {file.name}
                                                    </div>
                                                </div>
                                                <div className='ac-attachment-delete-container'>
                                                    <div className='ac-attachment-delete' onClick={() => dispatch({ type: 'removeFile', payload: file })}>
                                                        <TrashIcon label='trash' />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};
