import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FeatureBriefing.css';

const FeatureBriefing = ({ suiteName, features, onActionClick }) => {
    const [activeFeatureId, setActiveFeatureId] = useState(features[0]?.id);
    
    if (!features || features.length === 0) return null;
    
    const activeFeature = features.find(f => f.id === activeFeatureId);

    return (
        <div className="feature-briefing-container">
            <h2 className="feature-briefing-title text-slate-900 dark:text-white">
                Inside the <span className="feature-briefing-highlight text-primary border-b-2 border-primary">{suiteName}</span> Suite
            </h2>
            
            <div className="feature-briefing-layout">
                {/* Left Side: Tabs */}
                <div className="feature-briefing-tabs">
                    {features.map((feature) => {
                        const isActive = feature.id === activeFeatureId;
                        return (
                            <button 
                                key={feature.id}
                                className={`feature-briefing-tab ${isActive ? 'active bg-white dark:bg-slate-800 border-primary/30 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'} border transition-all`}
                                onClick={() => setActiveFeatureId(feature.id)}
                            >
                                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                                    {feature.icon}
                                </span>
                                <span className={`tab-text ${isActive ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-600 dark:text-slate-400 font-medium'}`}>
                                    {feature.shortTitle || feature.title}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                {/* Right Side: Active Card */}
                <div className="feature-briefing-content">
                    <AnimatePresence mode="wait">
                        <motion.div 
                            key={activeFeature.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="feature-briefing-card bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700"
                        >
                            <div 
                                className="feature-card-icon-box"
                                style={{ 
                                    backgroundColor: activeFeature.highlightColor ? `${activeFeature.highlightColor}15` : 'rgba(99,102,241,0.1)',
                                    color: activeFeature.highlightColor || '#6366f1'
                                }}
                            >
                                <span className="material-symbols-outlined text-2xl">{activeFeature.icon}</span>
                            </div>
                            
                            <h3 className="feature-card-title text-slate-900 dark:text-white">
                                {activeFeature.title}
                            </h3>
                            
                            <p className="feature-card-description text-slate-600 dark:text-slate-400">
                                {activeFeature.description}
                            </p>
                            
                            {onActionClick && (
                                <button 
                                    onClick={() => onActionClick(activeFeature.id)}
                                    className="feature-card-action text-primary hover:text-primary/80"
                                >
                                    Open Feature <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
                                </button>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default FeatureBriefing;
