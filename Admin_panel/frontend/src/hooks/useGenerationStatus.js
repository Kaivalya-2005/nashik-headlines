import { useState, useEffect, useRef } from 'react';
import articleService from '../services/articleService';

const useGenerationStatus = (articleId) => {
    const [status, setStatus] = useState(null); // PENDING, PROCESSING, COMPLETED, FAILED
    const [error, setError] = useState(null);
    const [isPolling, setIsPolling] = useState(false);

    // Use a ref to track if we should stop polling to avoid race conditions in cleanup
    const stopPollingRef = useRef(false);

    useEffect(() => {
        let intervalId;

        const checkStatus = async () => {
            if (stopPollingRef.current) return;

            try {
                const data = await articleService.getGenerationStatus(articleId);
                const newStatus = data.generationStatus;

                setStatus(newStatus);
                setError(data.generationError);

                if (newStatus === 'COMPLETED' || newStatus === 'FAILED') {
                    setIsPolling(false);
                    stopPollingRef.current = true;
                    clearInterval(intervalId);
                }
            } catch (err) {
                console.error("Polling Error:", err);
                // Don't stop polling on transient network errors, but maybe limit retries?
                // For now, keep trying.
            }
        };

        if (articleId && isPolling && !stopPollingRef.current) {
            // Check immediately first
            checkStatus();
            // Then poll
            intervalId = setInterval(checkStatus, 5000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [articleId, isPolling]);

    const startPolling = () => {
        stopPollingRef.current = false;
        setIsPolling(true);
    };

    return { status, error, isPolling, startPolling, setStatus };
};

export default useGenerationStatus;
