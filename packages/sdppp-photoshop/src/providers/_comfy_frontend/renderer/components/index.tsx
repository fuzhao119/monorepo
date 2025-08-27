import { Component, useEffect, useState } from "react";
import WorkflowList from "./workflow-list";
import { WorkflowDetail } from "./workflow-detail";
import { useStore } from "zustand";
import { sdpppSDK } from "../../../../sdk/sdppp-ps-sdk";
import { Alert } from "antd";
import ErrorBoundary from "antd/es/alert/ErrorBoundary";

export function ComfyFrontendRendererContent() {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [currentWorkflow, setCurrentWorkflow] = useState<string>('');
    const widgetablePath = useStore(sdpppSDK.stores.ComfyStore, (state) => state.widgetableStructure.widgetablePath.replace(/^workflows\//, ''));
    const comfyWebviewURL = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.comfyURL);
    const sdpppX = useStore(sdpppSDK.stores.PhotoshopStore, (state) => state.sdpppX);
    useEffect(() => {
        if (widgetablePath === currentWorkflow && currentWorkflow) {
            setView('detail');
        } else {
            setView('list');
        }
    }, [currentWorkflow, widgetablePath]);
    
    useEffect(() => {
        if (comfyWebviewURL) {
            if (sdpppX && sdpppX.userCode && sdpppX.userCode !== '') {
                const url = `${comfyWebviewURL.replace(/\/$/, '')}/psToken?code=${sdpppX.userCode}`;
                console.log('psToken请求URL:', url);
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log('psToken请求成功:', data);

                    })
                    .catch(error => {
                        console.error('psToken请求失败:', error);
                    });
            } else {
                console.error('无法获取code参数，config.json中可能未定义userCode');
            }
        }
    }, [comfyWebviewURL]); 
    
    return (
        <SDPPPErrorBoundary>
            <WorkflowList hidden={view === 'detail'} currentWorkflow={currentWorkflow} setCurrentWorkflow={setCurrentWorkflow} />
            {view === "detail" && <WorkflowDetail currentWorkflow={currentWorkflow} setCurrentWorkflow={setCurrentWorkflow} />}
        </SDPPPErrorBoundary>
    );
}

class SDPPPErrorBoundary extends Component<any, any> {
    state = {
        error: undefined,
        info: { componentStack: '' }
    };
    componentDidCatch(error: Error | null, info: object): void {
        this.setState({ error, info });
    }
    render() {
        const error = this.state.error as Error | undefined;
        if (error) {
            return <Alert message={error.message} type="error" />
        }
        return this.props.children;
    }
}