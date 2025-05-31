import React, { useEffect, useRef, useState } from "react";
import Draggable from 'react-draggable';
import { SWATCHES } from "../../constants.ts";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "../../components/ui/button";
import axios from "axios";
import { IconRefresh, IconPlayerPlay } from '@tabler/icons-react';

interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [reset, setReset] = useState(false);
    const [dictOfVars, setDictOfVars] = useState({});
    const [result, setResult] = useState<GeneratedResult>();
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [latexRefs, setLatexRefs] = useState<Array<React.RefObject<HTMLDivElement>>>([]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setLatexRefs([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
            }
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
        setLatexExpression(prev => [...prev, latex]);
        // Add new ref
        setLatexRefs(prev => [...prev, React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>]);

        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const runRoute = async () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/calculate`, {
                image: canvas.toDataURL('image/png'),
                dict_of_vars: dictOfVars
            });

            const resp = await response.data;
            console.log('Response', resp);

            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    setDictOfVars(prev => ({
                        ...prev,
                        [data.expr]: data.result
                    }));
                }
            });

            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            setLatexPosition({ x: centerX, y: centerY });

            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
            {/* Toolbar */}
            <div className="fixed top-4 left-1/2 z-30 -translate-x-1/2 bg-black/70 rounded-xl shadow-lg px-6 py-3 flex items-center gap-6 backdrop-blur-md border border-gray-700">
                <Button
                    onClick={() => setReset(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full px-5 py-2 shadow transition flex items-center gap-2"
                    style={{ boxShadow: '0 2px 8px 0 rgba(220,38,38,0.15)' }}
                >
                    <IconRefresh size={18} />
                    Reset
                </Button>
                <Group className="flex gap-2">
                    {SWATCHES.map((swatch) => (
                        <ColorSwatch
                            key={swatch}
                            color={swatch}
                            onClick={() => setColor(swatch)}
                            style={{
                                border: color === swatch ? '2px solid #fff' : '2px solid transparent',
                                cursor: 'pointer',
                                transition: 'border 0.2s',
                            }}
                            title={swatch}
                        />
                    ))}
                </Group>
                <Button
                    onClick={runRoute}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full px-5 py-2 shadow transition flex items-center gap-2"
                    style={{ boxShadow: '0 2px 8px 0 rgba(37,99,235,0.15)' }}
                >
                    <IconPlayerPlay size={18} />
                    Run
                </Button>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                id="canvas"
                className="absolute inset-0 w-full h-full z-10 cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />

            {/* Draggable LaTeX */}
            {latexExpression.map((latex, index) => {
                const nodeRef = latexRefs[index];
                return (
                    <Draggable
                        key={index}
                        nodeRef={nodeRef}
                        defaultPosition={latexPosition}
                        onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
                    >
                        <div
                            ref={nodeRef}
                            className="absolute p-2 rounded-lg shadow-2xl bg-black/80 bg-opacity-80 text-white border border-gray-700"
                            style={{
                                minWidth: 120,
                                minHeight: 40,
                                cursor: "move",
                                zIndex: 20,
                                userSelect: "none",
                            }}
                        >
                            <div className="latex-content text-lg">{latex}</div>
                        </div>
                    </Draggable>
                );
            })}
        </div>
    );
}