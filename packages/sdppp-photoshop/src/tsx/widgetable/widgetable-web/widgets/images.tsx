import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button, Upload, Image, message, Tooltip, Row, Col, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, EllipsisOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import './images.less';
import { BaseWidgetProps } from './_base';
import { useUIWeightCSS } from '../../utils';
import { sdpppSDK } from '../../../../sdk/sdppp-ps-sdk';
import { useWidgetable } from '../../context';
import { v4 } from 'uuid';
import { debug } from 'debug';

const log = debug('widgetable:images');

interface ImageSelectProps extends BaseWidgetProps {
    value?: ImageDetail[];
    onValueChange?: (images: ImageDetail[]) => void;
    extraOptions?: Record<string, any>;
    maxCount?: number;
    isMask?: boolean;
}

interface ImageDetail {
    url: string,
    source: string,
    thumbnail?: string,
}

function fixValue(value: ImageDetail[]) {
    if (!value.map) return []
    return value.map(image => {
        if (typeof image === 'string') {
            return {
                url: image,
                thumbnail: image,
                source: 'remote',
            };
        } else {
            return image
        }
    });
}

/**
 * 实现一个图片选择器，包括一个图片预览区域。和下方的"+ 从PS"，"+ 从磁盘"按钮，以及hover时才会显示的"清空"，"自动刷新"按钮。按钮可以用图标代替
 * 添加图片后，会往选择器里添加一个图片。若有多个图片，图片预览区域会排列这些图片的缩略图，最多3个。5个或以上图片会在第四格产生省略号标志。
 * 清空按钮会去掉所有图片。
 * 自动更新按钮是一个可激活的按钮。点击进入激活状态，再点击进入非激活状态。但在有两个或以上图片时，该按钮强制进入非激活状态且不再可用。
 * 
 * 可以用antd实现。
 * 
 * @returns 
 */

/**
 * Hook分几种情况：
 * 1. 获得了图片但是有file_token时，需要等待token交换成为buffer。
 * 2. 
 */

export const ImageSelect: React.FC<ImageSelectProps> = ({ maxCount = 1, uiWeight, value = [], onValueChange, extraOptions, isMask = false }) => {
    value = fixValue(value);
    const { runUploadPassOnce } = useWidgetable();
    const [images, setImages] = useState<ImageDetail[]>(value);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewCurrent, setPreviewCurrent] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const displayMax = 2;
    
    // 使用 ref 来保存最新的 images 状态
    const imagesRef = useRef(images);
    imagesRef.current = images;

    const handleChange = useCallback((newImages: ImageDetail[]) => {
        setImages(newImages);
    }, [onValueChange]);

    useEffect(() => {
        log('onValueChange', images);
        onValueChange?.(images.map(image => image));
    }, [images]);

    const switchImageSource = useCallback((imageURL: string, newURL: string) => {
        setImages(prevImages => {
            const newImages = prevImages.map(image => {
                if (image.url === imageURL) {
                    return { ...image, url: newURL };
                }
                return image;
            });
            return newImages;
        });
    }, []);

    const handleClear = useCallback(() => {
        handleChange([]);
    }, [handleChange]);

    const handlePreviewChange = useCallback((current: number, prev: number) => {
        setPreviewCurrent(current);
    }, []);

    const handleEllipsisClick = useCallback(() => {
        setPreviewCurrent(displayMax); // 从第4张图片开始预览
        setPreviewVisible(true);
    }, [displayMax]);

    const uploadProps: UploadProps = {
        multiple: false, // 根据 multi 值决定是否允许多选
        showUploadList: false,
        fileList: [],
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('只能上传图片文件！');
                return false;
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('图片必须小于2MB！');
                return false;
            }
            // 允许选择，不上传
            return false;
        },
        onChange: (info) => {
            // 立即预览本地图片
            const fileList = info.fileList || [];
            const file = fileList[0];

            const thumbnailURL = URL.createObjectURL(file.originFileObj!);
            
            // 根据 multi 值决定是添加还是替换图片
            const newImages = maxCount > 1 
                ? [...imagesRef.current, { url: thumbnailURL, source: 'disk', thumbnail: thumbnailURL }]
                : [{ url: thumbnailURL, source: 'disk', thumbnail: thumbnailURL }];
                
            setUploadError('');
            runUploadPassOnce({
                getUploadFile: async () => {
                    const buffer = await file.originFileObj!.arrayBuffer();
                    return { type: 'buffer', tokenOrBuffer: Buffer.from(buffer), fileName: file.name };
                },
                onUploaded: async (url) => {
                    switchImageSource(thumbnailURL, url);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }).catch(error => {
                // Remove the failed image from the list
                setImages(prevImages => prevImages.filter(img => img.url !== thumbnailURL));
                setUploadError(error.message);
            }); 
            handleChange(newImages);
        },
    };
 
    const renderPreviewImages = () => {
        const displayImages = images.slice(0, displayMax);
        const hasMore = images.length > displayMax;

        return (
            <div
                className="image-preview-container"
            >
                {images.length === 0 ? (
                    // 无图片时的空状态
                    <div className="image-preview-empty">
                        <div className="empty-content">
                            <div style={{ marginTop: 8, color: 'var(--sdppp-host-text-color-secondary)' }}>
                                暂无图片
                            </div>
                        </div>
                    </div>
                ) : images.length === 1 ? (
                    <SingleImagePreview
                        image={images[0]}
                        previewVisible={previewVisible}
                        previewCurrent={previewCurrent}
                        onPreviewVisibleChange={setPreviewVisible}
                        onPreviewCurrentChange={setPreviewCurrent}
                        onPreviewChange={handlePreviewChange}
                    />
                ) : (
                    <MultipleImagesPreview
                        images={images}
                        displayImages={displayImages}
                        hasMore={hasMore}
                        displayMax={displayMax}
                        previewVisible={previewVisible}
                        previewCurrent={previewCurrent}
                        onPreviewVisibleChange={setPreviewVisible}
                        onPreviewCurrentChange={setPreviewCurrent}
                        onPreviewChange={handlePreviewChange}
                        onEllipsisClick={handleEllipsisClick}
                    />
                )}
            </div>
        );
    };

    const renderedImages = useMemo(() => {
        return renderPreviewImages();
    }, [images, previewVisible, previewCurrent]);

    return (
        <div
            className="image-select-container"
            style={{ width: '100%', ...uiWeightCSS }}
        >
            {renderedImages}
            <Row gutter={[8, 8]} className="button-group-row">
                <Col flex="1 1 0">
                    <Button
                        className="image-select-button"
                        style={{ 
                          width: "100%",
                          backgroundImage: 'url("/src/images/commonButton.png")',
                          backgroundSize: 'cover',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          color: 'var(--sdppp-host-text-color)', // 添加文字基础颜色
                        }}
                        onClick={async () => { 
                            const { thumbnail_url, file_token, source } = isMask ? await sdpppSDK.plugins.imaging.requestMaskGet() : await sdpppSDK.plugins.imaging.requestImageGet();
                            
                            // 根据 multi 值决定是添加还是替换图片
                            const newImages = maxCount > 1 
                                ? [...imagesRef.current, { url: thumbnail_url, source, thumbnail: thumbnail_url }]
                                : [{ url: thumbnail_url, source, thumbnail: thumbnail_url }];
                                
                            handleChange(newImages);
                            setUploadError('');
                            runUploadPassOnce({
                                getUploadFile: async () => {
                                    return { type: 'token', tokenOrBuffer: file_token, fileName: `${v4()}.png` }; 
                                },
                                onUploaded: async (url) => {
                                    switchImageSource(thumbnail_url, url);
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }

                            }).catch(error => {
                                // Remove the failed image from the list
                                setImages(prevImages => prevImages.filter(img => img.url !== thumbnail_url));
                                setUploadError(error.message);
                            });
                        }}
                    >从图层选择</Button>
                </Col>
                <Col flex="1 1 0">
                    <Upload style={{ width: '100%' }} {...uploadProps}>
                      <Button 
                        className="image-select-button"
                        style={{ 
                          width: "100%",
                          backgroundImage: 'url("/src/images/commonButton.png")',
                          backgroundSize: 'cover',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          color: 'var(--sdppp-host-text-color)', // 添加文字基础颜色
                        }}
                      >从磁盘选择</Button>
                    </Upload>
                </Col>
                {images.length > 0 && (
                    <Col flex="0 0 auto">
                        <Tooltip title="清空">
                            <Button
                                icon={<DeleteOutlined />}
                                onClick={handleClear}
                            />
                        </Tooltip>
                    </Col>
                )}
            </Row>
            {uploadError && (
                <Alert
                    message={uploadError}
                    type="error"
                    showIcon
                    closable
                />
            )}
        </div>
    );
};

/**
 * 单张图片预览组件
 */
interface SingleImagePreviewProps {
    image: ImageDetail;
    previewVisible: boolean;
    previewCurrent: number;
    onPreviewVisibleChange: (visible: boolean) => void;
    onPreviewCurrentChange: (current: number) => void;
    onPreviewChange: (current: number, prev: number) => void;
}

const SingleImagePreview: React.FC<SingleImagePreviewProps> = ({
    image,
    previewVisible,
    previewCurrent,
    onPreviewVisibleChange,
    onPreviewCurrentChange,
    onPreviewChange
}) => {
    return (
        <Image.PreviewGroup
            preview={{
                visible: previewVisible,
                onVisibleChange: (visible, prevVisible) => {
                    onPreviewVisibleChange(visible);
                },
                current: previewCurrent,
                onChange: onPreviewChange,
            }}
            items={[{
                src: image.thumbnail || image.url,
            }]}
        >
            <Row gutter={[8, 8]} className="image-preview-row single-image">
            <div
                        className="preview-image-wrapper single"
                        onClick={() => {
                            onPreviewCurrentChange(0);
                            onPreviewVisibleChange(true);
                        }}
                        style={{ cursor: 'pointer' }}
                    >
                        <Image
                            src={image.thumbnail || image.url}
                            alt="preview-0"
                            className="preview-image"
                            width="100%"
                            height="100%"
                            style={{ objectFit: 'contain' }}
                            preview={false}
                        />
                    </div>
            </Row>
        </Image.PreviewGroup>
    );
};

/**
 * 多张图片预览组件
 */
interface MultipleImagesPreviewProps {
    images: ImageDetail[];
    displayImages: ImageDetail[];
    hasMore: boolean;
    displayMax: number;
    previewVisible: boolean;
    previewCurrent: number;
    onPreviewVisibleChange: (visible: boolean) => void;
    onPreviewCurrentChange: (current: number) => void;
    onPreviewChange: (current: number, prev: number) => void;
    onEllipsisClick: () => void;
}

const MultipleImagesPreview: React.FC<MultipleImagesPreviewProps> = ({
    images,
    displayImages,
    hasMore,
    displayMax,
    previewVisible,
    previewCurrent,
    onPreviewVisibleChange,
    onPreviewCurrentChange,
    onPreviewChange,
    onEllipsisClick
}) => {
    return (
        <Image.PreviewGroup
            preview={{
                visible: previewVisible,
                onVisibleChange: (visible, prevVisible) => {
                    onPreviewVisibleChange(visible);
                },
                current: previewCurrent,
                onChange: onPreviewChange,
            }}
            items={images.map(image => ({
                src: image.thumbnail || image.url,
            }))}
        >
            <Row gutter={[8, 8]} className="image-preview-row">
                {displayImages.map((image, index) => (
                    <Col
                        key={index}
                        flex="1 1 0"
                        className="preview-image-col"
                    >
                        <div
                            className="preview-image-wrapper"
                            onClick={() => {
                                onPreviewCurrentChange(index);
                                onPreviewVisibleChange(true);
                            }}
                            style={{ cursor: 'pointer' }}
                        > 
                            <Image
                                src={image.thumbnail || image.url}
                                alt={`preview-${index}`}
                                className="preview-image"
                                width="100%"
                                height="100%"
                                style={{ objectFit: 'contain' }}
                                preview={false}
                            />
                        </div>
                    </Col>
                ))}
                {hasMore && (
                    <Col
                        flex="1 1 0"
                        className="preview-image-col"
                    >
                        <div
                            className="preview-image-wrapper ellipsis"
                            onClick={onEllipsisClick}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="ellipsis-content">
                                <EllipsisOutlined />
                                <div className="ellipsis-count">+{images.length - displayMax}</div>
                            </div>
                        </div>
                    </Col>
                )}
            </Row>
        </Image.PreviewGroup>
    );
};

export default ImageSelect;