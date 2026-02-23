'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function AnimatedBackground() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Base dark */}
            <div className="absolute inset-0 bg-[#0a0a0f]" />

            {/* Subtle grid overlay — fades at bottom */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            {/* Primary aurora — top-right violet */}
            <motion.div
                animate={{
                    x: [0, 80, -40, 0],
                    y: [0, -60, 30, 0],
                    scale: [1, 1.2, 0.9, 1],
                    opacity: [0.25, 0.45, 0.3, 0.25],
                }}
                transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-[200px] -right-[200px] w-[900px] h-[900px] rounded-full bg-violet-600/20 blur-[150px]"
            />

            {/* Secondary aurora — bottom-left indigo */}
            <motion.div
                animate={{
                    x: [0, -60, 40, 0],
                    y: [0, 60, -30, 0],
                    scale: [1, 1.3, 1.05, 1],
                    opacity: [0.2, 0.35, 0.2, 0.2],
                }}
                transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-[200px] -left-[200px] w-[800px] h-[800px] rounded-full bg-indigo-600/20 blur-[140px]"
            />

            {/* Accent orb — center fuchsia drift */}
            <motion.div
                animate={{
                    x: [0, 100, -80, 0],
                    y: [0, -80, 60, 0],
                    scale: [1, 1.15, 1, 1],
                    opacity: [0.12, 0.25, 0.12, 0.12],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[20%] left-[30%] w-[600px] h-[600px] rounded-full bg-fuchsia-500/15 blur-[130px]"
            />

            {/* Accent orb — small blue top-center */}
            <motion.div
                animate={{
                    y: [0, -40, 20, 0],
                    opacity: [0.1, 0.2, 0.1, 0.1],
                }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-[10%] left-[55%] w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px]"
            />

            {/* Noise texture overlay for grit */}
            <div className="absolute inset-0 opacity-[0.015] [background-image:url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')]" />
        </div>
    );
}
