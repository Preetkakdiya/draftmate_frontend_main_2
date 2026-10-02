import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './AestheticHero.css';

const AestheticHero = ({ badgeIcon, badgeText, title, highlightedTitle, subtitle, inlineTitle = false }) => {
    const [displayText, setDisplayText] = useState('');
    
    // Typewriter effect for the subtitle
    useEffect(() => {
        if (!subtitle) return;
        let i = 0;
        setDisplayText('');
        
        // Add a small delay before typing starts for effect
        const startTimeout = setTimeout(() => {
            const timer = setInterval(() => {
                if (i < subtitle.length) {
                    const currentString = subtitle.substring(0, i + 1);
                    setDisplayText(currentString);
                    i++;
                } else {
                    clearInterval(timer);
                }
            }, 50); // Slower typing speed
            return () => clearInterval(timer);
        }, 500);

        return () => clearTimeout(startTimeout);
    }, [subtitle]);

    return (
        <div className="aesthetic-hero-container">
            {badgeText && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="aesthetic-hero-badge bg-primary/10 border border-primary/20"
                >
                    <img src="/logo.png" alt="DraftMate Logo" className="h-4 w-auto object-contain" />
                    <span className="badge-text text-primary">{badgeText}</span>
                </motion.div>
            )}
            
            <h1 className={`aesthetic-hero-title text-slate-900 dark:text-white ${inlineTitle ? 'flex-row flex-wrap gap-2' : 'flex-col gap-[0.15rem]'}`}>
                <motion.span
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.25 }}
                >
                    {title}
                </motion.span>
                <motion.span 
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.38 }}
                    className="aesthetic-hero-highlight"
                >
                    {highlightedTitle}
                </motion.span>
            </h1>
            
            {subtitle && (
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                    className="aesthetic-hero-subtitle text-slate-500 dark:text-slate-400"
                >
                    <span className="text-[#4f46e5] dark:text-indigo-400 font-semibold">{displayText}</span>
                    <span className="aesthetic-hero-cursor text-[#4f46e5] dark:text-indigo-400">|</span>
                </motion.p>
            )}
        </div>
    );
};

export default AestheticHero;
