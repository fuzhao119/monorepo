import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createStore } from 'zustand';
import { debug } from 'debug';

const log = debug('widgetable:context');

const uploadImageInputSchama = z.object({
    type: z.literal('buffer').or(z.literal('token')),
    tokenOrBuffer: z.any(),
    fileName: z.string()
});
export type UploadPassInput = z.infer<typeof uploadImageInputSchama>

// 定义hook函数的类型
export type UploadPass = {
    getUploadFile: () => Promise<UploadPassInput>,
    onUploaded?: (fileURL: string) => Promise<void>,
    onUploadError?: (error: any) => void,
};

// 定义Context的类型
interface WidgetableContextType {
    runUploadPassOnce: (pass: UploadPass) => Promise<string>;
    addUploadPass: (pass: UploadPass) => string;
    removeUploadPass: (pass: UploadPass) => void;

    waitAllUploadPasses: () => Promise<void>;
}

// 创建Context
const WidgetableContext = createContext<WidgetableContextType | undefined>(undefined);

// Provider组件的Props类型
interface WidgetableProviderProps {
    children: ReactNode;
    uploader: (uploadInput: UploadPassInput) => Promise<string>;
}

const uploadPassesStore = createStore<{
    uploadPasses: UploadPass[],
    runningUploadPasses: {
        [id: string]: Promise<string>
    }
}>((set) => ({
    uploadPasses: [],
    runningUploadPasses: {},
}))

// Provider组件
export function WidgetableProvider({ children, uploader }: WidgetableProviderProps) {
    const value: WidgetableContextType = {
        runUploadPassOnce: async (pass: UploadPass) => {
            if (!uploader) {
                throw new Error('Uploader not set, please call setUploader first');
            }
            const promise = new Promise<string>(async (resolve, reject) => {
                const uploadInput = await pass.getUploadFile();
                try {
                    const fileURL = await uploader(uploadInput);
                    if (pass.onUploaded) {
                        await pass.onUploaded(fileURL);
                    }
                    resolve(fileURL);
                } catch (error) {
                    pass.onUploadError?.(error);
                    return '';
                } finally {
                    uploadPassesStore.setState((state) => {
                        delete state.runningUploadPasses[runID];
                        return state;
                    });
                }
            })
            const runID = uuidv4();
            uploadPassesStore.setState((state) => {
                state.runningUploadPasses[runID] = promise;
                return state;
            });

            return await promise;
        },
        addUploadPass: (pass: UploadPass) => {
            const passId = uuidv4();
            uploadPassesStore.setState((state) => {
                state.uploadPasses.push(pass);
                return state;
            });
            return passId;
        },
        removeUploadPass: (pass: UploadPass) => {
            uploadPassesStore.setState((state) => {
                state.uploadPasses = state.uploadPasses.filter(p => p !== pass);
                return state;
            });
        },
        waitAllUploadPasses: async () => {
            if (!uploader) {
                throw new Error('Uploader not set, please call setUploader first');
            }
            const promisesFromUploadPasses = uploadPassesStore.getState().uploadPasses.map(async pass => {
                try {
                    const uploadInput = await pass.getUploadFile();
                    const fileURL = await uploader(uploadInput);
                    if (pass.onUploaded) {
                        await pass.onUploaded(fileURL);
                    }
                    return fileURL;
                } catch (error) {
                    pass.onUploadError?.(error);
                    throw error
                }
            });
            const promisesFromRunningUploadPasses = Object.values(uploadPassesStore.getState().runningUploadPasses);
            await Promise.all([...promisesFromUploadPasses, ...promisesFromRunningUploadPasses]);
        },
    };

    return (
        <WidgetableContext.Provider value={value}>
            {children}
        </WidgetableContext.Provider>
    );
}

// 自定义Hook：使用Context
export function useWidgetable() {
    const context = useContext(WidgetableContext);
    if (context === undefined) {
        throw new Error('useWidgetable must be used within a WidgetableProvider');
    }
    return context;
}
