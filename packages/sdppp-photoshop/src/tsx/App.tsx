import { useStore } from 'zustand'
import './App.less'
import { sdpppSDK } from '../sdk/sdppp-ps-sdk'
import { Button, ConfigProvider, Flex, Select, theme } from 'antd'
import { Providers } from '../providers'
import { MainStore } from './App.store'
import ImagePreview from './components/ImagePreview'
import { SDPPPGateway } from './gateway/sdppp'

export default function App() {
    const psTheme = useStore(sdpppSDK.stores.PhotoshopStore, state => state.theme)
    const showingPreview = MainStore(state => state.showingPreview)
    const previewImageList = MainStore(state => state.previewImageList)

    const fontSize = 12

    return <div id="app" className={themeClassName(psTheme)}>
        <ConfigProvider
            getPopupContainer={trigger => trigger?.parentElement || document.body}
            theme={{
                token: {
                    colorPrimary: '#34773d',
                    colorLink: 'var(--sdppp-host-text-color)',
                    colorLinkHover: 'var(--sdppp-widget-hover-text-color)',
                    colorLinkActive: 'var(--sdppp-host-text-color)',
                },
                algorithm: [psTheme === 'kPanelBrightnessDarkGray' || psTheme === 'kPanelBrightnessMediumGray' || psTheme === 'kPanelBrightnessLightGray' ? theme.darkAlgorithm : theme.defaultAlgorithm, theme.compactAlgorithm],
                components: {
                    Typography: {
                        colorText: 'var(--sdppp-host-text-color)',
                        // 控制 Typography 内所有链接的颜色
                        colorLink: 'var(--sdppp-host-text-color)',
                        colorLinkHover: 'var(--sdppp-widget-hover-text-color)',
                        colorLinkActive: 'var(--sdppp-host-text-color)',
                    },
                    Input: {
                        fontSize: fontSize,
                        colorBgContainer: 'transparent', // 设置为透明，以便显示自定义背景
                        colorText: 'var(--sdppp-host-text-color)',
                        colorBorder: 'transparent', // 边框透明，我们使用自定义边框
                        colorTextPlaceholder: 'var(--sdppp-host-text-color-secondary)'
                    },
                    Select: {
                        fontSize: fontSize,
                        colorBgContainer: 'transparent', // 设置为透明以显示渐变边框
                        colorText: 'var(--sdppp-host-text-color)',
                        colorBorder: 'transparent', // 边框透明化
                        colorBgElevated: 'var(--sdppp-widget-background-color)',
                        colorTextDescription: 'var(--sdppp-host-text-color)',
                        controlItemBgActive: 'var(--sdppp-widget-border-color)',
                        controlItemBgHover: 'var(--sdppp-widget-hover-background-color)',
                        optionSelectedBg: 'var(--sdppp-widget-border-color)',
                        optionActiveBg: 'var(--sdppp-widget-hover-background-color)',
                        colorTextPlaceholder: 'var(--sdppp-host-text-color-secondary)',
                    },
                    Checkbox: {
                        fontSize: fontSize,
                        colorText: 'var(--sdppp-host-text-color)',
                    },
                    Radio: {
                        fontSize: fontSize,
                    },
                    Slider: {
                        fontSize: fontSize,
                    },
                    Switch: {
                        fontSize: fontSize,
                        colorBgContainer: 'var(--sdppp-widget-background-color)',
                        colorText: 'var(--sdppp-host-text-color)'
                    },
                    InputNumber: {
                        fontSize: fontSize,
                        colorBgContainer: 'var(--sdppp-widget-background-color)',
                        colorText: 'var(--sdppp-host-text-color)',
                        colorBorder: 'var(--sdppp-widget-border-color)'
                    },
                    Upload: {
                        fontSize: fontSize,
                        colorBgContainer: 'var(--sdppp-widget-background-color)',
                        colorText: 'var(--sdppp-host-text-color)',
                        colorBorder: 'var(--sdppp-widget-border-color)'
                    },
                    Button: {
                        fontSize: fontSize,
                        colorBgContainer: 'var(--sdppp-widget-background-color)',
                        colorText: 'var(--sdppp-host-text-color)',
                        colorBorder: 'var(--sdppp-widget-border-color)'
                    },
                }
            }}>
            {!showingPreview && previewImageList.length ? <Flex gap={8} justify="center" align="center" style={{ marginBottom: 16 }}>
                <Button size="small" type="primary" onClick={() => MainStore.setState({ showingPreview: true })}>
                    显示预览框 ({previewImageList.length}张图片)
                </Button>
            </Flex> : null}
            {
                showingPreview ? <ImagePreview /> : null
            }
            <SDPPPGateway />
        </ConfigProvider>
    </div>
}

function themeClassName(theme: string) {
    if (theme == "kPanelBrightnessLightGray") {
        return "__ps_light__"
    }
    if (theme == "kPanelBrightnessMediumGray") {
        return "__ps_dark__"
    }
    if (theme == "kPanelBrightnessDarkGray") {
        return "__ps_darkest__"
    }
    return "__ps_lightest__"
}