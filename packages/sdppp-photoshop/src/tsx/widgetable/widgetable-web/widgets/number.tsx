import { useCallback, useState, useEffect } from 'react';
import { Flex, InputNumber, Slider, Typography } from 'antd';
import { useUIWeightCSS } from '../../utils';
import { BaseWidgetProps } from './_base';
import './number.less';
interface NumberWidgetProps extends BaseWidgetProps {
    inputMin: number;
    inputMax: number;
    inputStep: number;
    value?: number;
    name?: string;
    onValueChange: (value: number) => void;
    useSlider: boolean;
    extraOptions?: Record<string, any>;
}

export const NumberWidget: React.FC<NumberWidgetProps> = ({
    inputMin,
    inputMax,
    inputStep,
    name,
    value = 0,
    uiWeight = 1,
    extraOptions,
    onValueChange,
    useSlider = false
}) => {
    const uiWeightCSS = useUIWeightCSS(uiWeight || 12);
    const [localValue, setLocalValue] = useState<number>(+value.toFixed(3));

    // Update local state when props value changes
    useEffect(() => {
        setLocalValue(+value.toFixed(3));
    }, [value]);

    useEffect(() => {
    }, []);

    const handleValueChange = useCallback((newValue: number | null) => {
        if (newValue !== null) {
            // 保留3位小数
            const roundedValue = +newValue.toFixed(3);
            setLocalValue(roundedValue);
        }
    }, []);

    const handleBlur = useCallback(() => {
        // Only call onValueChange when input loses focus
        onValueChange(localValue);
    }, [localValue, onValueChange]);

    // 检查步长范围是否过大
    if (uiWeight >= 1 && useSlider) {
        return ( 
            <Flex
                style={{ width: '100%', ...uiWeightCSS }}
                align='center'
            >
                <Typography.Text
                    style={{ width: 30 }}
                    >{localValue}</Typography.Text>
                <Slider
                    className="custom-gradient-slider" // 添加自定义class
                    style={{ flex: 1 }}
                    styles={{ 
                        track: { background: 'linear-gradient(to right, #AB77F8, #5D5BE3)' }
                    }}
                    min={inputMin}
                    max={inputMax}
                    step={inputStep}
                    value={localValue}
                    onChange={handleValueChange}
                    onChangeComplete={handleBlur}
                />
                {/* <InputNumber
                    style={{ width: 80 }}
                    value={localValue}
                    onChange={handleValueChange}
                    onBlur={handleBlur}
                    controls={false}
                /> */}
            </Flex>
        );
    }

    return (
        <Flex
            style={{ width: '100%', ...uiWeightCSS }}
            align='center'
        >
            {name && <span style={{ flex: 1, fontSize: 12 }}>{name}</span>}
            <InputNumber
                style={{ width: '100%', flex: 2 }}
                value={localValue}
                onChange={handleValueChange}
                onBlur={handleBlur}
                controls={false}
            />
        </Flex>
    );
};
