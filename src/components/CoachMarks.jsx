import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * CoachMarks component creates an interactive tutorial tour for users.
 * It highlights specific DOM elements and displays descriptive tooltips.
 * It is designed to be mounted conditionally when the onboarding is active.
 */
export default function CoachMarks({ steps, startStep = 0, onComplete }) {
    const [currentStep, setCurrentStep] = useState(startStep);
    const [coords, setCoords] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const tooltipRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const step = steps[currentStep];

    const updatePosition = useCallback(() => {
        if (!step) return;
        const el = document.querySelector(step.target);
        if (!el) {
            // Fallback: center in viewport if target element is not found
            setCoords({
                top: window.innerHeight / 2 - 100 + window.scrollY,
                left: window.innerWidth / 2 - 160 + window.scrollX,
                width: 320,
                height: 200,
                isFallback: true
            });
            return;
        }

        // Scroll the element into view smoothly before calculation
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Wait a brief moment for the scroll to finish to get accurate coordinates
        setTimeout(() => {
            const finalRect = el.getBoundingClientRect();
            const tooltipWidth = 320;
            const gap = 12;

            // Add highlight class
            el.classList.add('coachmark-highlight');

            const pos = step.position || 'bottom';
            let newTop;
            let newLeft;

            if (pos === 'bottom') {
                newTop = finalRect.bottom + gap + window.scrollY;
                newLeft = finalRect.left + (finalRect.width / 2) - (tooltipWidth / 2) + window.scrollX;
            } else if (pos === 'top') {
                newTop = finalRect.top - gap - 160 + window.scrollY; // Estimate height roughly
                newLeft = finalRect.left + (finalRect.width / 2) - (tooltipWidth / 2) + window.scrollX;
            } else if (pos === 'right') {
                newTop = finalRect.top + window.scrollY;
                newLeft = finalRect.right + gap + window.scrollX;
            } else { // left
                newTop = finalRect.top + window.scrollY;
                newLeft = finalRect.left - gap - tooltipWidth + window.scrollX;
            }

            // Prevent spilling out of screen viewport horizontally
            if (newLeft < 10) newLeft = 10;
            if (newLeft + tooltipWidth > window.innerWidth - 10) {
                newLeft = window.innerWidth - tooltipWidth - 10;
            }

            setCoords({
                top: newTop,
                left: newLeft,
                targetRect: {
                    top: finalRect.top + window.scrollY,
                    left: finalRect.left + window.scrollX,
                    width: finalRect.width,
                    height: finalRect.height
                },
                isFallback: false
            });
        }, 300);
    }, [step]);

    useEffect(() => {
        // Remove highlight from the previous step target
        const prevStep = steps[currentStep - 1];
        if (prevStep) {
            const prevEl = document.querySelector(prevStep.target);
            if (prevEl) prevEl.classList.remove('coachmark-highlight');
        }

        const nextStep = steps[currentStep + 1];
        if (nextStep) {
            const nextEl = document.querySelector(nextStep.target);
            if (nextEl) nextEl.classList.remove('coachmark-highlight');
        }
        
        // Use a timeout to prevent synchronous state updates inside useEffect
        const timer = setTimeout(() => {
            updatePosition();
        }, 50);

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
            // Clean up highlights
            steps.forEach(s => {
                const el = document.querySelector(s.target);
                if (el) el.classList.remove('coachmark-highlight');
            });
        };
    }, [currentStep, steps, updatePosition]);

    if (!step || !coords) return null;

    const handleNext = () => {
        // Clear current highlight before moving
        const currentEl = document.querySelector(step.target);
        if (currentEl) currentEl.classList.remove('coachmark-highlight');

        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        // Clear current highlight before moving
        const currentEl = document.querySelector(step.target);
        if (currentEl) currentEl.classList.remove('coachmark-highlight');

        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleClose = () => {
        steps.forEach(s => {
            const el = document.querySelector(s.target);
            if (el) el.classList.remove('coachmark-highlight');
        });
        onComplete();
    };

    return (
        <>
            {/* Spotlight Overlay using SVG clip-path hole */}
            {!coords.isFallback && coords.targetRect && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: document.documentElement.scrollHeight,
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    zIndex: 9998,
                    pointerEvents: 'none',
                    transition: 'all 0.3s ease',
                    clipPath: `polygon(
                        0% 0%, 
                        0% 100%, 
                        ${coords.targetRect.left}px 100%, 
                        ${coords.targetRect.left}px ${coords.targetRect.top}px, 
                        ${coords.targetRect.left + coords.targetRect.width}px ${coords.targetRect.top}px, 
                        ${coords.targetRect.left + coords.targetRect.width}px ${coords.targetRect.top + coords.targetRect.height}px, 
                        ${coords.targetRect.left}px ${coords.targetRect.top + coords.targetRect.height}px, 
                        ${coords.targetRect.left}px 100%, 
                        100% 100%, 
                        100% 0%
                    )`
                }} />
            )}

            {/* Fallback transparent background click handler */}
            {coords.isFallback && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 9998
                }} onClick={handleClose} />
            )}

            {/* Tooltip dialog bubble */}
            <div 
                ref={tooltipRef}
                style={isMobile ? {
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 32px)',
                    maxWidth: 340,
                    background: '#13131f',
                    border: '1px solid #00d4ff',
                    borderRadius: 12,
                    padding: '1.25rem',
                    boxShadow: '0 -8px 32px rgba(0, 212, 255, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                    color: '#ddddf5',
                    fontFamily: "'DM Sans', sans-serif"
                } : {
                    position: 'absolute',
                    top: coords.top,
                    left: coords.left,
                    width: 320,
                    background: '#13131f',
                    border: '1px solid #00d4ff',
                    borderRadius: 8,
                    padding: '1.25rem',
                    boxShadow: '0 8px 32px rgba(0, 212, 255, 0.25)',
                    zIndex: 9999,
                    color: '#ddddf5',
                    fontFamily: "'DM Sans', sans-serif"
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22d78f', fontWeight: 700 }}>
                        Tutorial · Passo {currentStep + 1} de {steps.length}
                    </span>
                    <button 
                        onClick={handleClose} 
                        style={{ background: 'transparent', border: 'none', color: '#8888a8', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', lineHeight: 1 }}
                        title="Pular tutorial"
                    >
                        &times;
                    </button>
                </div>
                
                <h3 style={{ fontSize: '1.05rem', color: '#eeeef8', marginBottom: 8, fontWeight: 600 }}>{step.title}</h3>
                <p style={{ fontSize: '0.8rem', color: '#8888a8', lineHeight: 1.5, marginBottom: 16 }}>{step.content}</p>
                
                {/* Dots and Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {steps.map((_, idx) => (
                            <span 
                                key={idx} 
                                style={{ 
                                    width: 6, 
                                    height: 6, 
                                    borderRadius: '50%', 
                                    backgroundColor: idx === currentStep ? '#00d4ff' : '#22223c',
                                    transition: 'background-color 0.2s'
                                }} 
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        {currentStep > 0 && (
                            <button 
                                onClick={handlePrev}
                                style={{ 
                                    background: 'transparent', 
                                    color: '#8888a8', 
                                    border: '1px solid #1e1e32', 
                                    borderRadius: 4, 
                                    padding: '4px 10px', 
                                    fontSize: '0.75rem', 
                                    cursor: 'pointer' 
                                }}
                            >
                                Anterior
                            </button>
                        )}
                        <button 
                            onClick={handleNext}
                            style={{ 
                                background: '#22d78f', 
                                color: '#0b0b11', 
                                border: 'none', 
                                borderRadius: 4, 
                                padding: '4px 14px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                cursor: 'pointer' 
                            }}
                        >
                            {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Global style injection for spotlight border pulse */}
            <style dangerouslySetInnerHTML={{__html: `
                .coachmark-highlight {
                    box-shadow: 0 0 0 4px rgba(0, 212, 255, 0.4), 0 0 20px rgba(0, 212, 255, 0.3) !important;
                    border-color: #00d4ff !important;
                    transition: all 0.3s ease !important;
                    position: relative;
                    z-index: 9999 !important;
                    background: #13131f !important;
                }
            `}} />
        </>
    );
}
