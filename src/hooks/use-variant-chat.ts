import { useCallback } from "react";

/**
 * Custom hook for interacting with the FAVOR-GPT chatbot
 * Provides a clean interface for opening the chat from any component
 */
export function useVariantChat() {
    const openChat = useCallback(() => {
        const chatTrigger = document.getElementById("chatbot-trigger-button");
        if (chatTrigger) {
            chatTrigger.click();
        } else {
            console.warn(
                "Chat trigger button not found. Make sure the chatbot is initialized."
            );
        }
    }, []);

    return { openChat };
}
