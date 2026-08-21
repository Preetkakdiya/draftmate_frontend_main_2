const loadScript = (src) => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;
let BASE_URL = envBaseUrl !== undefined ? envBaseUrl : '';
if (BASE_URL.endsWith('/')) {
    BASE_URL = BASE_URL.slice(0, -1);
}
const API_URL = `${BASE_URL}/subscriptions`;

export const createOrder = async (planId, sessionId) => {
    try {
        const response = await fetch(`${API_URL}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, plan_id: planId })
        });

        if (!response.ok) throw new Error('Failed to create order');
        return await response.json();
    } catch (error) {
        console.error("Create Order Error:", error);
        throw error;
    }
};

export const verifyPayment = async (verificationData) => {
    try {
        const response = await fetch(`${API_URL}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verificationData)
        });
        return await response.json();
    } catch (error) {
        console.error("Verify Payment Error:", error);
        throw error;
    }
};

export const getSubscriptionStatus = async (sessionId) => {
    try {
        const response = await fetch(`${API_URL}/current-status?session_id=${sessionId}`);
        return await response.json();
    } catch (error) {
        console.error("Get Status Error:", error);
        throw error;
    }
};

export const getBillingHistory = async (sessionId) => {
    try {
        const response = await fetch(`${API_URL}/history?session_id=${sessionId}`);
        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error("Get Billing History Error:", error);
        return [];
    }
};


export const doPayment = async (orderData, onSuccess, onError) => {
    const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

    if (!res) {
        throw new Error('Razorpay SDK failed to load. Are you online?');
    }

    const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "DraftMate",
        description: "Subscription Payment",
        order_id: orderData.order_id,
        handler: async function (response) {
            try {
                const verifyResult = await verifyPayment({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                });
                
                if (verifyResult.status === 'SUCCESS') {
                    if (onSuccess) onSuccess(verifyResult);
                } else {
                    if (onError) onError(new Error("Verification failed"));
                }
            } catch (err) {
                if (onError) onError(err);
            }
        },
        theme: {
            color: "#3b82f6" // matches primary color
        },
        modal: {
            ondismiss: function() {
                if (onError) onError(new Error("Payment cancelled by user"));
            }
        }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on('payment.failed', function (response) {
        if (onError) onError(response.error);
    });
    paymentObject.open();
};
